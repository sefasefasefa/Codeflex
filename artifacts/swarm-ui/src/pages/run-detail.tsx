import { useParams } from "wouter";
import { useGetRun, getGetRunQueryKey, useCancelRun } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Activity, XCircle, ArrowLeft, ChevronDown, ChevronRight, Terminal, Wifi, WifiOff } from "lucide-react";
import { Link } from "wouter";
import { useState, useRef, useEffect, useCallback } from "react";
import { formatDate } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";

type LogEntry = {
  id: string;
  runId: string;
  agentKey: string;
  level: string;
  message: string;
  thinkTrace: string | null;
  filePath: string | null;
  createdAt: string;
};

type RunData = {
  id: string;
  projectName: string;
  status: string;
  parallelCount: number;
  agentKeys: string[];
  prompt: string;
  createdAt: string;
  completedAt: string | null;
  logs?: LogEntry[];
};

export default function RunDetail() {
  const { runId } = useParams();
  const { data: initialRun } = useGetRun(runId!, {
    query: { enabled: !!runId, queryKey: getGetRunQueryKey(runId!) },
  });
  const cancelRun = useCancelRun();
  const queryClient = useQueryClient();
  const logsEndRef = useRef<HTMLDivElement>(null);

  const [run, setRun] = useState<RunData | null>(null);
  const [streamLogs, setStreamLogs] = useState<LogEntry[]>([]);
  const [sseStatus, setSseStatus] = useState<"connecting" | "live" | "done" | "error">("connecting");
  const esRef = useRef<EventSource | null>(null);

  const autoScroll = useCallback(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (!runId) return;

    const es = new EventSource(`/api/runs/${runId}/stream`);
    esRef.current = es;
    setSseStatus("connecting");

    es.addEventListener("init", (e) => {
      const { run: r, logs } = JSON.parse(e.data);
      setRun(r);
      setStreamLogs(logs);
      setSseStatus(r.status === "running" ? "live" : "done");
      setTimeout(autoScroll, 50);
    });

    es.addEventListener("log", (e) => {
      const log = JSON.parse(e.data) as LogEntry;
      setStreamLogs((prev) => [...prev, log]);
      setTimeout(autoScroll, 20);
    });

    es.addEventListener("status", (e) => {
      const data = JSON.parse(e.data);
      setRun((prev) => prev ? { ...prev, status: data.status ?? prev.status, completedAt: data.completedAt ?? prev.completedAt } : prev);
    });

    es.addEventListener("done", (e) => {
      const { status } = JSON.parse(e.data);
      setRun((prev) => prev ? { ...prev, status } : prev);
      setSseStatus("done");
      es.close();
      queryClient.invalidateQueries({ queryKey: getGetRunQueryKey(runId!) });
    });

    es.addEventListener("error", () => {
      setSseStatus("error");
      es.close();
      queryClient.invalidateQueries({ queryKey: getGetRunQueryKey(runId!) });
    });

    es.onerror = () => {
      setSseStatus("error");
    };

    return () => {
      es.close();
    };
  }, [runId]);

  const handleCancel = () => {
    if (runId) {
      cancelRun.mutate({ runId }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetRunQueryKey(runId) });
        },
      });
    }
  };

  const displayRun = run ?? (initialRun as RunData | undefined) ?? null;
  const displayLogs: LogEntry[] = streamLogs.length > 0 ? streamLogs : ((displayRun?.logs ?? []) as LogEntry[]);

  if (!displayRun) {
    return <div className="p-6 font-mono text-muted-foreground animate-pulse">LOADING_DATA...</div>;
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="border-b border-border p-4 bg-card flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/runs" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold font-mono flex items-center gap-2">
              <Terminal className="w-5 h-5 text-primary" /> {displayRun.projectName}
            </h1>
            <div className="text-xs text-muted-foreground font-mono mt-1 flex items-center gap-3">
              <span>RUN_ID: {displayRun.id}</span>
              <Badge variant="outline" className="text-[10px] py-0">{displayRun.status}</Badge>
              <SseIndicator status={sseStatus} logCount={displayLogs.length} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {displayRun.status === "running" && (
            <Button variant="destructive" size="sm" onClick={handleCancel} className="font-mono">
              <XCircle className="w-4 h-4 mr-2" /> CANCEL
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col p-4 bg-black/90 text-gray-300 font-mono text-sm">
        <ScrollArea className="flex-1 rounded border border-border/50 bg-black/50 p-4">
          <div className="space-y-2">
            <div className="text-muted-foreground pb-4 border-b border-border/20 mb-4">
              {">"} INITIALIZING PIPELINE: {displayRun.projectName}
              <br />{">"} PARALLEL THREADS: {displayRun.parallelCount}
              <br />{">"} AGENTS: {displayRun.agentKeys.join(", ")}
            </div>

            {displayLogs.map((log) => (
              <LogEntryRow key={log.id} log={log} />
            ))}
            <div ref={logsEndRef} />

            {displayRun.status === "running" && (
              <div className="flex items-center gap-2 text-primary mt-4 opacity-50">
                <Activity className="w-4 h-4 animate-spin" /> RUNNING...
              </div>
            )}

            {displayRun.status !== "running" && displayLogs.length > 0 && (
              <div className="pt-4 border-t border-border/20 text-muted-foreground text-xs">
                {">"} RUN {displayRun.status.toUpperCase()} — {displayLogs.length} log entries
                {displayRun.completedAt && <> — completed {formatDate(displayRun.completedAt)}</>}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

function SseIndicator({ status, logCount }: { status: string; logCount: number }) {
  if (status === "live") {
    return (
      <span className="flex items-center gap-1 text-green-400">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
        </span>
        LIVE · {logCount} logs
      </span>
    );
  }
  if (status === "connecting") {
    return <span className="text-yellow-400 animate-pulse">CONNECTING...</span>;
  }
  if (status === "error") {
    return <span className="flex items-center gap-1 text-red-400"><WifiOff className="w-3 h-3" /> STREAM_ERROR</span>;
  }
  return <span className="text-muted-foreground">{logCount} logs</span>;
}

function LogEntryRow({ log }: { log: LogEntry }) {
  const [expanded, setExpanded] = useState(false);

  const colors: Record<string, string> = {
    info: "text-blue-400",
    warn: "text-yellow-400",
    error: "text-red-400",
    think: "text-purple-400",
    output: "text-green-400",
  };

  const levelColor = colors[log.level] ?? "text-gray-400";

  return (
    <div className="flex flex-col gap-1 py-1 hover:bg-white/5 px-2 -mx-2 rounded transition-colors group">
      <div className="flex items-start gap-3">
        <span className="text-xs opacity-50 shrink-0 w-24">
          {new Date(log.createdAt).toLocaleTimeString(undefined, {
            hour12: false,
            fractionalSecondDigits: 3,
          } as Intl.DateTimeFormatOptions)}
        </span>
        <Badge
          variant="outline"
          className={`shrink-0 text-[10px] rounded bg-white/5 border-white/10 ${levelColor}`}
        >
          {log.level.toUpperCase()}
        </Badge>
        <Badge variant="secondary" className="shrink-0 text-[10px] rounded bg-white/10 text-white/70">
          {log.agentKey}
        </Badge>
        <span className="flex-1 whitespace-pre-wrap break-words">{log.message}</span>
      </div>

      {log.thinkTrace && (
        <div className="ml-28 mt-1">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-purple-400/70 hover:text-purple-400 transition-colors"
          >
            {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            REASONING_TRACE
          </button>
          {expanded && (
            <div className="mt-2 pl-4 py-2 border-l-2 border-purple-500/30 text-purple-200/60 text-xs whitespace-pre-wrap bg-purple-500/5 rounded-r">
              {log.thinkTrace}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
