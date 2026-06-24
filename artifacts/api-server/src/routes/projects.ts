import { Router } from "express";
import { db } from "@workspace/db";
import { projectsTable, runsTable, projectFilesTable, activityTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { generateId } from "../lib/id.js";
import { broadcast } from "../lib/broadcast.js";
import * as github from "../lib/github.js";

const router = Router();

function projectToJson(p: typeof projectsTable.$inferSelect) {
  return {
    id: p.id, name: p.name, description: p.description,
    status: p.status, stack: p.stack ?? null,
    totalRuns: p.totalRuns, totalFiles: p.totalFiles,
    createdAt: p.createdAt.toISOString(), updatedAt: p.updatedAt.toISOString(),
    githubRepo: p.githubRepo ?? null,
    githubUrl: p.githubUrl ?? null,
    githubSha: p.githubSha ?? null,
    githubPushedAt: p.githubPushedAt ? p.githubPushedAt.toISOString() : null,
  };
}

function toGitHubStatus(p: typeof projectsTable.$inferSelect) {
  const owner = github.getOwner();
  return {
    connected: !!p.githubRepo,
    repo: p.githubRepo ?? null,
    url: p.githubUrl ?? null,
    cloneUrl: p.githubRepo ? `https://github.com/${owner}/${p.githubRepo}.git` : null,
    sha: p.githubSha ?? null,
    pushedAt: p.githubPushedAt ? p.githubPushedAt.toISOString() : null,
  };
}

function fileToJson(f: typeof projectFilesTable.$inferSelect) {
  return {
    id: f.id, projectId: f.projectId, path: f.path, language: f.language,
    operation: f.operation, version: f.version, agentKey: f.agentKey,
    runId: f.runId, sizeBytes: f.sizeBytes, createdAt: f.createdAt.toISOString(),
  };
}

router.get("/", async (_req, res) => {
  const projects = await db.select().from(projectsTable).orderBy(desc(projectsTable.updatedAt));
  res.json(projects.map(projectToJson));
});

router.post("/", async (req, res) => {
  const { name, description = "", stack } = req.body as { name: string; description?: string; stack?: string };
  if (!name) { res.status(400).json({ error: "name is required" }); return; }
  const id = generateId("proj");
  const now = new Date().toISOString();
  const memory = { facts: [], summary: `Project "${name}" initialized.`, lastUpdated: now };
  const [proj] = await db.insert(projectsTable).values({ id, name, description, stack, memory }).returning();
  const actId = generateId("act");
  await db.insert(activityTable).values({
    id: actId, type: "project_created",
    message: `Project "${name}" created`,
    entityId: proj.id, entityType: "project",
  });
  broadcast("project_created", projectToJson(proj));
  res.status(201).json(projectToJson(proj));
});

router.get("/:projectId", async (req, res) => {
  const { projectId } = req.params as { projectId: string };
  const [proj] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId));
  if (!proj) { res.status(404).json({ error: "Project not found" }); return; }
  const recentRuns = await db.select().from(runsTable)
    .where(eq(runsTable.projectId, projectId))
    .orderBy(desc(runsTable.createdAt)).limit(10);
  const runToJson = (r: typeof runsTable.$inferSelect) => ({
    id: r.id, projectId: r.projectId ?? null, projectName: r.projectName,
    prompt: r.prompt, status: r.status, agentKeys: r.agentKeys as string[],
    parallelCount: r.parallelCount, snapshotId: r.snapshotId ?? null,
    filesWritten: r.filesWritten,
    completedAt: r.completedAt ? r.completedAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
  });
  res.json({ ...projectToJson(proj), memory: proj.memory, recentRuns: recentRuns.map(runToJson) });
});

router.put("/:projectId", async (req, res) => {
  const { projectId } = req.params as { projectId: string };
  const { name, description, status, stack } = req.body as Record<string, string>;
  const updates: Partial<typeof projectsTable.$inferInsert> = { updatedAt: new Date() };
  if (name) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (status) updates.status = status;
  if (stack !== undefined) updates.stack = stack;
  const [proj] = await db.update(projectsTable).set(updates).where(eq(projectsTable.id, projectId)).returning();
  if (!proj) { res.status(404).json({ error: "Project not found" }); return; }
  broadcast("project_updated", projectToJson(proj));
  res.json(projectToJson(proj));
});

