import { pgTable, text, integer, real, timestamp, jsonb, index, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const agentsTable = pgTable("agents", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  role: text("role").notNull(),
  modelName: text("model_name").notNull(),
  temperature: real("temperature").notNull().default(0.2),
  description: text("description").notNull(),
  maxRetries: integer("max_retries").notNull().default(3),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export const insertAgentSchema = createInsertSchema(agentsTable).omit({ createdAt: true });
export type InsertAgent = z.infer<typeof insertAgentSchema>;
export type Agent = typeof agentsTable.$inferSelect;

export const projectsTable = pgTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description").notNull().default(""),
  status: text("status").notNull().default("initialized"),
  stack: text("stack"),
  memory: jsonb("memory").notNull().default({ facts: [], summary: "", lastUpdated: "" }).$type<{
    facts: Array<{ key: string; value: string; source: string; createdAt: string }>;
    summary: string;
    lastUpdated: string;
  }>(),
  totalRuns: integer("total_runs").notNull().default(0),
  totalFiles: integer("total_files").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
export const insertProjectSchema = createInsertSchema(projectsTable).omit({ createdAt: true, updatedAt: true });
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projectsTable.$inferSelect;

export const projectFilesTable = pgTable("project_files", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  runId: text("run_id").notNull(),
  agentKey: text("agent_key").notNull(),
  path: text("path").notNull(),
  content: text("content").notNull(),
  language: text("language").notNull().default("text"),
  operation: text("operation").notNull().default("create"),
  version: integer("version").notNull().default(1),
  sizeBytes: integer("size_bytes").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [index("pf_project_idx").on(t.projectId), index("pf_path_idx").on(t.projectId, t.path)]);
export const insertProjectFileSchema = createInsertSchema(projectFilesTable).omit({ createdAt: true });
export type InsertProjectFile = z.infer<typeof insertProjectFileSchema>;
export type ProjectFile = typeof projectFilesTable.$inferSelect;

export const runsTable = pgTable("runs", {
  id: text("id").primaryKey(),
  projectId: text("project_id"),
  projectName: text("project_name").notNull(),
  prompt: text("prompt").notNull(),
  status: text("status").notNull().default("queued"),
  agentKeys: jsonb("agent_keys").notNull().$type<string[]>(),
  parallelCount: integer("parallel_count").notNull().default(1),
  snapshotId: text("snapshot_id"),
  ollamaUrl: text("ollama_url"),
  filesWritten: integer("files_written").notNull().default(0),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [index("runs_project_idx").on(t.projectId)]);
export const insertRunSchema = createInsertSchema(runsTable).omit({ createdAt: true, completedAt: true });
export type InsertRun = z.infer<typeof insertRunSchema>;
export type Run = typeof runsTable.$inferSelect;

export const runLogsTable = pgTable("run_logs", {
  id: text("id").primaryKey(),
  runId: text("run_id").notNull(),
  agentKey: text("agent_key").notNull(),
  level: text("level").notNull().default("info"),
  message: text("message").notNull(),
  thinkTrace: text("think_trace"),
  filePath: text("file_path"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [index("rl_run_idx").on(t.runId)]);
export const insertRunLogSchema = createInsertSchema(runLogsTable).omit({ createdAt: true });
export type InsertRunLog = z.infer<typeof insertRunLogSchema>;
export type RunLog = typeof runLogsTable.$inferSelect;

export const snapshotsTable = pgTable("snapshots", {
  id: text("id").primaryKey(),
  projectName: text("project_name").notNull(),
  label: text("label").notNull(),
  checkpointId: text("checkpoint_id").notNull(),
  sizeBytes: integer("size_bytes").notNull().default(0),
  runId: text("run_id"),
  agentKey: text("agent_key"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export const insertSnapshotSchema = createInsertSchema(snapshotsTable).omit({ createdAt: true });
export type InsertSnapshot = z.infer<typeof insertSnapshotSchema>;
export type Snapshot = typeof snapshotsTable.$inferSelect;

export const activityTable = pgTable("activity", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  message: text("message").notNull(),
  entityId: text("entity_id").notNull(),
  entityType: text("entity_type").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export const insertActivitySchema = createInsertSchema(activityTable).omit({ createdAt: true });
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Activity = typeof activityTable.$inferSelect;

export type ModelSource = {
  id: string;
  type: "ollama" | "openai" | "anthropic" | "custom";
  label: string;
  url: string;
  apiKey?: string;
  isDefault: boolean;
  models?: string[];
};

export const modelConfigsTable = pgTable("model_configs", {
  id: text("id").primaryKey(),
  name: text("name").notNull().default("default"),
  mode: text("mode").notNull().default("global"),
  globalModel: text("global_model").notNull().default("qwen2.5-coder:7b"),
  agentOverrides: jsonb("agent_overrides").notNull().$type<Record<string, string>>().default({}),
  sources: jsonb("sources").notNull().$type<ModelSource[]>().default([]),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
export const insertModelConfigSchema = createInsertSchema(modelConfigsTable).omit({ createdAt: true, updatedAt: true });
export type InsertModelConfig = z.infer<typeof insertModelConfigSchema>;
export type ModelConfig = typeof modelConfigsTable.$inferSelect;

export const cliHistoryTable = pgTable("cli_history", {
  id: text("id").primaryKey(),
  projectId: text("project_id"),
  command: text("command").notNull(),
  output: text("output").notNull(),
  exitCode: integer("exit_code").notNull().default(0),
  durationMs: integer("duration_ms").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [index("cli_project_idx").on(t.projectId)]);
export const insertCliHistorySchema = createInsertSchema(cliHistoryTable).omit({ createdAt: true });
export type InsertCliHistory = z.infer<typeof insertCliHistorySchema>;
export type CliHistory = typeof cliHistoryTable.$inferSelect;
