import { Router } from "express";
import { db } from "@workspace/db";
import { agentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod/v4";
import { CreateAgentBody, UpdateAgentBody, GetAgentParams, UpdateAgentParams, DeleteAgentParams } from "@workspace/api-zod";
import { generateId } from "../lib/id.js";
import { broadcast } from "../lib/broadcast.js";

const router = Router();

router.get("/", async (_req, res) => {
  const agents = await db.select().from(agentsTable).orderBy(agentsTable.createdAt);
  res.json(agents.map(a => ({
    id: a.id, key: a.key, role: a.role, modelName: a.modelName,
    temperature: a.temperature, description: a.description,
    maxRetries: a.maxRetries, createdAt: a.createdAt.toISOString(),
  })));
});

router.post("/", async (req, res) => {
  const body = CreateAgentBody.parse(req.body);
  const id = generateId("agent");
  const [agent] = await db.insert(agentsTable).values({ id, ...body }).returning();
  broadcast("agent_created", { agentId: agent.id, key: agent.key });
  res.status(201).json({
    id: agent.id, key: agent.key, role: agent.role, modelName: agent.modelName,
    temperature: agent.temperature, description: agent.description,
    maxRetries: agent.maxRetries, createdAt: agent.createdAt.toISOString(),
  });
});

router.get("/:agentId", async (req, res) => {
  const { agentId } = GetAgentParams.parse(req.params);
  const [agent] = await db.select().from(agentsTable).where(eq(agentsTable.id, agentId));
  if (!agent) return res.status(404).json({ error: "Agent not found" });
  res.json({
    id: agent.id, key: agent.key, role: agent.role, modelName: agent.modelName,
    temperature: agent.temperature, description: agent.description,
    maxRetries: agent.maxRetries, createdAt: agent.createdAt.toISOString(),
  });
});

router.put("/:agentId", async (req, res) => {
  const { agentId } = UpdateAgentParams.parse(req.params);
  const body = UpdateAgentBody.parse(req.body);
  const [agent] = await db.update(agentsTable).set(body).where(eq(agentsTable.id, agentId)).returning();
  if (!agent) return res.status(404).json({ error: "Agent not found" });
  broadcast("agent_updated", { agentId: agent.id, key: agent.key });
  res.json({
    id: agent.id, key: agent.key, role: agent.role, modelName: agent.modelName,
    temperature: agent.temperature, description: agent.description,
    maxRetries: agent.maxRetries, createdAt: agent.createdAt.toISOString(),
  });
});

router.delete("/:agentId", async (req, res) => {
  const { agentId } = DeleteAgentParams.parse(req.params);
  await db.delete(agentsTable).where(eq(agentsTable.id, agentId));
  res.status(204).send();
});

export default router;
