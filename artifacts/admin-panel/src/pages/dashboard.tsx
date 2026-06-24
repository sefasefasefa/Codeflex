import { useGetStats, useListActivity, getGetStatsQueryKey, getListActivityQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Layers, MessageSquare, FileText, Terminal } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function Dashboard() {
  const { data: stats } = useGetStats({ query: { queryKey: getGetStatsQueryKey(), refetchInterval: 5000 } });
  const { data: activity } = useListActivity({ limit: 20 }, { query: { queryKey: getListActivityQueryKey({ limit: 20 }), refetchInterval: 5000 } });

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground font-mono mt-1">System overview</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <StatCard title="Projects" value={stats?.totalProjects} icon={Layers} />
        <StatCard title="Files" value={stats?.totalFiles} icon={FileText} />
        <StatCard title="Conversations" value={stats?.totalConversations} icon={MessageSquare} />
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

        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Terminal className="w-5 h-5 text-primary" />
              Quick Links
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <a href="/chat" className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                <MessageSquare className="w-4 h-4 text-primary" />
                <span className="font-mono text-sm">Chat</span>
              </a>
              <a href="/projects" className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                <Layers className="w-4 h-4 text-primary" />
                <span className="font-mono text-sm">Projects</span>
              </a>
              <a href="/studio/" className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                <Terminal className="w-4 h-4 text-primary" />
                <span className="font-mono text-sm">AI Studio</span>
              </a>
              <a href="/cli/" className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                <Terminal className="w-4 h-4 text-primary" />
                <span className="font-mono text-sm">CLI Web</span>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon }: { title: string; value?: number; icon: any }) {
  return (
    <Card className="bg-card">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="w-4 h-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold font-mono">
          {value !== undefined ? value : <span className="opacity-50">-</span>}
        </div>
      </CardContent>
    </Card>
  );
}
