import { useState } from "react";
import { Link } from "wouter";
import { useListRuns, getListRunsQueryKey, useCreateRun, useListAgents } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Search, Plus, Terminal } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";

export default function Runs() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { data: runs } = useListRuns(statusFilter !== "all" ? { status: statusFilter as any } : {}, { query: { refetchInterval: 3000 } });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-primary/20 text-primary border-primary/50';
      case 'completed': return 'bg-green-500/20 text-green-500 border-green-500/50';
      case 'failed': return 'bg-destructive/20 text-destructive border-destructive/50';
      case 'queued': return 'bg-muted text-muted-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pipeline Runs</h1>
          <p className="text-muted-foreground font-mono mt-1">Manage and monitor orchestration pipelines</p>
        </div>
        <CreateRunDialog />
      </div>

      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search runs by project..." className="pl-9 bg-card font-mono" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px] bg-card">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="running">Running</SelectItem>
            <SelectItem value="queued">Queued</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="grid gap-4">
          {runs?.map((run) => (
            <Link key={run.id} href={`/runs/${run.id}`}>
              <Card className="bg-card hover:bg-accent/5 transition-colors cursor-pointer border-border">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded bg-secondary flex items-center justify-center">
                      <Terminal className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg">{run.projectName}</span>
                        <Badge variant="outline" className={getStatusColor(run.status)}>{run.status}</Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground font-mono">
                        <span>ID: {run.id.substring(0, 8)}</span>
                        <span>•</span>
                        <span>Agents: {run.agentKeys.length}</span>
                        <span>•</span>
                        <span>Parallel: {run.parallelCount}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right text-sm text-muted-foreground font-mono">
                    <div>{formatDate(run.createdAt)}</div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
          {!runs?.length && (
            <div className="text-center p-12 text-muted-foreground font-mono">No runs found.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function CreateRunDialog() {
  const [open, setOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [parallelCount, setParallelCount] = useState(10);
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  
  const { data: agents } = useListAgents();
  const createRun = useCreateRun();
  const queryClient = useQueryClient();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createRun.mutate({
      data: {
        projectName,
        prompt,
        agentKeys: selectedAgents.length ? selectedAgents : (agents?.[0] ? [agents[0].key] : []),
        parallelCount
      }
    }, {
      onSuccess: () => {
        setOpen(false);
        queryClient.invalidateQueries({ queryKey: getListRunsQueryKey() });
        setProjectName("");
        setPrompt("");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 font-mono"><Plus className="w-4 h-4" /> NEW RUN</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-mono flex items-center gap-2">
            <Terminal className="w-5 h-5 text-primary" /> INITIALIZE_RUN
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="space-y-2">
            <Label>Project Name</Label>
            <Input required value={projectName} onChange={(e) => setProjectName(e.target.value)} className="font-mono bg-background" placeholder="e.g. core-auth-refactor" />
          </div>
          <div className="space-y-2">
            <Label>Objective Prompt</Label>
            <Textarea required value={prompt} onChange={(e) => setPrompt(e.target.value)} className="min-h-[120px] font-mono bg-background" placeholder="Describe the task..." />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Parallel Threads</Label>
              <span className="font-mono text-primary">{parallelCount}</span>
            </div>
            <Slider value={[parallelCount]} onValueChange={([v]) => setParallelCount(v)} min={1} max={500} step={1} />
          </div>
          <Button type="submit" className="w-full font-mono gap-2" disabled={createRun.isPending}>
            <Play className="w-4 h-4" /> {createRun.isPending ? "INITIALIZING..." : "EXECUTE"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
