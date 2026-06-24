import { useQuery } from "@tanstack/react-query";
import { useGetStats, useListActivity } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Cpu, Play, CheckCircle2, XCircle, HardDrive, Terminal, Zap, MemoryStick, Server, Gauge } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface CapacitySnapshot {
  totalRamMB: number;
  freeRamMB: number;
  usedRamMB: number;
  ramUsedPercent: number;
  cpuLoad1m: number;
  cpuCount: number;
  cpuLoadPercent: number;
  maxConcurrent: number;
  currentlyRunning: number;
  queued: number;
  updatedAt: string;
}

function useCapacity() {
  return useQuery<CapacitySnapshot>({
    queryKey: ["capacity"],
    queryFn: async () => {
      const r = await fetch("/api/capacity");
      if (!r.ok) throw new Error("capacity fetch failed");
      return r.json();
    },
    refetchInterval: 4000,
  });
}

export default function Dashboard() {
  const { data: stats } = useGetStats({ query: { refetchInterval: 5000 } });
  const { data: activity } = useListActivity({ limit: 20 }, { query: { refetchInterval: 5000 } });
  const { data: cap } = useCapacity();

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Overview</h1>
          <p className="text-muted-foreground font-mono mt-1">Live metrics and recent cluster activity</p>
        </div>
      </div>

      {/* ── Capacity Panel ─────────────────────────────────────────────────── */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-mono text-cyan-400 uppercase tracking-wider">Dynamic Capacity</span>
          <span className="text-xs font-mono text-muted-foreground ml-auto">
            updated {cap ? new Date(cap.updatedAt).toLocaleTimeString() : "—"}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          {/* Max Concurrent Agents */}
          <Card className="bg-cyan-950/30 border-cyan-400/30">
            <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-4">
              <CardTitle className="text-xs font-mono text-cyan-300/70">MAX CONCURRENT</CardTitle>
              <Gauge className="w-4 h-4 text-cyan-400" />
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="text-3xl font-bold font-mono text-cyan-300">
                {cap ? cap.maxConcurrent.toLocaleString() : <span className="opacity-40">—</span>}
              </div>
              <div className="text-xs font-mono text-muted-foreground mt-0.5">agents / run</div>
            </CardContent>
          </Card>

          {/* Currently Running */}
          <Card className="bg-green-950/30 border-green-400/30">
            <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-4">
              <CardTitle className="text-xs font-mono text-green-300/70">RUNNING NOW</CardTitle>
              <Play className="w-4 h-4 text-green-400" />
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="text-3xl font-bold font-mono text-green-300">
                {cap ? cap.currentlyRunning : <span className="opacity-40">—</span>}
              </div>
              <div className="text-xs font-mono text-muted-foreground mt-0.5">
                {cap && cap.queued > 0 ? `+${cap.queued} queued` : "0 queued"}
              </div>
            </CardContent>
          </Card>

          {/* RAM */}
          <Card className="bg-purple-950/30 border-purple-400/30">
            <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-4">
              <CardTitle className="text-xs font-mono text-purple-300/70">RAM FREE</CardTitle>
              <MemoryStick className="w-4 h-4 text-purple-400" />
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="text-3xl font-bold font-mono text-purple-300">
                {cap ? `${cap.freeRamMB.toLocaleString()}` : <span className="opacity-40">—</span>}
                <span className="text-sm font-normal ml-1 text-purple-400/70">MB</span>
              </div>
              <div className="text-xs font-mono text-muted-foreground mt-0.5">
                {cap ? `${cap.ramUsedPercent}% used of ${(cap.totalRamMB / 1024).toFixed(1)}GB` : ""}
              </div>
            </CardContent>
          </Card>

          {/* CPU */}
          <Card className="bg-amber-950/30 border-amber-400/30">
            <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-4">
              <CardTitle className="text-xs font-mono text-amber-300/70">CPU LOAD</CardTitle>
              <Server className="w-4 h-4 text-amber-400" />
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="text-3xl font-bold font-mono text-amber-300">
                {cap ? `${cap.cpuLoadPercent}` : <span className="opacity-40">—</span>}
                <span className="text-sm font-normal ml-1 text-amber-400/70">%</span>
              </div>
              <div className="text-xs font-mono text-muted-foreground mt-0.5">
                {cap ? `load ${cap.cpuLoad1m} across ${cap.cpuCount} cores` : ""}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RAM usage bar */}
        {cap && (
          <div className="bg-card border border-border rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-muted-foreground">Memory pressure</span>
              <span className="text-xs font-mono">
                <span className={cap.ramUsedPercent > 80 ? "text-red-400" : cap.ramUsedPercent > 60 ? "text-amber-400" : "text-green-400"}>
                  {cap.ramUsedPercent}%
                </span>
                <span className="text-muted-foreground ml-1">used</span>
              </span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  cap.ramUsedPercent > 80 ? "bg-red-500" : cap.ramUsedPercent > 60 ? "bg-amber-500" : "bg-green-500"
                }`}
                style={{ width: `${cap.ramUsedPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs font-mono text-muted-foreground">
                Capacity scales automatically — more free RAM = more concurrent agents
              </span>
              <span className="text-xs font-mono text-cyan-400">
                up to {cap.maxConcurrent.toLocaleString()} agents
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Stats Cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard title="Active Agents" value={stats?.totalAgents} icon={Cpu} />
        <StatCard title="Active Runs" value={stats?.activeRuns} icon={Play} className="border-primary/50 bg-primary/5" />
        <StatCard title="Completed Runs" value={stats?.completedRuns} icon={CheckCircle2} className="text-green-500" />
        <StatCard title="Failed Runs" value={stats?.failedRuns} icon={XCircle} className="text-destructive" />
        <StatCard title="Snapshots" value={stats?.totalSnapshots} icon={HardDrive} />
        <StatCard title="Total Logs" value={stats?.totalLogs} icon={Terminal} />
        <StatCard title="Recent Throughput" value={stats?.recentThroughput} suffix="req/s" icon={Activity} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="w-5 h-5 text-primary" />
              Activity Stream
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
              {activity?.map((entry) => (
                <div key={entry.id} className="flex flex-col gap-1 pb-3 border-b border-border/50 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-muted-foreground">{formatDate(entry.createdAt)}</span>
                    <span className="font-mono text-xs text-primary bg-primary/10 px-2 py-0.5 rounded">{entry.type}</span>
                  </div>
                  <p className="text-sm">{entry.message}</p>
                </div>
              ))}
              {!activity?.length && <div className="text-muted-foreground text-sm font-mono">No recent activity.</div>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, className, suffix }: { title: string; value?: number; icon: any; className?: string; suffix?: string }) {
  return (
    <Card className={`bg-card ${className || ''}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="w-4 h-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold font-mono">
          {value !== undefined ? value : <span className="opacity-50">-</span>}
          {suffix && value !== undefined && <span className="text-sm ml-1 text-muted-foreground font-sans">{suffix}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
