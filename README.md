# Qobuz MCP Server – Project Context

## Purpose
Build and maintain a robust, token-efficient Qobuz MCP server (Node.js/TypeScript) for use with Claude Cowork and other MCP-compatible clients.

## Current Focus
- Implement and refine the Qobuz MCP server endpoints and schemas.
- Keep Claude usage efficient: small context, targeted planning, minimal diffs.
- Use project docs as on-demand reference instead of stuffing all details into the base prompt.

## Tech Stack
- Language: TypeScript (Node.js)
- MCP: Model Context Protocol server
- Package manager: npm or pnpm (clarify in this section)
- Testing: TBD (e.g., Vitest/Jest) – keep tests focused and lightweight

Update this list as the stack solidifies.

## Repository Layout (example – update to match reality)
- `src/` – main source
  - `index.ts` – server entrypoint
  - `mcp/` – MCP-specific handlers, schemas, and utilities
  - `qobuz/` – Qobuz API client, types, and helpers
- `docs/` – project documentation
  - `architecture.md` – high-level design and flows
  - `patterns.md` – coding conventions and patterns
  - `api-notes.md` – Qobuz-specific API notes
  - `tasks.md` – active tasks & decisions
- `package.json` – scripts and dependencies

Keep this section accurate so Claude can quickly orient without scanning the whole repo.

## Commands (fill in as they’re decided)
- `npm install` / `pnpm install` – install deps
- `npm run dev` – start dev server
- `npm test` – run tests
- `npm run lint` – lint

Adjust to match your actual scripts.

## Workflow with Claude Cowork
- Always read this README first when starting a new task.
- For deeper context, read `docs/architecture.md`, `docs/patterns.md`, or `docs/api-notes.md` only when relevant.
- Avoid repo-wide scans or reading many files at once.
- Prefer: identify target file(s) → inspect → propose small plan → implement minimal changes.

## Constraints & Preferences
- Token efficiency is a first-class goal.
- No speculative refactors; refactor only in service of an explicit task.
- Preserve existing patterns unless there is a clear, documented improvement.
- Prefer clear TypeScript types and small, composable functions.

## Status Log (keep this short)
Use a rolling log of milestone-level changes and decisions. Newest at top.

- 2026-04-23 – Initialized project context README for Qobuz MCP server; added Claude workflow & efficiency constraints.

For detailed history, use your VCS (git) and `docs/tasks.md`.
