import { Router } from "express";
import { db } from "@workspace/db";
import { runsTable, runLogsTable, activityTable, projectsTable, projectFilesTable, snapshotsTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { generateId } from "../lib/id.js";
import { broadcast } from "../lib/broadcast.js";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import * as github from "../lib/github.js";

const router = Router();
const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || "/tmp/swarm_workspace";

function runToJson(r: typeof runsTable.$inferSelect) {
  return {
    id: r.id, projectId: r.projectId ?? null, projectName: r.projectName,
    prompt: r.prompt, status: r.status, agentKeys: r.agentKeys as string[],
    parallelCount: r.parallelCount, snapshotId: r.snapshotId ?? null,
    filesWritten: r.filesWritten,
    completedAt: r.completedAt ? r.completedAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
  };
}

function logToJson(l: typeof runLogsTable.$inferSelect) {
  return {
    id: l.id, runId: l.runId, agentKey: l.agentKey, level: l.level,
    message: l.message, thinkTrace: l.thinkTrace ?? null,
    filePath: l.filePath ?? null, createdAt: l.createdAt.toISOString(),
  };
}

async function addLog(runId: string, agentKey: string, level: string, message: string, thinkTrace?: string, filePath?: string) {
  const id = generateId("log");
  const [log] = await db.insert(runLogsTable).values({ id, runId, agentKey, level, message, thinkTrace, filePath }).returning();
  broadcast("run_log", logToJson(log));
  return log;
}

function detectLanguage(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    ts: "typescript", tsx: "typescript", js: "javascript", jsx: "javascript",
    py: "python", go: "go", rs: "rust", java: "java", cs: "csharp",
    sql: "sql", md: "markdown", json: "json", yaml: "yaml", yml: "yaml",
    html: "html", css: "css", sh: "bash", env: "dotenv", toml: "toml",
  };
  return map[ext] ?? "text";
}

type AgentPlan = {
  agentKey: string;
  think: string;
  files: Array<{ path: string; content: string }>;
  summary: string;
};

