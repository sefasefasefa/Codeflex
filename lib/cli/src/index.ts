import * as readline from "readline";
import { loadConfig, saveConfig } from "./config.js";
import { runCommand } from "./commands.js";
import { printBanner, c, err } from "./print.js";

async function main() {
  const cfg = loadConfig();
  const args = process.argv.slice(2);

  // ── Single-command mode: swarm ask "..." or swarm status etc. ─────────────
  if (args.length > 0) {
    const command = args.join(" ");
    try {
      await runCommand(command, cfg);
    } catch (e: any) {
      err(e.message);
      process.exit(1);
    }
    return;
  }

  // ── Interactive REPL mode ─────────────────────────────────────────────────
  printBanner();

  // Show configured server + project
  console.log(c.dim(`Sunucu : ${cfg.serverUrl}`));
  console.log(c.dim(`Proje  : ${cfg.projectName ?? "(ayarlanmamış — 'config <url> <proje>' ile ayarla)"}`));
  console.log();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: process.stdout.isTTY,
  });

  const prompt = () => {
    const projectLabel = cfg.projectName ? c.cyan(`[${cfg.projectName}] `) : "";
    rl.question(`${projectLabel}${c.cyan("swarm")} ${c.dim(">")} `, async (line) => {
      const input = line?.trim() ?? "";
      if (!input) { prompt(); return; }

      // Reload config each time (user may have changed it mid-session)
      const freshCfg = loadConfig();

      // Handle config changes mid-session
      if (input.startsWith("config ")) {
        const parts = input.split(/\s+/);
        if (parts[1]) { saveConfig({ serverUrl: parts[1] }); }
        if (parts[2]) { saveConfig({ projectName: parts[2] }); }
        prompt();
        return;
      }

      try {
        await runCommand(input, freshCfg);
      } catch (e: any) {
        err(e.message);
      }
      prompt();
    });
  };

  rl.on("close", () => {
    console.log(c.cyan("\nHoşça kal."));
    process.exit(0);
  });

  prompt();
}

main();
