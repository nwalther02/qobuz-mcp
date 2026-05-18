# Qobuz MCP Server – Project Context

## Purpose
Build and maintain a robust, token-efficient Qobuz MCP server (Node.js/TypeScript) for use with Claude Cowork and other MCP-compatible clients.

## Current Focus
- Implement and refine the Qobuz MCP server endpoints and schemas.
- Support both local `stdio` clients and remote-capable Streamable HTTP clients from the same codebase.
- Keep Claude usage efficient: small context, targeted planning, minimal diffs.
- Use project docs as on-demand reference instead of stuffing all details into the base prompt.

## Tech Stack
- Language: TypeScript (Node.js)
- MCP: Model Context Protocol server
- Transports: `stdio` and Streamable HTTP
- Package manager: npm
- Runtime env loading: `dotenv`
- Verification: `npm run lint`, `npm run build`

Update this list as the stack solidifies.

## Repository Layout
- `src/` – main source
  - `index.ts` – server entrypoint
  - `qobuz/` – Qobuz API client, types, and helpers
- `.env.example` – required Qobuz credentials template
- `claude_desktop_config.example.json` – example Claude Desktop MCP server config
- `CLAUDE.md` – project notes, workflow, and implementation status
- `package.json` – scripts and dependencies

## Commands
- `npm install` – install deps
- `npm run dev` – start dev server
- `npm run dev:http` – start Streamable HTTP dev server on `127.0.0.1:3000`
- `npm run lint` – lint
- `npm run build` – compile to `dist/`
- `npm run start:http` – run the built server in Streamable HTTP mode

## Local Setup
1. Copy `.env.example` to `.env` and fill in valid Qobuz developer credentials.
2. Run `npm install`.
3. Run `npm run build`.
4. For local MCP hosts such as Claude Desktop, keep `QOBUZ_MCP_TRANSPORT=stdio` and point the client at `dist/index.js` using `claude_desktop_config.example.json` as the template.
5. For remote-capable clients, set `QOBUZ_MCP_TRANSPORT=http` and run `npm run start:http`. The MCP endpoint is `http://127.0.0.1:3000/mcp` by default and `GET /health` returns a simple readiness payload.

## Transport Notes
- `stdio` is the default mode and is the right fit when a local app or SDK process spawns the MCP server directly.
- Streamable HTTP uses one `/mcp` endpoint for `POST`, `GET`, and `DELETE` requests with session tracking via the `mcp-session-id` header.
- If you bind HTTP to `0.0.0.0` or another non-local host, set `QOBUZ_MCP_ALLOWED_HOSTS` and add authentication before exposing the server beyond your machine.

## Workflow with Claude Cowork
- Always read this README first when starting a new task.
- Avoid repo-wide scans or reading many files at once.
- Prefer: identify target file(s) → inspect → propose small plan → implement minimal changes.

## Constraints & Preferences
- Token efficiency is a first-class goal.
- No speculative refactors; refactor only in service of an explicit task.
- Preserve existing patterns unless there is a clear, documented improvement.
- Prefer clear TypeScript types and small, composable functions.

## Status Log (keep this short)
Use a rolling log of milestone-level changes and decisions. Newest at top.

- 2026-05-14 – Completed Step 4 item resolution wiring for `open_qobuz_item`; added `.env` runtime loading and a current Claude Desktop MCP config example.
- 2026-05-14 – Added dual transport support: default `stdio` plus Streamable HTTP on `/mcp` for future remote MCP clients.
- 2026-04-23 – Initialized project context README for Qobuz MCP server; added Claude workflow & efficiency constraints.
