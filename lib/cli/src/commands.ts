import { apiCall, loadConfig, saveConfig, type CliConfig } from "./config.js";
import { c, ok, warn, err, info, box, printHelp } from "./print.js";
import { compressFull } from "@workspace/compressor";

export async function runCommand(input: string, cfg: CliConfig): Promise<void> {
  const trimmed = input.trim();
  if (!trimmed) return;

  const parts = trimmed.split(/\s+/);
  const cmd = parts[0]!.toLowerCase();
  const args = parts.slice(1);

  // ── Local commands ────────────────────────────────────────────────────────
  if (cmd === "help") { printHelp(); return; }

  if (cmd === "clear") {
    process.stdout.write("\x1bc");
    return;
  }

  if (cmd === "exit" || cmd === "quit") {
    console.log(c.cyan("Hoşça kal."));
    process.exit(0);
  }

  if (cmd === "config") {
    const [urlArg, projectArg] = args;
    if (!urlArg && !projectArg) {
      box("Mevcut Yapılandırma", [
        `Sunucu URL  : ${cfg.serverUrl}`,
        `Proje       : ${cfg.projectName ?? "(ayarlanmamış)"}`,
        `Config dosya: ~/.swarm-ctrl.json`,
      ]);
      return;
    }
    if (urlArg) { saveConfig({ serverUrl: urlArg }); ok(`Sunucu URL güncellendi: ${urlArg}`); }
    if (projectArg) { saveConfig({ projectName: projectArg }); ok(`Proje ayarlandı: ${projectArg}`); }
    return;
  }

  // ── Compress inline ───────────────────────────────────────────────────────
  if (cmd === "compress") {
    const text = args.join(" ");
    if (!text) { warn("Kullanım: compress <metin>"); return; }
    const result = compressFull(text, "aggressive");
    console.log(c.bold("\nSıkıştırılmış:"));
    console.log(result.compressed);
    console.log(c.dim(`\n${result.originalTokens} → ${result.compressedTokens} token (-${result.savedPercent.toFixed(1)}%, ${result.passes} geçiş)`));
    return;
  }

  // ── API-backed commands: send to server /cli route ────────────────────────
  if (cmd === "status" || cmd === "list" || cmd === "memory" || cmd === "show" || cmd === "run" || cmd === "snapshot" || cmd === "rollback" || cmd === "agent") {
    await sendToCliRoute(trimmed, cfg);
    return;
  }

  // ── chat <message> — direct to /chat endpoint ─────────────────────────────
  if (cmd === "chat") {
    const message = args.join(" ");
    if (!message) { warn("Kullanım: chat <mesaj>\nÖrnek: chat Express.js ile auth yaz"); return; }
    await sendChat(message, cfg);
    return;
  }

  // ── ask <question> — alias for chat ──────────────────────────────────────
  if (cmd === "ask") {
    const message = args.join(" ");
    if (!message) { warn("Kullanım: ask <soru>"); return; }
    await sendChat(message, cfg);
    return;
  }

  // ── models ────────────────────────────────────────────────────────────────
  if (cmd === "models") {
    await showModels(cfg);
    return;
  }

  // ── Unknown — try forwarding to CLI route ─────────────────────────────────
  await sendToCliRoute(trimmed, cfg);
}

async function sendToCliRoute(command: string, cfg: CliConfig): Promise<void> {
  try {
    const body: Record<string, string> = { command };
    if (cfg.projectName) body["projectName"] = cfg.projectName;
    if (cfg.projectId) body["projectId"] = cfg.projectId;

    const result = await apiCall<{ output: string; exitCode: number; durationMs: number }>(
      "/api/cli",
      { method: "POST", body },
      cfg,
    );

    // Handle clear escape
    if (result.output === "\x1bc") { process.stdout.write("\x1bc"); return; }

    console.log(result.output);
    if (result.exitCode !== 0) {
      console.log(c.dim(`\nExit: ${result.exitCode} | ${result.durationMs}ms`));
    } else {
      console.log(c.dim(`\n${result.durationMs}ms`));
    }
  } catch (e: any) {
    err(`Sunucuya bağlanılamadı: ${e.message}`);
    info(`Sunucu çalışıyor mu? → ${cfg.serverUrl}`);
  }
}

async function sendChat(message: string, cfg: CliConfig): Promise<void> {
  try {
    // Get or create a conversation for this session
    const convs = await apiCall<Array<{ id: string; title: string }>>("/api/chat", {}, cfg);
    let convId: string;

    if (convs.length === 0) {
      const created = await apiCall<{ id: string }>("/api/chat", {
        method: "POST",
        body: { title: message.slice(0, 60), projectId: cfg.projectId },
      }, cfg);
      convId = created.id;
    } else {
      convId = convs[0]!.id;
    }

    console.log(c.dim("Yanıt bekleniyor..."));
    const resp = await apiCall<{
      message: { content: string; files?: Array<{ path: string }> };
      model: string;
      source: string;
    }>(`/api/chat/${convId}/message`, {
      method: "POST",
      body: { content: message, projectId: cfg.projectId },
    }, cfg);

    const clean = resp.message.content
      .replace(/\*\*/g, "")
      .replace(/```file:[^\n]+\n[\s\S]*?```/g, (m: string) => {
        const p = m.match(/```file:([^\n]+)/)?.[1];
        return p ? c.green(`[Dosya oluşturuldu: ${p}]`) : "[dosya]";
      });

    console.log(`\n${c.cyan(`[${resp.model} — ${resp.source}]`)}\n`);
    console.log(clean);

    if (resp.message.files && resp.message.files.length > 0) {
      console.log(c.green(`\nDosyalar: ${resp.message.files.map(f => f.path).join(", ")}`));
    }
    console.log();
  } catch (e: any) {
    err(`Chat hatası: ${e.message}`);
    info(`Sunucu çalışıyor mu? → ${cfg.serverUrl}`);
  }
}

async function showModels(cfg: CliConfig): Promise<void> {
  try {
    const data = await apiCall<{ config: { globalModel: string; sources: Array<{ type: string; label: string; isDefault: boolean; apiKey?: string }> } }>(
      "/api/models/config", {}, cfg
    );
    const { globalModel, sources } = data.config;
    console.log(c.bold(`\nAktif Model: ${c.cyan(globalModel)}\n`));
    console.log(c.bold("Kaynaklar:"));
    for (const s of sources) {
      const status = s.apiKey ? c.green("✓") : c.dim("—");
      const def = s.isDefault ? c.yellow(" [varsayılan]") : "";
      console.log(`  ${status} ${s.type.padEnd(12)} ${s.label}${def}`);
    }
    console.log();
  } catch (e: any) {
    err(`Model bilgisi alınamadı: ${e.message}`);
  }
}
