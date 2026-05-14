import "dotenv/config";
import { randomUUID } from "node:crypto";
import type { Request, Response } from "express";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { QobuzClient, QobuzApiError } from "./qobuz/client.js";

type TransportMode = "stdio" | "http";

interface HttpConfig {
  host: string;
  port: number;
  allowedHosts?: string[];
}

interface HttpSession {
  server: McpServer;
  transport: StreamableHTTPServerTransport;
}

// --- Env var validation (fail fast if any credential is missing) ---
function requireEnv(key: string): string {
  const val = process.env[key];
  if (val === undefined) throw new Error(`Missing required environment variable: ${key}`);
  return val;
}

function getOptionalEnv(key: string): string | undefined {
  const val = process.env[key];
  return val && val.trim() !== "" ? val : undefined;
}

function getTransportMode(): TransportMode {
  const mode = getOptionalEnv("QOBUZ_MCP_TRANSPORT") ?? "stdio";

  if (mode !== "stdio" && mode !== "http") {
    throw new Error(`Unsupported QOBUZ_MCP_TRANSPORT: ${mode}`);
  }

  return mode;
}

function getHttpConfig(): HttpConfig {
  const host = getOptionalEnv("QOBUZ_MCP_HTTP_HOST") ?? "127.0.0.1";
  const rawPort = getOptionalEnv("QOBUZ_MCP_HTTP_PORT") ?? "3000";
  const port = Number(rawPort);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid QOBUZ_MCP_HTTP_PORT: ${rawPort}`);
  }

  const allowedHosts = getOptionalEnv("QOBUZ_MCP_ALLOWED_HOSTS")
    ?.split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return {
    host,
    port,
    allowedHosts: allowedHosts && allowedHosts.length > 0 ? allowedHosts : undefined,
  };
}

const client = new QobuzClient(
  requireEnv("QOBUZ_APP_ID"),
  requireEnv("QOBUZ_APP_SECRET"),
  requireEnv("QOBUZ_USERNAME"),
  requireEnv("QOBUZ_PASSWORD"),
);

function formatToolError(err: unknown, fallback: string): string {
  return err instanceof QobuzApiError
    ? `Qobuz API error (${err.statusCode}): ${err.message}`
    : `${fallback}: ${String(err)}`;
}

function createServer(): McpServer {
  const server = new McpServer({
    name: "qobuz-mcp",
    version: "0.1.0",
  });

  server.tool(
    "search_qobuz",
    "Search the Qobuz catalog for tracks, albums, or artists",
    {
      query: z.string().describe("Natural language search query"),
      limit: z.number().int().min(1).max(20).optional().default(5)
        .describe("Max results per category (tracks, albums, artists). Defaults to 5."),
    },
    async ({ query, limit }) => {
      try {
        const results = await client.search(query, limit);
        const lines: string[] = [];

        if (results.tracks.length > 0) {
          lines.push("**Tracks:**");
          results.tracks.forEach((track, index) =>
            lines.push(`  ${index + 1}. "${track.title}" by ${track.artist} (${track.durationSeconds}s, ID: ${track.id})`)
          );
        }

        if (results.albums.length > 0) {
          lines.push("**Albums:**");
          results.albums.forEach((album, index) =>
            lines.push(`  ${index + 1}. "${album.title}" by ${album.artist} (ID: ${album.id})`)
          );
        }

        if (results.artists.length > 0) {
          lines.push("**Artists:**");
          results.artists.forEach((artist, index) =>
            lines.push(`  ${index + 1}. ${artist.name} (ID: ${artist.id})`)
          );
        }

        if (lines.length === 0) {
          lines.push("No results found.");
        }

        return { content: [{ type: "text", text: lines.join("\n") }] };
      } catch (err) {
        return {
          content: [{ type: "text", text: formatToolError(err, "Unexpected error during search") }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "open_qobuz_item",
    "Return a Qobuz URI or web player link for a catalog item",
    {
      item_id: z.string().describe("Qobuz item ID"),
      item_type: z.enum(["track", "album", "artist", "playlist"]).describe("Type of catalog item"),
    },
    async ({ item_id, item_type }) => {
      try {
        const item = await client.getItem(item_id, item_type);
        const lines: string[] = [`Resolved Qobuz ${item.type}:`];

        switch (item.type) {
          case "track":
            lines.push(`Title: ${item.title}`);
            lines.push(`Artist: ${item.artist}`);
            lines.push(`Album: ${item.albumTitle}`);
            lines.push(`Duration: ${item.durationSeconds}s`);
            break;
          case "album":
            lines.push(`Title: ${item.title}`);
            lines.push(`Artist: ${item.artist}`);
            lines.push(`Tracks: ${item.tracksCount}`);
            lines.push(`Duration: ${item.durationSeconds}s`);
            break;
          case "artist":
            lines.push(`Name: ${item.name}`);
            lines.push(`Top tracks surfaced: ${item.topTrackCount}`);
            break;
          case "playlist":
            lines.push(`Name: ${item.name}`);
            lines.push(`Owner: ${item.ownerName ?? "Unknown"}`);
            lines.push(`Tracks: ${item.tracksCount}`);
            lines.push(`Duration: ${item.durationSeconds}s`);
            break;
        }

        lines.push(`Share URL: ${item.shareUrl}`);
        lines.push(`Web player URL: ${item.playUrl}`);

        return { content: [{ type: "text", text: lines.join("\n") }] };
      } catch (err) {
        return {
          content: [{ type: "text", text: formatToolError(err, "Unexpected error while resolving item") }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "resume_qobuz",
    "Resume the user's last Qobuz playback session",
    {},
    async () => {
      try {
        return { content: [{ type: "text", text: "[stub] resume_qobuz called" }] };
      } catch (err) {
        return {
          content: [{ type: "text", text: `Error: ${String(err)}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "play_on_preferred_device",
    "Open a Qobuz item targeting the user's preferred device",
    {
      item_id: z.string().describe("Qobuz item ID"),
      item_type: z.enum(["track", "album", "artist", "playlist"]).describe("Type of catalog item"),
      device_id: z.string().optional().describe("Target device ID (uses preferred device if omitted)"),
    },
    async ({ item_id, item_type, device_id }) => {
      try {
        return {
          content: [{
            type: "text",
            text: `[stub] play_on_preferred_device called with: ${item_type}/${item_id} device=${device_id ?? "preferred"}`,
          }],
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: `Error: ${String(err)}` }],
          isError: true,
        };
      }
    }
  );

  return server;
}

