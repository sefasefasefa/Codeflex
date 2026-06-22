import { pgTable, text, serial, integer, real, timestamp, jsonb } from "drizzle-orm/pg-core";
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

export const runsTable = pgTable("runs", {
  id: text("id").primaryKey(),
  projectName: text("project_name").notNull(),
  prompt: text("prompt").notNull(),
  status: text("status").notNull().default("queued"),
  agentKeys: jsonb("agent_keys").notNull().$type<string[]>(),
  parallelCount: integer("parallel_count").notNull().default(1),
  snapshotId: text("snapshot_id"),
  ollamaUrl: text("ollama_url"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

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
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

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
