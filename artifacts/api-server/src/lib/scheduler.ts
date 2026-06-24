import os from "os";

// ── Constants ─────────────────────────────────────────────────────────────────
// Each agent slot is async I/O-bound (LLM API call + DB write).
// Node.js single-thread handles many concurrent async ops with minimal RAM.
const RAM_PER_SLOT_MB = 12;        // estimated RAM per concurrent agent slot
const RAM_RESERVE_RATIO = 0.20;    // keep 20% RAM free for OS / other processes
const CPU_LOAD_DAMPING = 0.70;     // reduce capacity proportionally if CPU is loaded
const ABSOLUTE_MAX = 10_000;       // hard upper bound
const REFRESH_MS = 5_000;          // re-measure every 5 seconds

// ── Semaphore ─────────────────────────────────────────────────────────────────
// A reusable semaphore whose limit can be changed at runtime.

export class Semaphore {
  private _running = 0;
  private _queue: Array<() => void> = [];
  private _limit: number;

  constructor(limit: number) {
    this._limit = Math.max(1, Math.round(limit));
  }

  get running(): number { return this._running; }
  get queued(): number { return this._queue.length; }
  get limit(): number { return this._limit; }

  /** Update the concurrency limit. Drains queue if limit increased. */
  setLimit(n: number): void {
    this._limit = Math.max(1, Math.round(n));
    this._drain();
  }

  /** Run `fn` under the semaphore. Queues if at capacity. */
  async run<T>(fn: () => Promise<T>): Promise<T> {
    await this._acquire();
    try {
      return await fn();
    } finally {
      this._running--;
      this._drain();
    }
  }

  private _acquire(): Promise<void> {
    if (this._running < this._limit) {
      this._running++;
      return Promise.resolve();
    }
    return new Promise<void>(resolve => this._queue.push(resolve));
  }

  private _drain(): void {
    while (this._queue.length > 0 && this._running < this._limit) {
      const next = this._queue.shift()!;
      this._running++;
      next();
    }
  }
}

// ── Capacity snapshot ──────────────────────────────────────────────────────────

export interface CapacitySnapshot {
  totalRamMB: number;
  freeRamMB: number;
  usedRamMB: number;
  ramUsedPercent: number;
  cpuLoad1m: number;
  cpuCount: number;
  cpuLoadPercent: number;
  maxConcurrent: number;
  currentlyRunning: number;
  queued: number;
  updatedAt: string;
}

function calcMaxConcurrent(): number {
  const totalMB = os.totalmem() / (1024 * 1024);
  const freeMB = os.freemem() / (1024 * 1024);
  const reserveMB = totalMB * RAM_RESERVE_RATIO;
  const availableMB = Math.max(0, freeMB - reserveMB);

  const cpuCount = os.cpus().length;
  const load1m = os.loadavg()[0];
  const cpuUsageRatio = Math.min(1, load1m / cpuCount);

  const ramCapacity = availableMB / RAM_PER_SLOT_MB;
  const cpuFactor = Math.max(0.05, 1 - cpuUsageRatio * CPU_LOAD_DAMPING);

  return Math.max(1, Math.min(ABSOLUTE_MAX, Math.floor(ramCapacity * cpuFactor)));
}

function buildSnapshot(sem: Semaphore): CapacitySnapshot {
  const totalMB = Math.round(os.totalmem() / (1024 * 1024));
  const freeMB = Math.round(os.freemem() / (1024 * 1024));
  const usedMB = totalMB - freeMB;
  const cpuCount = os.cpus().length;
  const load1m = os.loadavg()[0];
  const cpuLoadPercent = Math.round(Math.min(100, (load1m / cpuCount) * 100));

  return {
    totalRamMB: totalMB,
    freeRamMB: freeMB,
    usedRamMB: usedMB,
    ramUsedPercent: Math.round((usedMB / totalMB) * 100),
    cpuLoad1m: Math.round(load1m * 100) / 100,
    cpuCount,
    cpuLoadPercent,
    maxConcurrent: sem.limit,
    currentlyRunning: sem.running,
    queued: sem.queued,
    updatedAt: new Date().toISOString(),
  };
}

// ── Global scheduler singleton ────────────────────────────────────────────────

const _globalSem = new Semaphore(calcMaxConcurrent());
let _snapshot: CapacitySnapshot = buildSnapshot(_globalSem);

// Refresh resource measurements periodically
setInterval(() => {
  const newMax = calcMaxConcurrent();
  _globalSem.setLimit(newMax);
  _snapshot = buildSnapshot(_globalSem);
}, REFRESH_MS).unref(); // unref so it doesn't prevent process exit

export const globalScheduler = _globalSem;

export function getCapacitySnapshot(): CapacitySnapshot {
  return {
    ..._snapshot,
    maxConcurrent: _globalSem.limit,
    currentlyRunning: _globalSem.running,
    queued: _globalSem.queued,
    updatedAt: new Date().toISOString(),
  };
}