function createHttpErrorResponse(
  res: Response,
  statusCode: number,
  message: string,
  errorCode = -32000,
): void {
  res.status(statusCode).json({
    jsonrpc: "2.0",
    error: {
      code: errorCode,
      message,
    },
    id: null,
  });
}

async function createHttpSession(sessions: Map<string, HttpSession>): Promise<HttpSession> {
  const server = createServer();
  let session: HttpSession;

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
    onsessioninitialized: (sessionId) => {
      sessions.set(sessionId, session);
    },
    onsessionclosed: (sessionId) => {
      sessions.delete(sessionId);
    },
  });

  session = { server, transport };
  await server.connect(transport);
  return session;
}

async function startStdioServer(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

async function startHttpServer(): Promise<void> {
  const { host, port, allowedHosts } = getHttpConfig();
  const sessions = new Map<string, HttpSession>();
  const app = createMcpExpressApp({ host, allowedHosts });

  app.get("/health", (_req: Request, res: Response) => {
    res.json({
      ok: true,
      transport: "streamable-http",
      endpoint: "/mcp",
    });
  });

  app.all("/mcp", async (req: Request, res: Response) => {
    const sessionId = req.header("mcp-session-id");
    let session = sessionId ? sessions.get(sessionId) : undefined;

    if (!sessionId && req.method !== "POST") {
      createHttpErrorResponse(res, 400, "Bad Request: Mcp-Session-Id header is required");
      return;
    }

    if (!session && sessionId) {
      createHttpErrorResponse(res, 404, "Session not found", -32001);
      return;
    }

    if (!session) {
      session = await createHttpSession(sessions);
    }

    try {
      await session.transport.handleRequest(req, res, req.body);
    } catch (err) {
      createHttpErrorResponse(res, 500, `Internal server error: ${String(err)}`);
    }
  });

  app.listen(port, host, () => {
    console.log(`qobuz-mcp listening on http://${host}:${port}/mcp`);
  });
}

async function main(): Promise<void> {
  await client.login();

  if (getTransportMode() === "http") {
    await startHttpServer();
    return;
  }

  await startStdioServer();
}

await main();
