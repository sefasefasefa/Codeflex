-- ============================================================
-- SWARM_CTRL — Örnek Veri (Seed)
-- Sistemi ilk kez başlatırken çalıştırın
-- Kullanım: psql -U postgres -d swarm_ctrl -f seed.sql
-- ============================================================

-- ============================================================
-- Agents (7 ajan)
-- ============================================================
INSERT INTO agents (id, key, role, model_name, temperature, description, max_retries) VALUES
('agent_db01',  'database_agent',       'DatabaseExpert',     'qwen2.5-coder:7b',  0.1, 'SQLite/PostgreSQL şema, tablo ve indeks tasarımı. WAL modu, normalized yapı.', 3),
('agent_be01',  'backend_agent',        'BackendDeveloper',   'qwen2.5-coder:32b', 0.2, 'FastAPI/Express asenkron endpoint, router ve DI yapıları inşa eder.', 3),
('agent_fe01',  'frontend_agent',       'FrontendDeveloper',  'qwen2.5-coder:7b',  0.3, 'Modern React/Vue UI bileşenleri ve backend entegrasyon servisleri yazar.', 3),
('agent_d01',   'delta_agent',          'DeltaAnalyzer',      'deepseek-r1:14b',   0.1, 'Kod tabanı ile yeni üretilen kod arasındaki satır farklarını (diff) çıkarır.', 2),
('agent_pd01',  'parallel_diff_agent',  'ParallelDiffEngine', 'qwen2.5-coder:7b',  0.1, 'Büyük dosya değişikliklerini asenkron olarak çakışma yaratmadan uygular.', 3),
('agent_mp01',  'memory_profiler_agent','MemoryProfiler',     'llama3.1:8b',       0.0, 'Python/JS kodundaki bellek sızıntıları ve CPU darboğazlarını analiz eder.', 2),
('agent_rv01',  'reviewer_agent',       'CodeReviewer',       'deepseek-r1:14b',   0.1, 'Kodu acımasızca inceler, güvenlik açıklarını ve mantık hatalarını raporlar.', 3)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Projects (3 örnek proje)
-- ============================================================
INSERT INTO projects (id, name, description, status, stack, memory, total_runs, total_files, created_at, updated_at) VALUES
(
  'proj_auth01',
  'auth-service',
  'JWT tabanlı kimlik doğrulama servisi — register, login, session yönetimi',
  'active',
  'TypeScript + PostgreSQL + Express',
  '{"facts":[
    {"key":"database_agent_last_run","value":"Designed users + sessions schema with proper indexes and cascade deletes.","source":"database_agent","createdAt":"2026-06-20T09:00:00Z"},
    {"key":"database_agent_files","value":"src/db/schema.ts, src/db/migrations/001_initial.sql","source":"database_agent","createdAt":"2026-06-20T09:00:00Z"},
    {"key":"backend_agent_last_run","value":"Built auth routes (register/login), session middleware, and app entry point.","source":"backend_agent","createdAt":"2026-06-20T10:30:00Z"},
    {"key":"backend_agent_files","value":"src/routes/auth.ts, src/middleware/auth.ts, src/app.ts","source":"backend_agent","createdAt":"2026-06-20T10:30:00Z"},
    {"key":"reviewer_agent_last_run","value":"Code review complete. Added rate limiting middleware. 0 critical issues, 2 warnings resolved.","source":"reviewer_agent","createdAt":"2026-06-20T11:00:00Z"},
    {"key":"tech_stack","value":"Express 5, Drizzle ORM, PostgreSQL, bcrypt, JWT sessions","source":"backend_agent","createdAt":"2026-06-20T10:30:00Z"},
    {"key":"auth_pattern","value":"Token stored in sessions table — server-side revocation supported","source":"backend_agent","createdAt":"2026-06-20T10:30:00Z"},
    {"key":"pending_tasks","value":"Add refresh token rotation, password reset flow, email verification","source":"reviewer_agent","createdAt":"2026-06-20T11:00:00Z"}
  ],"summary":"Last run completed (3 agents, 8 files written). Auth service is functional with register/login/session endpoints. Next: add refresh token rotation and email verification.","lastUpdated":"2026-06-20T11:00:00Z"}',
  3, 8,
  NOW() - INTERVAL '5 days',
  NOW() - INTERVAL '1 hour'
),
(
  'proj_dash01',
  'analytics-dashboard',
  'Gerçek zamanlı veri görselleştirme paneli — metrikler, grafikler, raporlar',
  'initialized',
  'React + Vite + Recharts',
  '{"facts":[
    {"key":"project_goal","value":"Real-time analytics dashboard with live metrics, charts, and exportable reports","source":"user","createdAt":"2026-06-22T08:00:00Z"},
    {"key":"data_source","value":"PostgreSQL database with time-series metrics table","source":"user","createdAt":"2026-06-22T08:00:00Z"}
  ],"summary":"Project initialized. Ready to start — run database_agent and frontend_agent to begin.","lastUpdated":"2026-06-22T08:00:00Z"}',
  0, 0,
  NOW() - INTERVAL '2 days',
  NOW() - INTERVAL '2 days'
),
(
  'proj_api01',
  'rest-api-gateway',
  'Mikroservis API Gateway — rate limiting, auth proxy, request routing',
  'paused',
  'Node.js + Express + Redis',
  '{"facts":[
    {"key":"backend_agent_last_run","value":"Built gateway router with auth proxy and rate limiting middleware.","source":"backend_agent","createdAt":"2026-06-18T14:00:00Z"},
    {"key":"backend_agent_files","value":"src/gateway.ts, src/middleware/rateLimit.ts, src/routes/proxy.ts, src/index.ts","source":"backend_agent","createdAt":"2026-06-18T14:00:00Z"},
    {"key":"blocking_issue","value":"Redis connection config needed before continuing","source":"reviewer_agent","createdAt":"2026-06-19T09:00:00Z"},
    {"key":"next_step","value":"Add Redis-backed distributed rate limiting once Redis endpoint is available","source":"reviewer_agent","createdAt":"2026-06-19T09:00:00Z"}
  ],"summary":"Paused: waiting on Redis infrastructure. Core gateway logic is complete. 4 files written by backend_agent.","lastUpdated":"2026-06-19T09:00:00Z"}',
  1, 4,
  NOW() - INTERVAL '7 days',
  NOW() - INTERVAL '3 days'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Runs (2 örnek run)
