# SWARM_CTRL

An AI Swarm orchestration and development platform for managing projects, agents, and LLM-driven workflows. Features a centralized API backend, an admin dashboard (Swarm UI), an AI Studio, and a web-based CLI interface.

## Run & Operate

- **Run Button** starts both services in parallel (API Server + Admin Panel)
- `pnpm --filter @workspace/api-server run dev` — build & run the API server (port 8080)
- `pnpm --filter @workspace/admin-panel run dev` — run the Admin Panel frontend (port 5000)
- `pnpm --filter @workspace/studio run dev` — run the AI Studio frontend (port 3001)
- `pnpm --filter @workspace/cli-web run dev` — run the CLI web frontend (port 3002)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Stack

- pnpm workspaces, Node.js 20, TypeScript 5.9
- API: Express 5 (port 8080)
- DB: SQLite via Drizzle ORM (`./data/database.sqlite`)
- Auth: Replit OIDC (openid-client, sessions stored in SQLite)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec at `lib/api-spec/openapi.yaml`)
- Build: esbuild (ESM bundle)
- Frontend: React 19, Vite 7, Tailwind CSS v4, Radix UI, Wouter, React Query

## Where things live

- `artifacts/api-server/` — Express backend, auth (OIDC), all API routes
- `artifacts/admin-panel/` — Admin dashboard (main webview on port 5000)
- `artifacts/studio/` — AI Studio frontend (port 3001, base path `/studio/`)
- `artifacts/cli/` — Web CLI terminal frontend (port 3002)
- `lib/db/` — Drizzle ORM schema and DB client (`src/schema/`)
- `lib/api-spec/` — OpenAPI YAML spec (source of truth for API contracts)
- `lib/api-client-react/` — Auto-generated React Query hooks
- `lib/api-zod/` — Auto-generated Zod schemas
- `lib/replit-auth-web/` — Replit auth hook (`useAuth`) for frontends
- `data/database.sqlite` — SQLite database file

## Architecture decisions

- Auth is Replit OIDC — sessions are cookie-based (`sid` cookie), stored in SQLite `sessions` table
- The Admin Panel proxies `/api` requests to the API server at `localhost:8080`
- AI model providers (OpenAI, Anthropic, Gemini, Groq, etc.) are configured via API keys stored in the DB `model_configs` table — users add their own keys through the Settings UI
- The API server bundles to a single ESM file with esbuild; `better-sqlite3` is external (native addon)
- All frontends share workspace packages via pnpm workspace links

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- When changing API server code, the `dev` script rebuilds before starting; `start` skips the build
- `DATABASE_FILE` env var must point to `./data/database.sqlite` (relative to workspace root) when running from root; the `dev` script sets it to `../../data/database.sqlite` relative to the artifact dir
- After schema changes, run `pnpm --filter @workspace/db run push` to apply them
- After OpenAPI spec changes, run `pnpm --filter @workspace/api-spec run codegen` to regenerate hooks