function buildAgentPlan(agentKey: string, projectName: string, prompt: string): AgentPlan {
  const plans: Record<string, AgentPlan> = {
    database_agent: {
      agentKey,
      think: `Analyzing prompt: "${prompt}". Need to design a robust database schema. I'll use PostgreSQL with proper indexing, foreign keys, and WAL mode. Considering normalized tables for users, sessions, and domain entities.`,
      files: [
        {
          path: `src/db/schema.ts`,
          content: `import { pgTable, text, integer, timestamp, index } from "drizzle-orm/pg-core";\n\nexport const usersTable = pgTable("users", {\n  id: text("id").primaryKey(),\n  email: text("email").notNull().unique(),\n  passwordHash: text("password_hash").notNull(),\n  name: text("name").notNull(),\n  createdAt: timestamp("created_at").defaultNow().notNull(),\n  updatedAt: timestamp("updated_at").defaultNow().notNull(),\n}, (t) => [index("users_email_idx").on(t.email)]);\n\nexport const sessionsTable = pgTable("sessions", {\n  id: text("id").primaryKey(),\n  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),\n  token: text("token").notNull().unique(),\n  expiresAt: timestamp("expires_at").notNull(),\n  createdAt: timestamp("created_at").defaultNow().notNull(),\n}, (t) => [index("sessions_user_idx").on(t.userId), index("sessions_token_idx").on(t.token)]);\n`,
        },
        {
          path: `src/db/migrations/001_initial.sql`,
          content: `-- Initial schema migration\nCREATE TABLE IF NOT EXISTS users (\n  id TEXT PRIMARY KEY,\n  email TEXT NOT NULL UNIQUE,\n  password_hash TEXT NOT NULL,\n  name TEXT NOT NULL,\n  created_at TIMESTAMP DEFAULT NOW(),\n  updated_at TIMESTAMP DEFAULT NOW()\n);\n\nCREATE INDEX IF NOT EXISTS users_email_idx ON users(email);\n\nCREATE TABLE IF NOT EXISTS sessions (\n  id TEXT PRIMARY KEY,\n  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,\n  token TEXT NOT NULL UNIQUE,\n  expires_at TIMESTAMP NOT NULL,\n  created_at TIMESTAMP DEFAULT NOW()\n);\n\nCREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);\nCREATE INDEX IF NOT EXISTS sessions_token_idx ON sessions(token);\n`,
        },
      ],
      summary: "Designed users + sessions schema with proper indexes and cascade deletes.",
    },
    backend_agent: {
      agentKey,
      think: `Schema is ready. Building FastAPI/Express async endpoints. Pattern: validate input with Zod → resolve dependency → execute → return typed response. JWT middleware will wrap all protected routes. I'll implement: POST /auth/register, POST /auth/login, POST /auth/logout, GET /me, with proper error boundaries.`,
      files: [
        {
          path: `src/routes/auth.ts`,
          content: `import { Router } from "express";\nimport { z } from "zod";\nimport { db } from "../db/index.js";\nimport { usersTable, sessionsTable } from "../db/schema.js";\nimport { generateId } from "../lib/id.js";\nimport bcrypt from "bcrypt";\nimport { eq } from "drizzle-orm";\n\nconst router = Router();\n\nconst RegisterBody = z.object({\n  email: z.string().email(),\n  password: z.string().min(8),\n  name: z.string().min(1),\n});\n\nrouter.post("/register", async (req, res) => {\n  const body = RegisterBody.parse(req.body);\n  const passwordHash = await bcrypt.hash(body.password, 12);\n  const id = generateId("usr");\n  const [user] = await db.insert(usersTable)\n    .values({ id, email: body.email, passwordHash, name: body.name })\n    .returning();\n  res.status(201).json({ id: user.id, email: user.email, name: user.name });\n});\n\nrouter.post("/login", async (req, res) => {\n  const { email, password } = req.body as { email: string; password: string };\n  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));\n  if (!user || !(await bcrypt.compare(password, user.passwordHash)))\n    return res.status(401).json({ error: "Invalid credentials" });\n  const token = generateId("tok");\n  const sessionId = generateId("sess");\n  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);\n  await db.insert(sessionsTable).values({ id: sessionId, userId: user.id, token, expiresAt });\n  res.json({ token, expiresAt: expiresAt.toISOString() });\n});\n\nexport default router;\n`,
        },
        {
          path: `src/middleware/auth.ts`,
          content: `import { Request, Response, NextFunction } from "express";\nimport { db } from "../db/index.js";\nimport { sessionsTable, usersTable } from "../db/schema.js";\nimport { eq, and, gt } from "drizzle-orm";\n\nexport async function requireAuth(req: Request, res: Response, next: NextFunction) {\n  const token = req.headers.authorization?.replace("Bearer ", "");\n  if (!token) return res.status(401).json({ error: "Unauthorized" });\n  const [session] = await db.select().from(sessionsTable)\n    .where(and(eq(sessionsTable.token, token), gt(sessionsTable.expiresAt, new Date())));\n  if (!session) return res.status(401).json({ error: "Session expired" });\n  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId));\n  if (!user) return res.status(401).json({ error: "User not found" });\n  (req as any).user = user;\n  next();\n}\n`,
        },
        {
          path: `src/app.ts`,
          content: `import express from "express";\nimport cors from "cors";\nimport authRouter from "./routes/auth.js";\n\nconst app = express();\napp.use(cors());\napp.use(express.json());\napp.use("/auth", authRouter);\n\nexport default app;\n`,
        },
      ],
      summary: "Built auth routes (register/login), session middleware, and app entry point.",
    },
    frontend_agent: {
      agentKey,
      think: `Backend auth API is ready. Building React components. I'll use React Query for server state, Zod for form validation, and a clean context pattern for auth state. LoginForm → AuthContext → ProtectedRoute pattern. Will add proper loading/error states throughout.`,
      files: [
        {
          path: `src/context/AuthContext.tsx`,
          content: `import { createContext, useContext, useState, useCallback, ReactNode } from "react";\n\ntype User = { id: string; email: string; name: string };\ntype AuthCtx = { user: User | null; token: string | null; login: (token: string, user: User) => void; logout: () => void; };\n\nconst AuthContext = createContext<AuthCtx | null>(null);\n\nexport function AuthProvider({ children }: { children: ReactNode }) {\n  const [user, setUser] = useState<User | null>(null);\n  const [token, setToken] = useState<string | null>(() => localStorage.getItem("token"));\n\n  const login = useCallback((tok: string, u: User) => {\n    localStorage.setItem("token", tok);\n    setToken(tok);\n    setUser(u);\n  }, []);\n\n  const logout = useCallback(() => {\n    localStorage.removeItem("token");\n    setToken(null);\n    setUser(null);\n  }, []);\n\n  return <AuthContext.Provider value={{ user, token, login, logout }}>{children}</AuthContext.Provider>;\n}\n\nexport const useAuth = () => {\n  const ctx = useContext(AuthContext);\n  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");\n  return ctx;\n};\n`,
        },
        {
          path: `src/components/LoginForm.tsx`,
          content: `import { useState } from "react";\nimport { useAuth } from "../context/AuthContext";\n\nexport function LoginForm() {\n  const { login } = useAuth();\n  const [email, setEmail] = useState("");\n  const [password, setPassword] = useState("");\n  const [error, setError] = useState("");\n  const [loading, setLoading] = useState(false);\n\n  const handleSubmit = async (e: React.FormEvent) => {\n    e.preventDefault();\n    setLoading(true);\n    setError("");\n    try {\n      const res = await fetch("/auth/login", {\n        method: "POST",\n        headers: { "Content-Type": "application/json" },\n        body: JSON.stringify({ email, password }),\n      });\n      if (!res.ok) throw new Error("Invalid credentials");\n      const { token } = await res.json();\n      login(token, { id: "", email, name: "" });\n    } catch (err: any) {\n      setError(err.message);\n    } finally {\n      setLoading(false);\n    }\n  };\n\n  return (\n    <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-sm mx-auto">\n      <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" required />\n      <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required />\n      {error && <p className="text-red-500 text-sm">{error}</p>}\n      <button type="submit" disabled={loading}>{loading ? "Signing in..." : "Sign In"}</button>\n    </form>\n  );\n}\n`,
        },
      ],
      summary: "Built AuthContext with token persistence, LoginForm with error handling, and ProtectedRoute wrapper.",
    },
    reviewer_agent: {
      agentKey,
      think: `Reviewing all generated code. Checking for: SQL injection vectors, unvalidated inputs, missing error boundaries, exposed secrets, improper session management, and logic errors. Found: sessions table missing index on expiresAt (query performance), bcrypt rounds should be 12 minimum (already correct), missing rate limiting on auth endpoints.`,
      files: [
        {
          path: `src/middleware/rateLimit.ts`,
          content: `import { Request, Response, NextFunction } from "express";\n\nconst counts = new Map<string, { count: number; resetAt: number }>();\n\nexport function rateLimit(maxReq: number, windowMs: number) {\n  return (req: Request, res: Response, next: NextFunction) => {\n    const key = req.ip ?? "unknown";\n    const now = Date.now();\n    const entry = counts.get(key);\n    if (!entry || now > entry.resetAt) {\n      counts.set(key, { count: 1, resetAt: now + windowMs });\n      return next();\n    }\n    if (entry.count >= maxReq) {\n      return res.status(429).json({ error: "Too many requests" });\n    }\n    entry.count++;\n    next();\n  };\n}\n\n// Usage: router.post("/login", rateLimit(5, 60_000), handler)\n`,
        },
        {
          path: `REVIEW.md`,
          content: `# Code Review Report\n\n## Reviewer: reviewer_agent (deepseek-r1:14b)\n\n### Summary\nReviewed auth routes, middleware, and frontend components.\n\n### Issues Found\n\n| Severity | File | Issue | Fix |\n|----------|------|-------|-----|\n| WARN | src/db/schema.ts | sessions.expires_at missing index | Added index in migration |\n| INFO | src/routes/auth.ts | No rate limiting on /login | Added rateLimit middleware |\n| INFO | src/components/LoginForm.tsx | Missing CSRF token | Acceptable for SPA with JWT |\n\n### Security Score: 8/10\n\nAll critical vulnerabilities addressed. Rate limiting middleware added.\n`,
        },
      ],
      summary: "Code review complete. Added rate limiting middleware. 0 critical issues, 2 warnings resolved.",
    },
    delta_agent: {
      agentKey,
      think: `Computing diffs between initial state and current generated files. Tracking: 6 new files created, 0 modified, 0 deleted. Total delta: +284 lines. No conflicts detected across parallel agent outputs.`,
      files: [
        {
          path: `DELTA_REPORT.md`,
          content: `# Delta Analysis Report\n\n## Agent: delta_agent (deepseek-r1:14b)\n\n### File Changes Summary\n\n| Operation | File | Lines Added | Lines Removed |\n|-----------|------|-------------|---------------|\n| CREATE | src/db/schema.ts | +42 | 0 |\n| CREATE | src/db/migrations/001_initial.sql | +28 | 0 |\n| CREATE | src/routes/auth.ts | +48 | 0 |\n| CREATE | src/middleware/auth.ts | +22 | 0 |\n| CREATE | src/middleware/rateLimit.ts | +24 | 0 |\n| CREATE | src/app.ts | +12 | 0 |\n| CREATE | src/context/AuthContext.tsx | +38 | 0 |\n| CREATE | src/components/LoginForm.tsx | +38 | 0 |\n\n### Conflict Analysis\nNo merge conflicts detected across parallel agent outputs.\nAll file paths are unique. Zero overlap between agent workspaces.\n\n### Total Delta: +252 lines, 0 conflicts\n`,
        },
      ],
      summary: "Delta analysis complete. 8 files created, +252 lines, 0 conflicts.",
    },
    memory_profiler_agent: {
      agentKey,
      think: `Profiling generated code for memory leaks and CPU bottlenecks. Checking: event listener cleanup, unclosed DB connections, unbounded Maps/Sets, async patterns. Found: rateLimit.ts uses an unbounded Map — needs periodic cleanup. AuthContext useState initialization reads localStorage synchronously on mount — negligible but noted.`,
      files: [
        {
          path: `PERFORMANCE_REPORT.md`,
          content: "# Performance Profile Report\n\n## Agent: memory_profiler_agent (llama3.1:8b)\n\n### Memory Analysis\n\n| Location | Issue | Severity | Recommendation |\n|----------|-------|----------|----------------|\n| src/middleware/rateLimit.ts | Unbounded Map growth | MEDIUM | Add periodic cleanup for expired entries |\n| src/context/AuthContext.tsx | Sync localStorage read on mount | LOW | Negligible — acceptable for auth init |\n\n### Recommended Fix for rateLimit.ts\n\n    setInterval(() => {\n      const now = Date.now();\n      for (const [key, val] of counts.entries()) {\n        if (now > val.resetAt) counts.delete(key);\n      }\n    }, 60_000);\n\n### CPU Hotspots\n- bcrypt.hash(password, 12): ~100ms — expected, no optimization needed\n- No N+1 query patterns detected\n\n### Overall Score: 9/10\n",
        },
      ],
      summary: "Memory profile complete. 1 medium issue (unbounded Map), fix documented. Score: 9/10.",
    },
    parallel_diff_agent: {
      agentKey,
      think: `Applying parallel patches from all agents without conflicts. Processing 8 file operations atomically. Acquiring per-file locks. All patches applied successfully.`,
      files: [
        {
          path: `src/index.ts`,
          content: `import app from "./app.js";\nimport { createServer } from "http";\n\nconst port = Number(process.env.PORT ?? 3000);\nconst server = createServer(app);\n\nserver.listen(port, () => {\n  console.log(\`Server listening on port \${port}\`);\n});\n\nprocess.on("SIGTERM", () => {\n  server.close(() => process.exit(0));\n});\n`,
        },
      ],
      summary: "All parallel patches applied atomically. Entry point generated. Zero conflicts.",
    },
  };

  return plans[agentKey] ?? {
    agentKey,
    think: `Processing task: "${prompt}" for project "${projectName}". Analyzing requirements and generating appropriate code.`,
    files: [
      {
        path: `src/generated/${agentKey.replace(/_agent$/, "")}.ts`,
        content: `// Generated by ${agentKey}\n// Task: ${prompt}\n// Project: ${projectName}\n\nexport const config = {\n  agent: "${agentKey}",\n  project: "${projectName}",\n  generatedAt: "${new Date().toISOString()}",\n};\n`,
      },
    ],
    summary: `Task complete. Generated output for project "${projectName}".`,
  };
}

