// ANSI color helpers — degrade gracefully when terminal has no color support
const NO_COLOR = !process.stdout.isTTY || process.env["NO_COLOR"];

const c = {
  cyan:   (s: string) => NO_COLOR ? s : `\x1b[36m${s}\x1b[0m`,
  green:  (s: string) => NO_COLOR ? s : `\x1b[32m${s}\x1b[0m`,
  yellow: (s: string) => NO_COLOR ? s : `\x1b[33m${s}\x1b[0m`,
  red:    (s: string) => NO_COLOR ? s : `\x1b[31m${s}\x1b[0m`,
  dim:    (s: string) => NO_COLOR ? s : `\x1b[2m${s}\x1b[0m`,
  bold:   (s: string) => NO_COLOR ? s : `\x1b[1m${s}\x1b[0m`,
  reset:  "\x1b[0m",
};

export { c };

export function printBanner() {
  console.log(c.cyan(c.bold("╔══════════════════════════════════╗")));
  console.log(c.cyan(c.bold("║        SWARM_CTRL  CLI           ║")));
  console.log(c.cyan(c.bold("╚══════════════════════════════════╝")));
  console.log(c.dim('Type "help" for commands, "exit" to quit.\n'));
}

export function printHelp() {
  const rows = [
    ["help",                          "Bu yardım mesajını göster"],
    ["status",                        "Sistem durumu (ajanlar, projeler, run'lar)"],
    ["config [url] [project]",        "Sunucu URL ve proje ayarla"],
    ["list projects",                 "Tüm projeleri listele"],
    ["list agents",                   "Tüm ajanları listele"],
    ["list runs [proje]",             "Son run'ları listele"],
    ["list files [proje]",            "Ajan tarafından yazılan dosyalar"],
    ["memory [proje]",                "Proje belleğini göster"],
    ["show <proje>",                  "Proje detaylarını göster"],
    ["chat <mesaj>",                  "AI ile sohbet et (proje bağlamıyla)"],
    ["agent chat <key> <mesaj>",      "Belirli bir ajanla konuş"],
    ["run <proje> <prompt>",          "Yeni pipeline run başlat"],
    ["compress <metin>",              "Metni token sıkıştır (inline)"],
    ["clear",                         "Ekranı temizle"],
    ["exit / quit",                   "CLI'dan çık"],
  ];
  console.log(c.bold("\nKullanılabilir Komutlar:"));
  for (const [cmd, desc] of rows) {
    console.log(`  ${c.cyan(cmd.padEnd(36))} ${c.dim(desc)}`);
  }
  console.log();
}

export function ok(msg: string) { console.log(c.green("✓ ") + msg); }
export function warn(msg: string) { console.log(c.yellow("⚠ ") + msg); }
export function err(msg: string) { console.log(c.red("✗ ") + msg); }
export function info(msg: string) { console.log(c.dim("  " + msg)); }
export function box(title: string, lines: string[]) {
  const width = Math.max(title.length + 4, ...lines.map(l => l.length + 4), 44);
  const bar = "─".repeat(width);
  console.log(c.cyan(`┌${bar}┐`));
  console.log(c.cyan(`│ ${c.bold(title.padEnd(width - 1))}│`));
  console.log(c.cyan(`├${bar}┤`));
  for (const line of lines) console.log(c.cyan("│ ") + line.padEnd(width - 1) + c.cyan("│"));
  console.log(c.cyan(`└${bar}┘`));
}