router.delete("/:projectId", async (req, res) => {
  const { projectId } = req.params as { projectId: string };
  await db.delete(projectFilesTable).where(eq(projectFilesTable.projectId, projectId));
  await db.delete(projectsTable).where(eq(projectsTable.id, projectId));
  res.status(204).send();
});

router.patch("/:projectId/memory", async (req, res) => {
  const { projectId } = req.params as { projectId: string };
  const { facts: newFacts = [], summary } = req.body as {
    facts?: Array<{ key: string; value: string; source: string }>;
    summary?: string;
  };
  const [proj] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId));
  if (!proj) { res.status(404).json({ error: "Project not found" }); return; }
  const now = new Date().toISOString();
  const existing = proj.memory as { facts: Array<{ key: string; value: string; source: string; createdAt: string }>; summary: string; lastUpdated: string };
  const merged = [
    ...existing.facts,
    ...newFacts.map(f => ({ ...f, createdAt: now })),
  ];
  const deduped = Object.values(
    merged.reduce((acc, f) => { acc[f.key] = f; return acc; }, {} as Record<string, typeof merged[0]>)
  );
  const updatedMemory = {
    facts: deduped,
    summary: summary ?? existing.summary,
    lastUpdated: now,
  };
  const [updated] = await db.update(projectsTable)
    .set({ memory: updatedMemory, updatedAt: new Date() })
    .where(eq(projectsTable.id, projectId)).returning();
  const actId = generateId("act");
  await db.insert(activityTable).values({
    id: actId, type: "memory_updated",
    message: `Memory updated for "${updated.name}" (+${newFacts.length} facts)`,
    entityId: updated.id, entityType: "project",
  });
  broadcast("memory_updated", { projectId, memory: updatedMemory });
  res.json(updatedMemory);
});

router.get("/:projectId/files", async (req, res) => {
  const { projectId } = req.params as { projectId: string };
  const files = await db.select().from(projectFilesTable)
    .where(eq(projectFilesTable.projectId, projectId))
    .orderBy(projectFilesTable.path, desc(projectFilesTable.version));
  const latest = new Map<string, typeof files[0]>();
  for (const f of files) { if (!latest.has(f.path)) latest.set(f.path, f); }
  res.json(Array.from(latest.values()).map(fileToJson));
});

router.get("/:projectId/files/:fileId", async (req, res) => {
  const { projectId, fileId } = req.params as { projectId: string; fileId: string };
  const [file] = await db.select().from(projectFilesTable)
    .where(and(eq(projectFilesTable.id, fileId), eq(projectFilesTable.projectId, projectId)));
  if (!file) { res.status(404).json({ error: "File not found" }); return; }
  const history = await db.select().from(projectFilesTable)
    .where(and(eq(projectFilesTable.projectId, projectId), eq(projectFilesTable.path, file.path)))
    .orderBy(desc(projectFilesTable.version));
  res.json({
    ...fileToJson(file),
    content: file.content,
    history: history.map(h => ({
      version: h.version, content: h.content, agentKey: h.agentKey,
      runId: h.runId, operation: h.operation, createdAt: h.createdAt.toISOString(),
    })),
  });
});