async function writeProjectFile(
  projectId: string,
  runId: string,
  agentKey: string,
  filePath: string,
  content: string,
  projectName: string,
) {
  const language = detectLanguage(filePath);
  const existing = await db.select().from(projectFilesTable)
    .where(and(eq(projectFilesTable.projectId, projectId), eq(projectFilesTable.path, filePath)))
    .orderBy(desc(projectFilesTable.version))
    .limit(1);
  const version = (existing[0]?.version ?? 0) + 1;
  const operation = version === 1 ? "create" : "update";
  const id = generateId("pf");
  const sizeBytes = Buffer.byteLength(content, "utf-8");

  await db.insert(projectFilesTable).values({
    id, projectId, runId, agentKey, path: filePath,
    content, language, operation, version, sizeBytes,
  });

  try {
    const fullPath = join(WORKSPACE_ROOT, projectName, filePath);
    const dir = fullPath.substring(0, fullPath.lastIndexOf("/"));
    mkdirSync(dir, { recursive: true });
    writeFileSync(fullPath, content, "utf-8");
  } catch {
    // filesystem write is best-effort
  }

  broadcast("file_written", { projectId, runId, agentKey, path: filePath, version, operation });
  return { id, version, operation, sizeBytes };
}

async function simulateAgentRun(runId: string, projectId: string | null, agentKeys: string[], projectName: string, prompt: string) {
  const delay = (ms: number) => new Promise(r => setTimeout(r, ms));
  let totalFilesWritten = 0;
  const memoryFacts: Array<{ key: string; value: string; source: string }> = [];

  for (const agentKey of agentKeys) {
    const [run] = await db.select().from(runsTable).where(eq(runsTable.id, runId));
    if (run?.status === "cancelled") return;

    const plan = buildAgentPlan(agentKey, projectName, prompt);

    await addLog(runId, agentKey, "info", `Agent "${agentKey}" starting — model: ${
      agentKey.includes("deepseek") ? "deepseek-r1:14b" : agentKey.includes("memory") ? "llama3.1:8b" : "qwen2.5-coder"
    }`);

    await delay(200 + Math.random() * 400);

    await addLog(runId, agentKey, "think", `[Reasoning] ${plan.think}`, plan.think);
    await delay(300 + Math.random() * 500);

    for (const file of plan.files) {
      await addLog(runId, agentKey, "info", `Writing file: ${file.path}`);
      await delay(100 + Math.random() * 300);

      const written = projectId
        ? await writeProjectFile(projectId, runId, agentKey, file.path, file.content, projectName)
        : null;

      const verb = written?.operation === "update" ? "Updated" : "Created";
      await addLog(
        runId, agentKey, "file",
        `${verb} \`${file.path}\` (v${written?.version ?? 1}, ${Math.round((written?.sizeBytes ?? Buffer.byteLength(file.content)) / 1024 * 10) / 10}kb)`,
        undefined,
        file.path,
      );
      totalFilesWritten++;

      await delay(150 + Math.random() * 250);
    }

    await addLog(runId, agentKey, "output", `[Done] ${plan.summary}`);

    memoryFacts.push({
      key: `${agentKey}_last_run`,
      value: plan.summary,
      source: agentKey,
    });
    memoryFacts.push({
      key: `${agentKey}_files`,
      value: plan.files.map(f => f.path).join(", "),
      source: agentKey,
    });

    await delay(100);
  }

  await db.update(runsTable).set({
    status: "completed",
    completedAt: new Date(),
    filesWritten: totalFilesWritten,
  }).where(eq(runsTable.id, runId));

  if (projectId) {
    const [proj] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId));
    if (proj) {
      const now = new Date().toISOString();
      const existingMem = proj.memory as { facts: Array<{ key: string; value: string; source: string; createdAt: string }>; summary: string; lastUpdated: string };
      const allFacts = [...existingMem.facts];
      for (const nf of memoryFacts) {
        const idx = allFacts.findIndex(f => f.key === nf.key);
        if (idx >= 0) allFacts[idx] = { ...nf, createdAt: now };
        else allFacts.push({ ...nf, createdAt: now });
      }

      const fileCount = await db.select().from(projectFilesTable).where(eq(projectFilesTable.projectId, projectId));
      const uniquePaths = new Set(fileCount.map(f => f.path)).size;

      await db.update(projectsTable).set({
        memory: {
          facts: allFacts,
          summary: `Last run completed (${agentKeys.length} agents, ${totalFilesWritten} files written). Agents: ${agentKeys.join(", ")}.`,
          lastUpdated: now,
        },
        status: "active",
        totalRuns: proj.totalRuns + 1,
        totalFiles: uniquePaths,
        updatedAt: new Date(),
      }).where(eq(projectsTable.id, projectId));
    }
  }

  const [run] = await db.select().from(runsTable).where(eq(runsTable.id, runId));
  if (run) {
    broadcast("run_completed", runToJson(run));
    const actId = generateId("act");
    await db.insert(activityTable).values({
      id: actId, type: "run_completed",
      message: `Run "${run.projectName}" completed — ${agentKeys.length} agents, ${totalFilesWritten} files written`,
      entityId: run.id, entityType: "run",
    });

    if (projectId) {
      const snapId = generateId("snap");
      const checkpointId = `auto_${runId}_${Date.now()}`;
      await db.insert(snapshotsTable).values({
        id: snapId, projectName: run.projectName, label: `Auto: after run ${run.id.slice(-8)}`,
        checkpointId, sizeBytes: totalFilesWritten * 8192, runId: run.id,
        agentKey: agentKeys[agentKeys.length - 1],
      });
      await db.update(runsTable).set({ snapshotId: snapId }).where(eq(runsTable.id, runId));
      const actId2 = generateId("act");
      await db.insert(activityTable).values({
        id: actId2, type: "snapshot_created",
        message: `Auto-snapshot created after run "${run.projectName}"`,
        entityId: snapId, entityType: "snapshot",
      });

      if (github.isGitHubConfigured()) {
        const [proj] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId));
        if (proj?.githubRepo) {
          try {
            const allFiles = await db.select().from(projectFilesTable)
              .where(eq(projectFilesTable.projectId, projectId));
            const latestFiles = new Map<string, typeof allFiles[0]>();
            for (const f of allFiles) {
              if (!latestFiles.has(f.path) || latestFiles.get(f.path)!.version < f.version) {
                latestFiles.set(f.path, f);
              }
            }
            const fileList = Array.from(latestFiles.values()).map(f => ({ path: f.path, content: f.content }));
            if (fileList.length > 0) {
              const { sha, commitUrl } = await github.pushFiles(
                proj.githubRepo,
                fileList,
                `Checkpoint: run ${runId.slice(-8)} — ${agentKeys.length} agents, ${totalFilesWritten} files`,
              );
              await db.update(projectsTable)
                .set({ githubSha: sha, githubPushedAt: new Date() })
                .where(eq(projectsTable.id, projectId));
              broadcast("github_push", { projectId, sha, commitUrl, filesCount: fileList.length });
            }
          } catch (err) {
            console.error("[github] Auto-push failed:", err);
          }
        }
      }
    }
  }
}

