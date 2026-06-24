---
name: Multi-artifact port setup
description: Port assignments and constraints for SWARM_CTRL's 4-artifact setup on Replit
---

## Rule
Port 5000 is reserved by Replit's artifact proxy in multi-artifact projects — no app can bind to it directly, even though the workflow skill says "webview must use 5000". This causes `EADDRINUSE` on startup.

**Why:** Replit's multi-artifact routing proxy listens on 5000 and forwards to each artifact on its own port. The workflow skill's "webview=5000" rule applies to single-artifact projects only.

**How to apply:** Use non-5000 ports for all services. The artifact preview routing handles path-based access (/studio/, /cli/, /api).

## Working port assignments
- `API Server` → PORT=3000, outputType=console
- `Swarm UI` → PORT=8080, BASE_PATH=/, outputType=console
- `Studio Dev` → PORT=3001, BASE_PATH=/studio/, outputType=console
- `CLI` → PORT=3002, BASE_PATH=/cli/, outputType=console

## Other constraints
- Artifact-managed workflows (`artifacts/XXX: web`) cannot be configured via `configureWorkflow` — they're system-managed.
- Vite configs require PORT and BASE_PATH env vars; without them the process exits immediately.
- `/api` proxy in each Vite config must point to `http://localhost:3000`.
- `CLERK_PUBLISHABLE_KEY` (not `VITE_CLERK_PUBLISHABLE_KEY`) is the secret name; expose it via vite.config.ts `define` block.
