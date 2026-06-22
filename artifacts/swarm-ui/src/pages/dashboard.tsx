import { useGetStats, useListActivity, getGetStatsQueryKey, getListActivityQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Cpu, Play, CheckCircle2, XCircle, HardDrive, Terminal } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function Dashboard() {
  const { data: stats } = useGetStats({ query: { refetchInterval: 5000 } });
  const { data: activity } = useListActivity({ limit: 20 }, { query: { refetchInterval: 5000 } });

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Overview</h1>
          <p className="text-muted-foreground font-mono mt-1">Live metrics and recent cluster activity</p>
        </div>
      </div>

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
