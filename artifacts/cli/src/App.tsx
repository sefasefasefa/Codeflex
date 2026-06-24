import { useState, useRef, useEffect, useCallback } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuth } from "@workspace/replit-auth-web";
import { useSwarmSync } from "@/hooks/use-swarm-sync";

const queryClient = new QueryClient();

const API = "/api";

type LineKind = "input" | "output" | "error" | "info" | "success";

interface Line {
  id: number;
  kind: LineKind;
  text: string;
  ts?: string;
}

const BUILT_IN_HELP = `
╔══════════════════════════════════════════════════════╗
║           Swarm Agent CLI v1.0.0                     ║
╚══════════════════════════════════════════════════════╝

Kullanılabilir komutlar:
  help                  Bu yardım mesajını göster
  clear                 Ekranı temizle
  status                API sunucu durumunu kontrol et
  projects              Projeleri listele
  agents                Agent listesini göster
  runs [--limit N]      Son çalışmaları listele
  run <id>              Belirli bir çalışmanın detaylarını göster
  stats                 Sistem istatistiklerini göster
  history               Komut geçmişini göster
  exec <komut>          API üzerinden komut çalıştır

Kısayollar:
  ↑ / ↓                Komut geçmişinde gezin
  Tab                   Otomatik tamamla
  Ctrl+C                Girişi temizle
`.trim();

let lineCounter = 0;
function makeLine(kind: LineKind, text: string): Line {
  return { id: ++lineCounter, kind, text, ts: new Date().toISOString() };
}

async function apiFetch(path: string) {
  const res = await fetch(`${API}${path}`, { credentials: "include" });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.json();
}

async function apiPost(path: string, body: unknown) {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`HTTP ${res.status}: ${err}`);
  }
  return res.json();
}

function formatJson(obj: unknown): string {
  return JSON.stringify(obj, null, 2);
}

function AppNav() {
  return (
    <div className="flex items-center gap-3 px-4 py-1.5 bg-[#080808] border-b border-green-900/20 text-[11px] font-mono text-green-800">
      <span className="text-green-600/60">apps:</span>
      <a href="/" className="hover:text-green-400 transition-colors">swarm-ui</a>
      <span className="text-green-900">·</span>
      <a href="/studio/" className="hover:text-green-400 transition-colors">studio</a>
      <span className="text-green-900">·</span>
      <span className="text-green-600">cli</span>
    </div>
  );
}

