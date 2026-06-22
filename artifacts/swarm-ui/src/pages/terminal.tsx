import { useState, useRef, useEffect, useCallback } from "react";
import { useExecuteCliCommand, useGetCliHistory, getGetCliHistoryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Terminal as TermIcon } from "lucide-react";

type Line = { id: string; type: "input" | "output" | "error" | "system"; content: string };

export default function Terminal() {
  const qc = useQueryClient();
  const { data: history = [] } = useGetCliHistory({ limit: 20 }, { query: { queryKey: getGetCliHistoryQueryKey({ limit: 20 }) } });
  const { mutateAsync: execute } = useExecuteCliCommand();

  const [lines, setLines] = useState<Line[]>([
    { id: "sys-0", type: "system", content: "SWARM_CTRL Terminal v1.0 — Type 'help' to see available commands." },
    { id: "sys-1", type: "system", content: "──────────────────────────────────────────────────────────────" },
  ]);
  const [input, setInput] = useState("");
  const [histIdx, setHistIdx] = useState(-1);
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [executing, setExecuting] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (history.length > 0 && !historyLoaded) {
      setHistoryLoaded(true);
      const prev: Line[] = [];
      for (const h of [...history].reverse()) {
        prev.push({ id: `h-in-${h.id}`, type: "input", content: h.command });
        const lines2 = h.output.split("\n");
        for (let i = 0; i < lines2.length; i++) {
          prev.push({ id: `h-out-${h.id}-${i}`, type: h.exitCode !== 0 ? "error" : "output", content: lines2[i] ?? "" });
        }
      }
      if (prev.length > 0) {
        setLines(l => [...l, { id: "sys-hist", type: "system", content: `── ${history.length} commands from history ──` }, ...prev, { id: "sys-sep", type: "system", content: "─────────────────────────────────────────" }]);
        setCmdHistory(history.map(h => h.command).reverse());
      }
    }
  }, [history, historyLoaded]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  const addLine = useCallback((type: Line["type"], content: string) => {
    setLines(l => [...l, { id: `${Date.now()}-${Math.random()}`, type, content }]);
  }, []);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const cmd = input.trim();
    if (!cmd || executing) return;

    if (cmd === "clear" || cmd === "cls") {
      setLines([{ id: "sys-clr", type: "system", content: "Terminal cleared." }]);
      setInput("");
      return;
    }

    setCmdHistory(h => [cmd, ...h.filter(x => x !== cmd)]);
    setHistIdx(-1);
    addLine("input", cmd);
    setInput("");
    setExecuting(true);

    try {
      const result = await execute({ data: { command: cmd } });
      const outputLines = result.output.split("\n");
      for (const line of outputLines) {
        addLine(result.exitCode !== 0 ? "error" : "output", line);
      }
      if (result.durationMs) {
        addLine("system", `[${result.durationMs}ms]`);
      }
      qc.invalidateQueries({ queryKey: getGetCliHistoryQueryKey() });
    } catch (err: any) {
      addLine("error", `Error: ${err?.message ?? "Unknown error"}`);
    } finally {
      setExecuting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const next = Math.min(histIdx + 1, cmdHistory.length - 1);
      setHistIdx(next);
      setInput(cmdHistory[next] ?? "");
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = histIdx - 1;
      if (next < 0) { setHistIdx(-1); setInput(""); }
      else { setHistIdx(next); setInput(cmdHistory[next] ?? ""); }
    } else if (e.key === "l" && e.ctrlKey) {
      e.preventDefault();
      setLines([{ id: "sys-clr2", type: "system", content: "Terminal cleared." }]);
    } else if (e.key === "c" && e.ctrlKey) {
      e.preventDefault();
      addLine("system", "^C");
      setInput("");
    }
  };

  const getLineStyle = (type: Line["type"]) => {
    switch (type) {
      case "input": return "text-cyan-400";
      case "error": return "text-red-400 bg-red-500/5";
      case "system": return "text-slate-500";
      default: return "text-slate-200";
    }
  };

  const formatContent = (type: Line["type"], content: string) => {
    if (type === "input") return `swarm> ${content}`;
    return content;
  };

  return (
    <div
      className="flex flex-col h-full bg-[#050a14] font-mono text-sm overflow-hidden cursor-text"
      onClick={() => inputRef.current?.focus()}
    >
      <div className="flex items-center gap-2 px-4 py-2 border-b border-white/10 shrink-0 bg-[#080e1f]">
        <TermIcon className="w-4 h-4 text-cyan-400" />
        <span className="text-xs text-slate-400 uppercase tracking-wider">SWARM_CTRL Terminal</span>
        <span className="ml-auto text-xs text-slate-600 font-mono">
          {executing ? <span className="text-cyan-400 animate-pulse">executing...</span> : "ready"}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-0.5">
        <AnimatePresence initial={false}>
          {lines.map(line => (
            <motion.div
              key={line.id}
              initial={{ opacity: 0, y: 2 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.1 }}
              className={`leading-relaxed whitespace-pre-wrap break-all px-1 rounded ${getLineStyle(line.type)}`}
            >
              {formatContent(line.type, line.content)}
            </motion.div>
          ))}
        </AnimatePresence>
        {executing && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 0.8, repeat: Infinity }}
            className="text-cyan-400/60"
          >
            processing...
          </motion.div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="shrink-0 border-t border-white/10 bg-[#080e1f] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-cyan-400 shrink-0">swarm&gt;</span>
          <input
            ref={inputRef}
            autoFocus
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={executing}
            className="flex-1 bg-transparent text-slate-200 outline-none placeholder-slate-600 caret-cyan-400 disabled:opacity-50"
            placeholder="type a command..."
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
          />
          {executing && <span className="w-2 h-4 bg-cyan-400 animate-pulse shrink-0" />}
        </div>
      </form>
    </div>
  );
}
