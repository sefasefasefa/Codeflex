import { Router } from "express";
import { db } from "@workspace/db";
import { cliHistoryTable, projectsTable, runsTable, agentsTable, projectFilesTable, conversationsTable } from "@workspace/db";
import type { ChatMessage } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import { generateId } from "../lib/id.js";
import { broadcast } from "../lib/broadcast.js";
import { chat as llmChat, agentChat } from "../lib/llm.js";

const router = Router();

type CmdContext = {
  projectId?: string | null;
  project?: typeof projectsTable.$inferSelect | null;
};

async function resolveContext(projectId?: string, projectName?: string): Promise<CmdContext> {
  if (projectId) {
    const [p] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId));
    return { projectId: p?.id ?? null, project: p ?? null };
  }
  if (projectName) {
    const [p] = await db.select().from(projectsTable).where(eq(projectsTable.name, projectName));
    return { projectId: p?.id ?? null, project: p ?? null };
  }
  return { projectId: null, project: null };
}

async function handleCommand(command: string, ctx: CmdContext): Promise<{ output: string; exitCode: number }> {
  const parts = command.trim().split(/\s+/);
  const cmd = parts[0]?.toLowerCase() ?? "";
  const args = parts.slice(1);

  if (cmd === "help") {
    return {
      output: [
        "Swarm Agent CLI — Available Commands:",
        "",
        "  help                          Show this help",
        "  status                        System overview (agents, projects, runs)",
        "  list projects                 List all projects",
        "  list agents                   List all agents",
        "  list runs [projectName]       List recent runs",
        "  list files [projectName]      List files written by agents",
        "  memory [projectName]          Show project memory context",
        "  show <projectName>            Show project details",
        "  run <projectName> <prompt>    Start a new pipeline run",
        "  snapshot <projectName> <label> Create a snapshot",
        "  rollback <snapshotId>         Rollback to a snapshot",
        "  clear                         Clear terminal",
        "",
        "Tip: All commands work on the active project if set via context.",
      ].join("\n"),
      exitCode: 0,
    };
  }

  if (cmd === "status") {
    const [agentCount] = await db.select({ c: sql<number>`count(*)::int` }).from(agentsTable);
    const [projCount] = await db.select({ c: sql<number>`count(*)::int` }).from(projectsTable);
    const runs = await db.select({ status: runsTable.status }).from(runsTable);
    const active = runs.filter(r => r.status === "running").length;
    const done = runs.filter(r => r.status === "completed").length;
    return {
      output: [
        "┌─ SWARM_CTRL System Status ─────────────────┐",
        `│  Agents     : ${String(agentCount?.c ?? 0).padEnd(28)}│`,
        `│  Projects   : ${String(projCount?.c ?? 0).padEnd(28)}│`,
        `│  Active Runs: ${String(active).padEnd(28)}│`,
        `│  Completed  : ${String(done).padEnd(28)}│`,
        `│  Total Runs : ${String(runs.length).padEnd(28)}│`,
        "└────────────────────────────────────────────┘",
      ].join("\n"),
      exitCode: 0,
    };
  }

  if (cmd === "list") {
    const sub = args[0]?.toLowerCase();
    if (sub === "projects") {
      const projects = await db.select().from(projectsTable).orderBy(desc(projectsTable.updatedAt));
      if (projects.length === 0) return { output: "No projects found.", exitCode: 0 };
      const lines = projects.map(p =>
        `  ${p.id.padEnd(18)} ${p.name.padEnd(24)} [${p.status}] runs:${p.totalRuns} files:${p.totalFiles}`
      );
      return { output: ["ID                 NAME                     STATUS   RUNS  FILES", ...lines].join("\n"), exitCode: 0 };
    }
    if (sub === "agents") {
      const agents = await db.select().from(agentsTable);
      if (agents.length === 0) return { output: "No agents found.", exitCode: 0 };
      const lines = agents.map(a =>
        `  ${a.key.padEnd(28)} ${a.modelName.padEnd(24)} temp:${a.temperature}`
      );
      return { output: ["KEY                          MODEL                    TEMP", ...lines].join("\n"), exitCode: 0 };
    }
    if (sub === "runs") {
      const projectName = args[1];
      let runs = await db.select().from(runsTable).orderBy(desc(runsTable.createdAt)).limit(15);
      if (projectName) runs = runs.filter(r => r.projectName === projectName);
      if (runs.length === 0) return { output: "No runs found.", exitCode: 0 };
      const lines = runs.map(r =>
        `  ${r.id.padEnd(18)} ${r.projectName.padEnd(20)} [${r.status.padEnd(10)}] files:${r.filesWritten}`
      );
      return { output: ["ID                 PROJECT              STATUS      FILES", ...lines].join("\n"), exitCode: 0 };
    }
    if (sub === "files") {
      const projectName = args[1];
      let files: typeof projectFilesTable.$inferSelect[] = [];
      if (projectName) {
        const [p] = await db.select().from(projectsTable).where(eq(projectsTable.name, projectName));
        if (p) files = await db.select().from(projectFilesTable).where(eq(projectFilesTable.projectId, p.id)).limit(30);
      }
      if (files.length === 0) return { output: "No files found.", exitCode: 0 };
      const lines = files.map(f =>
        `  v${String(f.version).padEnd(3)} ${f.path.padEnd(40)} ${f.agentKey.padEnd(20)} ${Math.round(f.sizeBytes / 1024)}kb`
      );
      return { output: ["VER  PATH                                     AGENT                SIZE", ...lines].join("\n"), exitCode: 0 };
    }
    return { output: `Unknown subcommand: ${sub ?? "(none)"}. Try: projects, agents, runs, files`, exitCode: 1 };
  }

  if (cmd === "memory") {
    const name = args[0] ?? ctx.project?.name;
    if (!name) return { output: "Usage: memory <projectName>", exitCode: 1 };
    const [p] = await db.select().from(projectsTable).where(eq(projectsTable.name, name));
    if (!p) return { output: `Project "${name}" not found.`, exitCode: 1 };
    const mem = p.memory as { facts: Array<{ key: string; value: string; source: string; createdAt: string }>; summary: string; lastUpdated: string };
    if (mem.facts.length === 0) return { output: `No memory recorded for "${name}" yet.`, exitCode: 0 };
    const lines = [
      `Project Memory: ${p.name}`,
      `Summary: ${mem.summary || "(none)"}`,
      `Last Updated: ${mem.lastUpdated || "—"}`,
      "",
      "Facts:",
      ...mem.facts.map(f => `  [${f.source}] ${f.key}: ${f.value}`),
    ];
    return { output: lines.join("\n"), exitCode: 0 };
  }

  if (cmd === "show") {
    const name = args[0] ?? ctx.project?.name;
    if (!name) return { output: "Usage: show <projectName>", exitCode: 1 };
    const [p] = await db.select().from(projectsTable).where(eq(projectsTable.name, name));
    if (!p) return { output: `Project "${name}" not found.`, exitCode: 1 };
    return {
      output: [
        `Project: ${p.name} (${p.id})`,
        `Status  : ${p.status}`,
        `Stack   : ${p.stack ?? "not set"}`,
        `Desc    : ${p.description || "(none)"}`,
        `Runs    : ${p.totalRuns}`,
        `Files   : ${p.totalFiles}`,
        `Created : ${p.createdAt.toISOString()}`,
        `Updated : ${p.updatedAt.toISOString()}`,
      ].join("\n"),
      exitCode: 0,
    };
  }

  if (cmd === "clear") {
    return { output: "\x1bc", exitCode: 0 };
  }

  // Agent chat command: agent chat <key> <mesaj...>
  if (cmd === "agent") {
    const sub = args[0]?.toLowerCase();

    if (!sub || sub === "list") {
      const agents = await db.select({
        key: agentsTable.key, role: agentsTable.role, modelName: agentsTable.modelName,
      }).from(agentsTable).orderBy(agentsTable.createdAt);
      if (agents.length === 0) return { output: "Ajan bulunamadı. Agents sayfasından ekleyin.", exitCode: 0 };
      const lines = agents.map(a => `  ${a.key.padEnd(20)} ${(a.modelName ?? "global model").padEnd(30)} ${a.role.slice(0, 50)}`);
      return { output: ["AJANLAR", "KEY                  MODEL                          ROL", ...lines].join("\n"), exitCode: 0 };
    }

    if (sub === "chat") {
      const agentKey = args[1];
      if (!agentKey) return { output: "Kullanım: agent chat <key> <mesaj>\nÖrnek: agent chat architect REST API tasarla", exitCode: 1 };

      const message = args.slice(2).join(" ");
      if (!message) return { output: `Kullanım: agent chat ${agentKey} <mesaj>`, exitCode: 1 };

      const [agent] = await db.select().from(agentsTable).where(eq(agentsTable.key, agentKey));
      if (!agent) return { output: `Ajan bulunamadı: "${agentKey}". "agent list" ile mevcut ajanları görün.`, exitCode: 1 };

      let projectContext = "";
      if (ctx.project) {
        const mem = ctx.project.memory as any;
        projectContext = `Proje: ${ctx.project.name}\nStack: ${ctx.project.stack ?? "belirtilmedi"}\n${mem.summary ? "Özet: " + mem.summary : ""}`;
      }

      const result = await agentChat(
        { key: agent.key, role: agent.role, description: agent.description, modelName: agent.modelName },
        [{ role: "user", content: message }],
        { context: projectContext }
      );

      const fileLines = result.files.length > 0
        ? ["\n📄 Oluşturulan dosyalar:", ...result.files.map(f => `  • ${f.path} (${f.language})`)]
        : [];

      const cleanContent = result.content
        .replace(/```file:[^\n]+\n[\s\S]*?```/g, (m) => {
          const pathMatch = m.match(/```file:([^\n]+)/);
          return pathMatch ? `[Dosya oluşturuldu: ${pathMatch[1]}]` : "[dosya]";
        })
        .replace(/\*\*/g, "").replace(/`/g, "'");

      return {
        output: [`[${agent.key}] [${result.model} — ${result.source}]`, "", cleanContent, ...fileLines].join("\n"),
        exitCode: 0,
      };
    }

    return { output: `Bilinmeyen agent alt komutu: "${sub}". Kullanım: agent list | agent chat <key> <mesaj>`, exitCode: 1 };
  }

  // AI chat command
  if (cmd === "chat") {
    const sub = args[0]?.toLowerCase();

    if (sub === "new") {
      const id = generateId("conv");
      await db.insert(conversationsTable).values({
        id, title: "CLI Sohbeti", projectId: ctx.projectId ?? undefined, messages: [],
      });
      return { output: `Yeni sohbet oluşturuldu: ${id}\nKullanım: chat <mesaj>`, exitCode: 0 };
    }

    if (sub === "list") {
      const convs = await db.select({
        id: conversationsTable.id, title: conversationsTable.title,
        updatedAt: conversationsTable.updatedAt,
      }).from(conversationsTable).orderBy(desc(conversationsTable.updatedAt)).limit(10);
      if (convs.length === 0) return { output: "Sohbet bulunamadı. 'chat <mesaj>' ile yeni başlat.", exitCode: 0 };
      const lines = convs.map(c => `  ${c.id.padEnd(24)} ${c.title.slice(0, 40).padEnd(42)} ${c.updatedAt.toISOString().slice(0, 16)}`);
      return { output: ["ID                       BAŞLIK                                    GÜNCELLEME", ...lines].join("\n"), exitCode: 0 };
    }

    const message = args.join(" ");
    if (!message) return { output: "Kullanım: chat <mesaj>\nÖrnek: chat Express.js ile basit bir auth servisi yaz", exitCode: 1 };

    // Bağlamı oluştur
    let projectContext = "";
    if (ctx.project) {
      const mem = ctx.project.memory as any;
      projectContext = `Proje: ${ctx.project.name}\nStack: ${ctx.project.stack ?? "belirtilmedi"}\n${mem.summary ? "Özet: " + mem.summary : ""}`;
    }

    // Mevcut veya yeni konuşma bul
    let [conv] = await db.select().from(conversationsTable)
      .where(ctx.projectId ? eq(conversationsTable.projectId, ctx.projectId) : eq(conversationsTable.id, ""))
      .orderBy(desc(conversationsTable.updatedAt)).limit(1);

    if (!conv) {
      const id = generateId("conv");
      const [created] = await db.insert(conversationsTable).values({
        id, title: message.slice(0, 60), projectId: ctx.projectId ?? undefined, messages: [],
      }).returning();
      conv = created;
    }

    const messages = (conv.messages ?? []) as ChatMessage[];
    messages.push({ role: "user", content: message, ts: new Date().toISOString() });

    const llmMessages = messages.filter(m => m.role !== "system").map(m => ({ role: m.role as "user" | "assistant", content: m.content }));
    const result = await llmChat(llmMessages, { context: projectContext });

    const assistantMsg: ChatMessage = {
      role: "assistant", content: result.content, ts: new Date().toISOString(),
      files: result.files.length > 0 ? result.files.map(f => ({ path: f.path, content: f.content, language: f.language })) : undefined,
    };
    messages.push(assistantMsg);

    await db.update(conversationsTable).set({
      messages: messages as any, updatedAt: new Date(),
    }).where(eq(conversationsTable.id, conv.id));

    const fileLines = result.files.length > 0
      ? ["\n📄 Oluşturulan dosyalar:", ...result.files.map(f => `  • ${f.path} (${f.language})`)]
      : [];

    // Markdown'ı sadeleştir
    const cleanContent = result.content
      .replace(/```file:[^\n]+\n[\s\S]*?```/g, (m) => {
        const pathMatch = m.match(/```file:([^\n]+)/);
        return pathMatch ? `[Dosya oluşturuldu: ${pathMatch[1]}]` : "[dosya]";
      })
      .replace(/\*\*/g, "").replace(/`/g, "'");

    return {
      output: [`[${result.model} — ${result.source}]`, "", cleanContent, ...fileLines].join("\n"),
      exitCode: 0,
    };
  }

  return {
    output: `Command not found: "${cmd}". Type "help" to see available commands.`,
    exitCode: 127,
  };
}

router.post("/", async (req, res) => {
  const { command, projectId, projectName } = req.body as { command: string; projectId?: string; projectName?: string };
  if (!command?.trim()) return res.status(400).json({ error: "command is required" });
  const start = Date.now();
  const ctx = await resolveContext(projectId, projectName);
  const { output, exitCode } = await handleCommand(command, ctx);
  const durationMs = Date.now() - start;
  const id = generateId("cli");
  await db.insert(cliHistoryTable).values({
    id, projectId: ctx.projectId ?? undefined, command, output, exitCode, durationMs,
  });
  broadcast("cli_command", { id, command, output, exitCode, projectId: ctx.projectId });
  res.json({ id, command, output, exitCode, durationMs, projectId: ctx.projectId ?? null, runId: null, createdAt: new Date().toISOString() });
});

router.get("/history", async (req, res) => {
  const { projectId, limit = "20" } = req.query as { projectId?: string; limit?: string };
  let q = db.select().from(cliHistoryTable).orderBy(desc(cliHistoryTable.createdAt)).limit(Number(limit));
  const history = await q;
  const filtered = projectId ? history.filter(h => h.projectId === projectId) : history;
  res.json(filtered.map(h => ({
    id: h.id, command: h.command, output: h.output, exitCode: h.exitCode,
    durationMs: h.durationMs, projectId: h.projectId ?? null,
    createdAt: h.createdAt.toISOString(),
  })));
});

export default router;