function Terminal() {
  const { user, isAuthenticated, isLoading, login } = useAuth();
  useSwarmSync();

  const [lines, setLines] = useState<Line[]>([
    makeLine("info", `Swarm Agent CLI — ${new Date().toLocaleDateString("tr-TR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`),
    makeLine("info", `API: ${window.location.origin}${API}`),
    makeLine("info", `Başlamak için "help" yazın.`),
    makeLine("info", "─".repeat(56)),
  ]);
  const [input, setInput] = useState("");
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const addLines = useCallback((...newLines: Line[]) => {
    setLines((prev) => [...prev, ...newLines]);
  }, []);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [lines]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      addLines(makeLine("success", `✓ Oturum: ${user.firstName ?? user.id}`));
    }
  }, [isLoading, isAuthenticated, user, addLines]);

  const runCommand = useCallback(async (raw: string) => {
    const cmd = raw.trim();
    if (!cmd) return;

    setCmdHistory((h) => [cmd, ...h.filter((c) => c !== cmd).slice(0, 99)]);
    setHistoryIndex(-1);
    addLines(makeLine("input", `$ ${cmd}`));
    setBusy(true);

    try {
      const [verb, ...args] = cmd.split(/\s+/);
      const lowerVerb = verb.toLowerCase();

      if (lowerVerb === "help") {
        addLines(makeLine("info", BUILT_IN_HELP));
      } else if (lowerVerb === "clear") {
        setLines([]);
      } else if (lowerVerb === "status") {
        const data = await apiFetch("/healthz");
        addLines(makeLine("success", `✓ API çevrimiçi — durum: ${data.status}`));
      } else if (lowerVerb === "projects") {
        const data = await apiFetch("/projects");
        if (!data.length) {
          addLines(makeLine("info", "Proje bulunamadı."));
        } else {
          addLines(makeLine("info", `${data.length} proje:`));
          for (const p of data) {
            addLines(makeLine("output", `  [${p.status}] ${p.id}  ${p.name}  (${p.totalRuns} çalışma)`));
          }
        }
      } else if (lowerVerb === "agents") {
        const data = await apiFetch("/agents");
        if (!data.length) {
          addLines(makeLine("info", "Agent bulunamadı."));
        } else {
          addLines(makeLine("info", `${data.length} agent:`));
          for (const a of data) {
            addLines(makeLine("output", `  ${a.key}  [${a.modelName}]  ${a.role}`));
          }
        }
      } else if (lowerVerb === "runs") {
        const limitArg = args.findIndex((a) => a === "--limit");
        const limit = limitArg !== -1 ? args[limitArg + 1] || "10" : "10";
        const data = await apiFetch(`/runs?limit=${limit}`);
        if (!data.length) {
          addLines(makeLine("info", "Çalışma bulunamadı."));
        } else {
          addLines(makeLine("info", `Son ${data.length} çalışma:`));
          for (const r of data) {
            const ts = new Date(r.createdAt).toLocaleString("tr-TR");
            addLines(makeLine("output", `  [${r.status.padEnd(9)}] ${r.id}  ${r.projectName}  ${ts}`));
          }
        }
      } else if (lowerVerb === "run") {
        if (!args[0]) {
          addLines(makeLine("error", "Kullanım: run <id>"));
        } else {
          const data = await apiFetch(`/runs/${args[0]}`);
          addLines(makeLine("output", formatJson(data)));
        }
      } else if (lowerVerb === "stats") {
        const data = await apiFetch("/stats");
        addLines(makeLine("output", formatJson(data)));
      } else if (lowerVerb === "history") {
        if (!cmdHistory.length) {
          addLines(makeLine("info", "Geçmiş boş."));
        } else {
          addLines(makeLine("info", "Komut geçmişi:"));
          cmdHistory.forEach((c, i) => {
            addLines(makeLine("output", `  ${String(i + 1).padStart(3)}  ${c}`));
          });
        }
      } else if (lowerVerb === "exec") {
        const command = args.join(" ");
        if (!command) {
          addLines(makeLine("error", "Kullanım: exec <komut>"));
        } else {
          const data = await apiPost("/cli", { command, projectId: null });
          addLines(makeLine(data.exitCode === 0 ? "output" : "error", data.output || "(çıktı yok)"));
          if (data.durationMs) {
            addLines(makeLine("info", `✓ Süre: ${data.durationMs}ms  Çıkış kodu: ${data.exitCode}`));
          }
        }
      } else {
        addLines(makeLine("error", `Bilinmeyen komut: "${verb}". Yardım için "help" yazın.`));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addLines(makeLine("error", `✗ Hata: ${msg}`));
    } finally {
      setBusy(false);
    }
  }, [addLines, cmdHistory]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !busy) {
      const cmd = input;
      setInput("");
      runCommand(cmd);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const next = historyIndex + 1;
      if (next < cmdHistory.length) {
        setHistoryIndex(next);
        setInput(cmdHistory[next]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = historyIndex - 1;
      if (next < 0) {
        setHistoryIndex(-1);
        setInput("");
      } else {
        setHistoryIndex(next);
        setInput(cmdHistory[next]);
      }
    } else if (e.key === "c" && e.ctrlKey) {
      e.preventDefault();
      setInput("");
      addLines(makeLine("input", `$ ${input}^C`));
    } else if (e.key === "Tab") {
      e.preventDefault();
      const cmds = ["help", "clear", "status", "projects", "agents", "runs", "run", "stats", "history", "exec"];
      const match = cmds.find((c) => c.startsWith(input) && c !== input);
      if (match) setInput(match);
    }
  };

  const lineColor: Record<LineKind, string> = {
    input: "text-green-300",
    output: "text-gray-200",
    error: "text-red-400",
    info: "text-green-600",
    success: "text-green-400",
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen bg-[#111] font-mono text-sm items-center justify-center">
        <span className="text-green-600 animate-pulse">bağlanıyor...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col h-screen bg-[#111] font-mono text-sm">
        <AppNav />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <p className="text-green-600 text-sm">CLI'yi kullanmak için giriş yapın.</p>
            <button
              onClick={login}
              className="px-6 py-2 border border-green-700 text-green-400 hover:bg-green-900/20 transition-colors rounded font-mono text-sm"
            >
              Giriş Yap
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-screen bg-[#111] font-mono text-sm select-text"
      onClick={() => inputRef.current?.focus()}
    >
      <div className="terminal-scanline" />

      <AppNav />

      <div className="flex items-center gap-2 px-4 py-2 bg-[#0d0d0d] border-b border-green-900/40">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/80" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
          <div className="w-3 h-3 rounded-full bg-green-500/80" />
        </div>
        <span className="text-green-600 text-xs ml-2 tracking-widest uppercase">
          swarm-agent — cli
        </span>
        <div className="ml-auto flex items-center gap-3 text-green-800 text-xs">
          {user && (
            <span className="text-green-700">{user.firstName ?? user.id}</span>
          )}
          {busy && <span className="text-yellow-600 animate-pulse">● çalışıyor</span>}
          <span>{new Date().toLocaleTimeString("tr-TR")}</span>
        </div>
      </div>

      <div
        ref={outputRef}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-0.5"
        style={{ scrollBehavior: "smooth" }}
      >
        {lines.map((line) => (
          <div
            key={line.id}
            className={`whitespace-pre-wrap break-all leading-relaxed ${lineColor[line.kind]}`}
          >
            {line.text}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 px-4 py-3 border-t border-green-900/40 bg-[#0d0d0d]">
        <span className="text-green-500 shrink-0">$</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={busy}
          placeholder={busy ? "bekliyor..." : "komut girin..."}
          className="flex-1 bg-transparent outline-none text-green-300 placeholder-green-800 caret-green-400 disabled:opacity-50"
          autoComplete="off"
          spellCheck={false}
        />
        <span className="cursor-blink text-green-400 text-base">▊</span>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Terminal />
    </QueryClientProvider>
  );
}