-- ============================================================
INSERT INTO runs (id, project_id, project_name, prompt, status, agent_keys, parallel_count, snapshot_id, files_written, completed_at, created_at) VALUES
(
  'run_demo01',
  'proj_auth01',
  'auth-service',
  'Bir Express uygulaması için tam backend yaz: auth, kullanıcı yönetimi, JWT token.',
  'completed',
  '["database_agent","backend_agent","reviewer_agent"]',
  3,
  'snap_03',
  8,
  NOW() - INTERVAL '4 days' + INTERVAL '30 minutes',
  NOW() - INTERVAL '4 days'
),
(
  'run_demo02',
  'proj_api01',
  'rest-api-gateway',
  'API Gateway için rate limiting ve auth proxy middleware yaz.',
  'completed',
  '["backend_agent","reviewer_agent"]',
  2,
  NULL,
  4,
  NOW() - INTERVAL '6 days' + INTERVAL '20 minutes',
  NOW() - INTERVAL '6 days'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Run Logs (auth-service çalıştırması için)
-- ============================================================
INSERT INTO run_logs (id, run_id, agent_key, level, message, think_trace, file_path, created_at) VALUES
('log_01', 'run_demo01', 'database_agent', 'info',   'Agent "database_agent" starting — model: qwen2.5-coder:7b', NULL, NULL, NOW() - INTERVAL '4 days' + INTERVAL '1 minute'),
('log_02', 'run_demo01', 'database_agent', 'think',  '[Reasoning] Analyzing prompt. Need to design robust DB schema. PostgreSQL with WAL, normalized tables for users and sessions.', 'Analyzing prompt. Need to design robust DB schema.', NULL, NOW() - INTERVAL '4 days' + INTERVAL '2 minutes'),
('log_03', 'run_demo01', 'database_agent', 'info',   'Writing file: src/db/schema.ts', NULL, NULL, NOW() - INTERVAL '4 days' + INTERVAL '3 minutes'),
('log_04', 'run_demo01', 'database_agent', 'file',   'Created `src/db/schema.ts` (v1, 1.2kb)', NULL, 'src/db/schema.ts', NOW() - INTERVAL '4 days' + INTERVAL '3 minutes' + INTERVAL '10 seconds'),
('log_05', 'run_demo01', 'database_agent', 'info',   'Writing file: src/db/migrations/001_initial.sql', NULL, NULL, NOW() - INTERVAL '4 days' + INTERVAL '4 minutes'),
('log_06', 'run_demo01', 'database_agent', 'file',   'Created `src/db/migrations/001_initial.sql` (v1, 0.9kb)', NULL, 'src/db/migrations/001_initial.sql', NOW() - INTERVAL '4 days' + INTERVAL '4 minutes' + INTERVAL '10 seconds'),
('log_07', 'run_demo01', 'database_agent', 'output', '[Done] Designed users + sessions schema with proper indexes and cascade deletes.', NULL, NULL, NOW() - INTERVAL '4 days' + INTERVAL '5 minutes'),
('log_08', 'run_demo01', 'backend_agent',  'info',   'Agent "backend_agent" starting — model: qwen2.5-coder:32b', NULL, NULL, NOW() - INTERVAL '4 days' + INTERVAL '6 minutes'),
('log_09', 'run_demo01', 'backend_agent',  'think',  '[Reasoning] Schema ready. Building FastAPI/Express async endpoints. JWT middleware wraps all protected routes.', 'Schema ready. Building async endpoints pattern.', NULL, NOW() - INTERVAL '4 days' + INTERVAL '7 minutes'),
('log_10', 'run_demo01', 'backend_agent',  'info',   'Writing file: src/routes/auth.ts', NULL, NULL, NOW() - INTERVAL '4 days' + INTERVAL '8 minutes'),
('log_11', 'run_demo01', 'backend_agent',  'file',   'Created `src/routes/auth.ts` (v1, 1.8kb)', NULL, 'src/routes/auth.ts', NOW() - INTERVAL '4 days' + INTERVAL '8 minutes' + INTERVAL '15 seconds'),
('log_12', 'run_demo01', 'backend_agent',  'info',   'Writing file: src/middleware/auth.ts', NULL, NULL, NOW() - INTERVAL '4 days' + INTERVAL '9 minutes'),
('log_13', 'run_demo01', 'backend_agent',  'file',   'Created `src/middleware/auth.ts` (v1, 0.7kb)', NULL, 'src/middleware/auth.ts', NOW() - INTERVAL '4 days' + INTERVAL '9 minutes' + INTERVAL '10 seconds'),
('log_14', 'run_demo01', 'backend_agent',  'info',   'Writing file: src/app.ts', NULL, NULL, NOW() - INTERVAL '4 days' + INTERVAL '10 minutes'),
('log_15', 'run_demo01', 'backend_agent',  'file',   'Created `src/app.ts` (v1, 0.5kb)', NULL, 'src/app.ts', NOW() - INTERVAL '4 days' + INTERVAL '10 minutes' + INTERVAL '8 seconds'),
('log_16', 'run_demo01', 'backend_agent',  'output', '[Done] Built auth routes (register/login), session middleware, and app entry point.', NULL, NULL, NOW() - INTERVAL '4 days' + INTERVAL '11 minutes'),
('log_17', 'run_demo01', 'reviewer_agent', 'info',   'Agent "reviewer_agent" starting — model: deepseek-r1:14b', NULL, NULL, NOW() - INTERVAL '4 days' + INTERVAL '12 minutes'),
('log_18', 'run_demo01', 'reviewer_agent', 'think',  '[Reasoning] Reviewing all generated code. Checking: SQL injection, unvalidated inputs, missing rate limiting on auth endpoints.', 'Reviewing all generated code for vulnerabilities.', NULL, NOW() - INTERVAL '4 days' + INTERVAL '13 minutes'),
('log_19', 'run_demo01', 'reviewer_agent', 'warn',   'sessions.expires_at index eksik — sorgu yavaşlatabilir', NULL, NULL, NOW() - INTERVAL '4 days' + INTERVAL '14 minutes'),
('log_20', 'run_demo01', 'reviewer_agent', 'info',   'Writing file: src/middleware/rateLimit.ts', NULL, NULL, NOW() - INTERVAL '4 days' + INTERVAL '14 minutes' + INTERVAL '30 seconds'),
('log_21', 'run_demo01', 'reviewer_agent', 'file',   'Created `src/middleware/rateLimit.ts` (v1, 0.9kb)', NULL, 'src/middleware/rateLimit.ts', NOW() - INTERVAL '4 days' + INTERVAL '15 minutes'),
('log_22', 'run_demo01', 'reviewer_agent', 'file',   'Created `REVIEW.md` (v1, 0.4kb)', NULL, 'REVIEW.md', NOW() - INTERVAL '4 days' + INTERVAL '16 minutes'),
('log_23', 'run_demo01', 'reviewer_agent', 'output', '[Done] Code review complete. Added rate limiting middleware. 0 critical issues, 2 warnings resolved.', NULL, NULL, NOW() - INTERVAL '4 days' + INTERVAL '17 minutes')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Project Files (auth-service — 8 ajan dosyası)
-- ============================================================
INSERT INTO project_files (id, project_id, run_id, agent_key, path, content, language, operation, version, size_bytes, created_at) VALUES
(
  'pf_01', 'proj_auth01', 'run_demo01', 'database_agent',
  'src/db/schema.ts',
  E'import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";\n\nexport const usersTable = pgTable("users", {\n  id: text("id").primaryKey(),\n  email: text("email").notNull().unique(),\n  passwordHash: text("password_hash").notNull(),\n  name: text("name").notNull(),\n  createdAt: timestamp("created_at").defaultNow().notNull(),\n  updatedAt: timestamp("updated_at").defaultNow().notNull(),\n}, (t) => [index("users_email_idx").on(t.email)]);\n\nexport const sessionsTable = pgTable("sessions", {\n  id: text("id").primaryKey(),\n  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),\n  token: text("token").notNull().unique(),\n  expiresAt: timestamp("expires_at").notNull(),\n  createdAt: timestamp("created_at").defaultNow().notNull(),\n}, (t) => [\n  index("sessions_user_idx").on(t.userId),\n  index("sessions_token_idx").on(t.token),\n]);',
  'typescript', 'create', 1, 680,
  NOW() - INTERVAL '4 days' + INTERVAL '3 minutes'
),
(
  'pf_02', 'proj_auth01', 'run_demo01', 'database_agent',
  'src/db/migrations/001_initial.sql',
  E'-- Initial schema migration\nCREATE TABLE IF NOT EXISTS users (\n  id TEXT PRIMARY KEY,\n  email TEXT NOT NULL UNIQUE,\n  password_hash TEXT NOT NULL,\n  name TEXT NOT NULL,\n  created_at TIMESTAMPTZ DEFAULT NOW(),\n  updated_at TIMESTAMPTZ DEFAULT NOW()\n);\n\nCREATE INDEX IF NOT EXISTS users_email_idx ON users(email);\n\nCREATE TABLE IF NOT EXISTS sessions (\n  id TEXT PRIMARY KEY,\n  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,\n  token TEXT NOT NULL UNIQUE,\n  expires_at TIMESTAMPTZ NOT NULL,\n  created_at TIMESTAMPTZ DEFAULT NOW()\n);\n\nCREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);\nCREATE INDEX IF NOT EXISTS sessions_token_idx ON sessions(token);\nCREATE INDEX IF NOT EXISTS sessions_expires_idx ON sessions(expires_at);',
  'sql', 'create', 1, 590,
  NOW() - INTERVAL '4 days' + INTERVAL '4 minutes'
),
(
  'pf_03', 'proj_auth01', 'run_demo01', 'backend_agent',
  'src/routes/auth.ts',
  E'import { Router } from "express";\nimport { z } from "zod";\nimport bcrypt from "bcrypt";\nimport { db } from "../db/index.js";\nimport { usersTable, sessionsTable } from "../db/schema.js";\nimport { generateId } from "../lib/id.js";\nimport { eq } from "drizzle-orm";\n\nconst router = Router();\n\nconst RegisterBody = z.object({\n  email: z.string().email(),\n  password: z.string().min(8),\n  name: z.string().min(1),\n});\n\nrouter.post("/register", async (req, res) => {\n  const body = RegisterBody.parse(req.body);\n  const passwordHash = await bcrypt.hash(body.password, 12);\n  const id = generateId("usr");\n  const [user] = await db.insert(usersTable)\n    .values({ id, email: body.email, passwordHash, name: body.name })\n    .returning();\n  res.status(201).json({ id: user.id, email: user.email, name: user.name });\n});\n\nrouter.post("/login", async (req, res) => {\n  const { email, password } = req.body as { email: string; password: string };\n  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));\n  if (!user || !(await bcrypt.compare(password, user.passwordHash)))\n    return res.status(401).json({ error: "Invalid credentials" });\n  const token = generateId("tok");\n  const sessionId = generateId("sess");\n  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);\n  await db.insert(sessionsTable).values({ id: sessionId, userId: user.id, token, expiresAt });\n  res.json({ token, expiresAt: expiresAt.toISOString() });\n});\n\nrouter.post("/logout", async (req, res) => {\n  const token = req.headers.authorization?.replace("Bearer ", "");\n  if (token) {\n    await db.delete(sessionsTable).where(eq(sessionsTable.token, token));\n  }\n  res.status(204).send();\n});\n\nexport default router;',
  'typescript', 'create', 1, 1240,
  NOW() - INTERVAL '4 days' + INTERVAL '8 minutes'
),
(
  'pf_04', 'proj_auth01', 'run_demo01', 'backend_agent',
  'src/middleware/auth.ts',
  E'import { Request, Response, NextFunction } from "express";\nimport { db } from "../db/index.js";\nimport { sessionsTable, usersTable } from "../db/schema.js";\nimport { eq, and, gt } from "drizzle-orm";\n\nexport async function requireAuth(req: Request, res: Response, next: NextFunction) {\n  const token = req.headers.authorization?.replace("Bearer ", "");\n  if (!token) return res.status(401).json({ error: "Unauthorized" });\n\n  const [session] = await db.select().from(sessionsTable)\n    .where(and(eq(sessionsTable.token, token), gt(sessionsTable.expiresAt, new Date())));\n  if (!session) return res.status(401).json({ error: "Session expired or invalid" });\n\n  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId));\n  if (!user) return res.status(401).json({ error: "User not found" });\n\n  (req as any).user = user;\n  next();\n}',
  'typescript', 'create', 1, 670,
  NOW() - INTERVAL '4 days' + INTERVAL '9 minutes'
),
(
  'pf_05', 'proj_auth01', 'run_demo01', 'reviewer_agent',
  'src/middleware/rateLimit.ts',
  E'const counts = new Map<string, { count: number; resetAt: number }>();\n\n// Cleanup expired entries every minute to prevent memory leak\nsetInterval(() => {\n  const now = Date.now();\n  for (const [key, val] of counts.entries()) {\n    if (now > val.resetAt) counts.delete(key);\n  }\n}, 60_000);\n\nexport function rateLimit(maxReq: number, windowMs: number) {\n  return (req: any, res: any, next: any) => {\n    const key = req.ip ?? "unknown";\n    const now = Date.now();\n    const entry = counts.get(key);\n    if (!entry || now > entry.resetAt) {\n      counts.set(key, { count: 1, resetAt: now + windowMs });\n      return next();\n    }\n    if (entry.count >= maxReq) {\n      return res.status(429).json({ error: "Too many requests. Try again later." });\n    }\n    entry.count++;\n    next();\n  };\n}\n\n// Kullanım: router.post("/login", rateLimit(5, 60_000), loginHandler)',
  'typescript', 'create', 1, 780,
  NOW() - INTERVAL '4 days' + INTERVAL '15 minutes'
),
(
  'pf_06', 'proj_auth01', 'run_demo01', 'backend_agent',
  'src/app.ts',
  E'import express from "express";\nimport cors from "cors";\nimport authRouter from "./routes/auth.js";\nimport { requireAuth } from "./middleware/auth.js";\n\nconst app = express();\napp.use(cors());\napp.use(express.json());\n\napp.use("/auth", authRouter);\napp.get("/me", requireAuth, (req: any, res) => {\n  res.json({ user: req.user });\n});\n\napp.use((err: any, _req: any, res: any, _next: any) => {\n  console.error(err);\n  res.status(err.status ?? 500).json({ error: err.message ?? "Internal Server Error" });\n});\n\nexport default app;',
  'typescript', 'create', 1, 420,
  NOW() - INTERVAL '4 days' + INTERVAL '10 minutes'
),
(
  'pf_07', 'proj_auth01', 'run_demo01', 'parallel_diff_agent',
  'src/index.ts',
  E'import app from "./app.js";\nimport { createServer } from "http";\n\nconst port = Number(process.env.PORT ?? 3000);\nconst server = createServer(app);\n\nserver.listen(port, () => {\n  console.log(`[auth-service] Server listening on port ${port}`);\n});\n\nprocess.on("SIGTERM", () => {\n  server.close(() => {\n    console.log("[auth-service] Graceful shutdown complete");\n    process.exit(0);\n  });\n});',
  'typescript', 'create', 1, 310,
  NOW() - INTERVAL '4 days' + INTERVAL '18 minutes'
),
(
  'pf_08', 'proj_auth01', 'run_demo01', 'reviewer_agent',
  'REVIEW.md',
  E'# Code Review Report\n\n## Reviewer: reviewer_agent (deepseek-r1:14b)\n\n### Summary\nReviewed auth routes, middleware, and schema. Score: **8/10**.\n\n### Issues Found\n\n| Severity | File | Issue | Status |\n|----------|------|-------|--------|\n| WARN | src/db/schema.ts | sessions.expires_at missing index | Fixed in migration |\n| INFO | src/routes/auth.ts | No rate limiting on /login | Fixed: rateLimit middleware added |\n| INFO | src/middleware/rateLimit.ts | Unbounded Map growth | Fixed: cleanup interval added |\n\n### Security Checklist\n- [x] Password hashing: bcrypt with 12 rounds\n- [x] SQL injection: Parameterized queries via Drizzle ORM\n- [x] Session invalidation: Server-side token storage\n- [x] Rate limiting: 5 req/min on auth endpoints\n- [ ] CSRF protection: N/A for API-only service\n- [ ] Refresh token rotation: Pending\n\n### Recommended Next Steps\n1. Add refresh token rotation\n2. Implement password reset flow\n3. Add email verification\n4. Set up audit logging',
  'markdown', 'create', 1, 720,
  NOW() - INTERVAL '4 days' + INTERVAL '16 minutes'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Snapshots (3 örnek snapshot)
-- ============================================================
INSERT INTO snapshots (id, project_name, label, checkpoint_id, size_bytes, run_id, agent_key, created_at) VALUES
('snap_01', 'auth-service',   'Initial scaffold',            'v_init_20260101_120000',              102400,  NULL,        NULL,             NOW() - INTERVAL '5 days'),
('snap_02', 'auth-service',   'After database_agent run',    'v_database_agent_20260620_090000',    348160,  'run_demo01', 'database_agent', NOW() - INTERVAL '4 days' + INTERVAL '5 minutes'),
('snap_03', 'auth-service',   'After backend_agent run',     'v_backend_agent_20260620_103000',    1048576, 'run_demo01', 'backend_agent',  NOW() - INTERVAL '4 days' + INTERVAL '11 minutes')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Activity
-- ============================================================
INSERT INTO activity (id, type, message, entity_id, entity_type, created_at) VALUES
('act_01', 'agent_created',       '7 ajan tanımı sisteme yüklendi',                           'agent_db01',  'agent',   NOW() - INTERVAL '5 days'),
('act_02', 'project_created',     'Proje "auth-service" oluşturuldu',                         'proj_auth01', 'project', NOW() - INTERVAL '5 days' + INTERVAL '1 hour'),
('act_03', 'project_created',     'Proje "rest-api-gateway" oluşturuldu',                     'proj_api01',  'project', NOW() - INTERVAL '7 days'),
('act_04', 'project_created',     'Proje "analytics-dashboard" oluşturuldu',                  'proj_dash01', 'project', NOW() - INTERVAL '2 days'),
('act_05', 'run_started',         'Run "auth-service" başlatıldı — 3 ajan, 3 paralel',        'run_demo01',  'run',     NOW() - INTERVAL '4 days'),
('act_06', 'snapshot_created',    'Snapshot "After database_agent run" oluşturuldu',          'snap_02',     'snapshot',NOW() - INTERVAL '4 days' + INTERVAL '5 minutes'),
('act_07', 'snapshot_created',    'Snapshot "After backend_agent run" oluşturuldu',           'snap_03',     'snapshot',NOW() - INTERVAL '4 days' + INTERVAL '11 minutes'),
('act_08', 'run_completed',       'Run "auth-service" başarıyla tamamlandı (3 ajan, 8 dosya)','run_demo01',  'run',     NOW() - INTERVAL '4 days' + INTERVAL '17 minutes'),
('act_09', 'run_started',         'Run "rest-api-gateway" başlatıldı — 2 ajan',               'run_demo02',  'run',     NOW() - INTERVAL '6 days'),
('act_10', 'run_completed',       'Run "rest-api-gateway" başarıyla tamamlandı (4 dosya)',    'run_demo02',  'run',     NOW() - INTERVAL '6 days' + INTERVAL '20 minutes')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- CLI History
-- ============================================================
INSERT INTO cli_history (id, project_id, command, output, exit_code, duration_ms, created_at) VALUES
(
  'cli_01', 'proj_auth01', 'status',
  E'┌─ SWARM_CTRL System Status ─────────────────┐\n│  Agents     : 7                             │\n│  Projects   : 3                             │\n│  Active Runs: 0                             │\n│  Completed  : 2                             │\n│  Total Runs : 2                             │\n└────────────────────────────────────────────┘',
  0, 12, NOW() - INTERVAL '3 days'
),
(
  'cli_02', 'proj_auth01', 'list projects',
  E'ID                 NAME                     STATUS      RUNS  FILES\n  proj_auth01       auth-service             active      3     8\n  proj_dash01       analytics-dashboard      initialized 0     0\n  proj_api01        rest-api-gateway         paused      1     4',
  0, 8, NOW() - INTERVAL '3 days' + INTERVAL '1 minute'
),
(
  'cli_03', 'proj_auth01', 'memory auth-service',
  E'Project Memory: auth-service\nSummary: Last run completed (3 agents, 8 files written).\nLast Updated: 2026-06-20T11:00:00Z\n\nFacts:\n  [database_agent] database_agent_last_run: Designed users + sessions schema\n  [backend_agent] tech_stack: Express 5, Drizzle ORM, PostgreSQL, bcrypt\n  [backend_agent] auth_pattern: Token stored in sessions table, not JWT\n  [reviewer_agent] pending_tasks: Add refresh token rotation, password reset flow',
  0, 6, NOW() - INTERVAL '3 days' + INTERVAL '2 minutes'
)
ON CONFLICT (id) DO NOTHING;
