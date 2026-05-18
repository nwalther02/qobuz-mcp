# qobuz-mcp — Project Notes

## Git Workflow

**PR-based branching — never commit feature work directly to `main`.**

Branch naming convention:
- `step-N/short-description` for implementation steps (e.g. `step-4/get-item`)
- `fix/short-description` for bug fixes
- `chore/short-description` for non-feature work

Each step: branch off `main` → implement → review → commit → push → `gh pr create` → merge.

## Implementation Steps

| Step | Branch | Status |
|------|--------|--------|
| 1 | — (committed to main directly) | ✅ Scaffold + tool stubs |
| 2 | — (committed to main directly) | ✅ Qobuz API authentication |
| 3 | — (committed to main directly) | ✅ `search()` implementation |
| 4 | `step-4/get-item` | ✅ Item resolution + Qobuz links |

## Architecture

- `src/index.ts` — MCP server factory, tool definitions, env var sourcing, `stdio` + Streamable HTTP startup paths
- `src/qobuz/client.ts` — `QobuzClient` with `login()`, `request<T>()`, `search()`, `getItem()`
- `src/qobuz/types.ts` — Qobuz API response types + normalised result types

## Key Implementation Notes

- `request<T>()` handles 401 token expiry with a single re-login retry; retry is inside the `try` block so `isReauthenticating` stays `true` during the retry call
- `performer` on track items can be `null` (classical/licensed tracks); mapping falls back to `album.artist.name`
- `app_id` is sent via `X-App-Id` header only — not duplicated in query params
- All env vars (`QOBUZ_APP_ID`, `QOBUZ_APP_SECRET`, `QOBUZ_USERNAME`, `QOBUZ_PASSWORD`) validated at startup via `requireEnv()`
- `src/index.ts` loads `.env` automatically via `dotenv/config`, so local development does not require manual shell exports
- `open_qobuz_item` now resolves `track`, `album`, `artist`, and `playlist` items and returns both `open.qobuz.com` and `play.qobuz.com` links
- HTTP mode uses `StreamableHTTPServerTransport` on `/mcp`; each initialized session gets its own `McpServer` + transport instance tracked by `mcp-session-id`