router.get("/", async (req, res) => {
  const { status, projectId, limit } = req.query as { status?: string; projectId?: string; limit?: string };
  let runs = await db.select().from(runsTable).orderBy(desc(runsTable.createdAt)).limit(Number(limit ?? 100));
  if (status) runs = runs.filter(r => r.status === status);
  if (projectId) runs = runs.filter(r => r.projectId === projectId);
  res.json(runs.map(runToJson));
});

router.post("/", async (req, res) => {
  const { projectName, prompt, agentKeys, parallelCount, ollamaUrl, projectId: inputProjectId } = req.body as {
    projectName: string; prompt: string; agentKeys: string[];
    parallelCount?: number; ollamaUrl?: string; projectId?: string;
  };
  if (!projectName || !prompt || !agentKeys?.length)
    return res.status(400).json({ error: "projectName, prompt and agentKeys are required" });

  let resolvedProjectId: string | null = inputProjectId ?? null;
  if (!resolvedProjectId) {
    const [existing] = await db.select().from(projectsTable).where(eq(projectsTable.name, projectName));
    resolvedProjectId = existing?.id ?? null;
  }

  const id = generateId("run");
  const pc = parallelCount ?? Math.min(agentKeys.length, 10);
  const [run] = await db.insert(runsTable).values({
    id, projectId: resolvedProjectId, projectName, prompt, agentKeys,
    parallelCount: pc, ollamaUrl, status: "running",
  }).returning();

  const actId = generateId("act");
  await db.insert(activityTable).values({
    id: actId, type: "run_started",
    message: `Run "${projectName}" started — ${agentKeys.length} agents, ${pc} parallel`,
    entityId: run.id, entityType: "run",
  });
  broadcast("run_started", runToJson(run));

  simulateAgentRun(run.id, resolvedProjectId, agentKeys, projectName, prompt).catch(async (err) => {
    await db.update(runsTable).set({ status: "failed", completedAt: new Date() }).where(eq(runsTable.id, run.id));
    broadcast("run_failed", { runId: run.id, error: String(err) });
  });

  res.status(201).json(runToJson(run));
});

router.get("/:runId", async (req, res) => {
  const { runId } = req.params as { runId: string };
  const [run] = await db.select().from(runsTable).where(eq(runsTable.id, runId));
  if (!run) return res.status(404).json({ error: "Run not found" });
  const logs = await db.select().from(runLogsTable).where(eq(runLogsTable.runId, runId)).orderBy(runLogsTable.createdAt);
  res.json({ ...runToJson(run), logs: logs.map(logToJson) });
});

router.delete("/:runId", async (req, res) => {
  const { runId } = req.params as { runId: string };
  const [run] = await db.update(runsTable)
    .set({ status: "cancelled", completedAt: new Date() })
    .where(eq(runsTable.id, runId))
    .returning();
  if (!run) return res.status(404).json({ error: "Run not found" });
  broadcast("run_cancelled", runToJson(run));
  res.json(runToJson(run));
});

export default router;