router.post("/import-github", async (req, res) => {
  const { repoUrl } = req.body as { repoUrl?: string };
  if (!repoUrl) { res.status(400).json({ error: "repoUrl is required" }); return; }

  let imported;
  try {
    imported = await github.importRepoFiles(repoUrl);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "GitHub import başarısız oldu";
    res.status(400).json({ error: msg }); return;
  }

  const { name, description, files } = imported;

  const baseName = name.toLowerCase().replace(/[^a-z0-9-_]/g, "-");
  let uniqueName = baseName;
  let attempt = 0;
  while (true) {
    const existing = await db.select({ id: projectsTable.id }).from(projectsTable).where(eq(projectsTable.name, uniqueName));
    if (!existing.length) break;
    attempt++;
    uniqueName = `${baseName}-${attempt}`;
  }

  const id = generateId("proj");
  const now = new Date().toISOString();
  const memory = { facts: [], summary: `Imported from GitHub: ${repoUrl}`, lastUpdated: now };
  const [proj] = await db.insert(projectsTable).values({
    id,
    name: uniqueName,
    description,
    status: "active",
    memory,
    totalFiles: files.length,
  }).returning();

  if (files.length > 0) {
    const importRunId = generateId("run");
    const fileRows = files.map((f, i) => ({
      id: generateId("pf"),
      projectId: proj.id,
      runId: importRunId,
      agentKey: "github-import",
      path: f.path,
      content: f.content,
      language: f.language,
      operation: "create",
      version: 1,
      sizeBytes: f.sizeBytes,
    }));

    const BATCH = 20;
    for (let i = 0; i < fileRows.length; i += BATCH) {
      await db.insert(projectFilesTable).values(fileRows.slice(i, i + BATCH));
    }
  }

  const actId = generateId("act");
  await db.insert(activityTable).values({
    id: actId,
    type: "project_created",
    message: `Project "${uniqueName}" imported from GitHub (${files.length} files)`,
    entityId: proj.id,
    entityType: "project",
  });

  broadcast("project_created", projectToJson(proj));
  res.status(201).json({ ...projectToJson(proj), filesImported: files.length });
});

router.get("/:projectId/github", async (req, res) => {
  const { projectId } = req.params as { projectId: string };
  const [proj] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId));
  if (!proj) { res.status(404).json({ error: "Project not found" }); return; }
  res.json(toGitHubStatus(proj));
});

router.post("/:projectId/github/init", async (req, res) => {
  const { projectId } = req.params as { projectId: string };
  if (!github.isGitHubConfigured()) {
    res.status(400).json({ error: "GitHub not configured. Set GITHUB_TOKEN and GITHUB_OWNER." }); return;
  }
  const [proj] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId));
  if (!proj) { res.status(404).json({ error: "Project not found" }); return; }

  const repoName = proj.id.replace(/_/g, "-");

  let repoInfo = await github.getRepo(repoName);
  if (!repoInfo) {
    repoInfo = await github.createRepo(repoName, `${proj.name} — Swarm Agent Project`);
  }

  const [updated] = await db.update(projectsTable)
    .set({ githubRepo: repoName, githubUrl: repoInfo.html_url, updatedAt: new Date() })
    .where(eq(projectsTable.id, projectId))
    .returning();

  broadcast("project_updated", projectToJson(updated));
  res.json(toGitHubStatus(updated));
});

router.post("/:projectId/github/push", async (req, res) => {
  const { projectId } = req.params as { projectId: string };
  if (!github.isGitHubConfigured()) {
    res.status(400).json({ error: "GitHub not configured. Set GITHUB_TOKEN and GITHUB_OWNER." }); return;
  }
  const [proj] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId));
  if (!proj) { res.status(404).json({ error: "Project not found" }); return; }
  if (!proj.githubRepo) {
    res.status(400).json({ error: "GitHub repo not initialized. Call /github/init first." }); return;
  }

  const allFiles = await db.select().from(projectFilesTable)
    .where(eq(projectFilesTable.projectId, projectId))
    .orderBy(desc(projectFilesTable.version));

  const latestFiles = new Map<string, typeof allFiles[0]>();
  for (const f of allFiles) {
    if (!latestFiles.has(f.path)) latestFiles.set(f.path, f);
  }

  const fileList = Array.from(latestFiles.values()).map(f => ({ path: f.path, content: f.content }));
  if (!fileList.length) {
    res.status(400).json({ error: "No files to push. Run an agent first." }); return;
  }

  const now = new Date().toISOString();
  const message = `Checkpoint ${now.slice(0, 19).replace("T", " ")} — ${fileList.length} files`;
  const { sha, commitUrl } = await github.pushFiles(proj.githubRepo, fileList, message);

  const [updated] = await db.update(projectsTable)
    .set({ githubSha: sha, githubPushedAt: new Date(), updatedAt: new Date() })
    .where(eq(projectsTable.id, projectId))
    .returning();

  broadcast("github_push", { projectId, sha, commitUrl, filesCount: fileList.length });

  res.json({ sha, commitUrl, filesCount: fileList.length });
});

export default router;
