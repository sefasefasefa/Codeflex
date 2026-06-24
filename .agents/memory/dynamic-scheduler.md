---
name: Dynamic Scheduler
description: True parallel subagent execution with resource-aware capacity scaling
---

## Rule
The subagent execution system uses a real semaphore+queue pattern. Capacity is calculated from free RAM and CPU load every 5 seconds. The `parallelCount` field is an upper bound per run; actual concurrency = `min(parallelCount, systemMax)`.

## Where it lives
- `artifacts/api-server/src/lib/scheduler.ts` — Semaphore class + resource monitor + `getCapacitySnapshot()`
- `artifacts/api-server/src/routes/runs.ts` — `executeAgentRun()` uses `Promise.all` + per-run Semaphore
- `artifacts/api-server/src/routes/stats.ts` — `GET /capacity` endpoint
- `artifacts/swarm-ui/src/pages/dashboard.tsx` — live capacity widget (polls every 4s)
- `artifacts/swarm-ui/src/pages/project-detail.tsx` — slider max = `cap.maxConcurrent` (dynamic)

## Capacity formula
```
availableMB = freeMem - (totalMem * 0.20)   // keep 20% for OS
ramCapacity = availableMB / 12              // 12MB per slot (async I/O bound)
cpuFactor   = max(0.05, 1 - cpuUsageRatio * 0.70)
maxConcurrent = min(10_000, floor(ramCapacity * cpuFactor))
```

**Why:** Agents are async I/O-bound (LLM API call + DB write), not CPU-bound, so Node.js can handle many more "concurrent" agents than CPU cores.

## Build requirement
API server runs from compiled dist (`node ./dist/index.mjs`). Source changes require `pnpm --filter @workspace/api-server run build` then workflow restart.
