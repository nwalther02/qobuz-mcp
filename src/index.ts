import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { QobuzClient, QobuzApiError } from "./qobuz/client.js";

// --- Env var validation (fail fast if any credential is missing) ---
function requireEnv(key: string): string {
  const val = process.env[key];
  if (val === undefined) throw new Error(`Missing required environment variable: ${key}`);
  return val;
}

const client = new QobuzClient(
  requireEnv("QOBUZ_APP_ID"),
  requireEnv("QOBUZ_APP_SECRET"),
  requireEnv("QOBUZ_USERNAME"),
  requireEnv("QOBUZ_PASSWORD"),
);

const server = new McpServer({
  name: "qobuz-mcp",
  version: "0.1.0",
});

// --- Tool stubs (logic to be implemented in subsequent steps) ---

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
        results.tracks.forEach((t, i) =>
          lines.push(`  ${i + 1}. "${t.title}" by ${t.artist} (${t.durationSeconds}s, ID: ${t.id})`)
        );
      }

      if (results.albums.length > 0) {
        lines.push("**Albums:**");
        results.albums.forEach((a, i) =>
          lines.push(`  ${i + 1}. "${a.title}" by ${a.artist} (ID: ${a.id})`)
        );
      }

      if (results.artists.length > 0) {
        lines.push("**Artists:**");
        results.artists.forEach((a, i) =>
          lines.push(`  ${i + 1}. ${a.name} (ID: ${a.id})`)
        );
      }

      if (lines.length === 0) {
        lines.push("No results found.");
      }

      return { content: [{ type: "text", text: lines.join("\n") }] };
    } catch (err) {
      const message = err instanceof QobuzApiError
        ? `Qobuz API error (${err.statusCode}): ${err.message}`
        : `Unexpected error during search: ${String(err)}`;
      return { content: [{ type: "text", text: message }], isError: true };
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
      return { content: [{ type: "text", text: `[stub] open_qobuz_item called with: ${item_type}/${item_id}` }] };
    } catch (err) {
      return { content: [{ type: "text", text: `Error: ${String(err)}` }], isError: true };
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
      return { content: [{ type: "text", text: `Error: ${String(err)}` }], isError: true };
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
      return { content: [{ type: "text", text: `[stub] play_on_preferred_device called with: ${item_type}/${item_id} device=${device_id ?? "preferred"}` }] };
    } catch (err) {
      return { content: [{ type: "text", text: `Error: ${String(err)}` }], isError: true };
    }
  }
);

// --- Startup ---

await client.login();

const transport = new StdioServerTransport();
await server.connect(transport);
