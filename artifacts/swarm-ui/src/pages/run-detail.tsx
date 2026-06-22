import { useParams } from "wouter";
import { useGetRun, getGetRunQueryKey, useCancelRun } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Activity, XCircle, ArrowLeft, ChevronDown, ChevronRight, Terminal } from "lucide-react";
import { Link } from "wouter";
import { useState, useRef, useEffect } from "react";
import { formatDate } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";

export default function RunDetail() {
  const { runId } = useParams();
  const { data: run } = useGetRun(runId!, { 
    query: { 
      enabled: !!runId, 
      queryKey: getGetRunQueryKey(runId!),
      refetchInterval: (data) => data?.status === 'running' ? 2000 : false
    } 
  });
  const cancelRun = useCancelRun();
  const queryClient = useQueryClient();
  const logsEndRef = useRef<HTMLDivElement>(null);

  const handleCancel = () => {
    if (runId) {
      cancelRun.mutate({ runId }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetRunQueryKey(runId) });
        }
      });
    }
  };

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [run?.logs]);

  if (!run) return <div className="p-6 font-mono text-muted-foreground animate-pulse">LOADING_DATA...</div>;

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="border-b border-border p-4 bg-card flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/runs" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold font-mono flex items-center gap-2">
              <Terminal className="w-5 h-5 text-primary" /> {run.projectName}
            </h1>
            <div className="text-xs text-muted-foreground font-mono mt-1 flex items-center gap-3">
              <span>RUN_ID: {run.id}</span>
              <Badge variant="outline" className="text-[10px] py-0">{run.status}</Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {run.status === 'running' && (
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
              {'>'} INITIALIZING PIPELINE: {run.projectName}
              <br/>{'>'} PARALLEL THREADS: {run.parallelCount}
              <br/>{'>'} AGENTS: {run.agentKeys.join(', ')}
            </div>
            
            {run.logs?.map((log) => (
              <LogEntry key={log.id} log={log} />
            ))}
            <div ref={logsEndRef} />
            
            {run.status === 'running' && (
              <div className="flex items-center gap-2 text-primary mt-4 opacity-50">
                <Activity className="w-4 h-4 animate-spin" /> RUNNING...
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

function LogEntry({ log }: { log: any }) {
  const [expanded, setExpanded] = useState(false);
  
  const colors = {
    info: 'text-blue-400',
    warn: 'text-yellow-400',
    error: 'text-red-400',
    think: 'text-purple-400',
    output: 'text-green-400'
  };

  const levelColor = colors[log.level as keyof typeof colors] || 'text-gray-400';

  return (
    <div className="flex flex-col gap-1 py-1 hover:bg-white/5 px-2 -mx-2 rounded transition-colors group">
      <div className="flex items-start gap-3">
        <span className="text-xs opacity-50 shrink-0 w-24">
          {new Date(log.createdAt).toLocaleTimeString(undefined, { hour12: false, fractionalSecondDigits: 3 })}
        </span>
        <Badge variant="outline" className={`shrink-0 text-[10px] rounded bg-white/5 border-white/10 ${levelColor}`}>
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
