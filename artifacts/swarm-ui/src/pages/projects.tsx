import { useState } from "react";
import { Link } from "wouter";
import { useListProjects, useCreateProject, useDeleteProject, useCreateRun, useListAgents, getListProjectsQueryKey, getListRunsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { FolderOpen, Plus, Play, Trash2, Brain, FileCode2, ChevronRight, Clock, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, formatRelative } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  initialized: "text-cyan-400 bg-cyan-400/10 border-cyan-400/30",
  active: "text-green-400 bg-green-400/10 border-green-400/30",
  paused: "text-amber-400 bg-amber-400/10 border-amber-400/30",
  completed: "text-slate-400 bg-slate-400/10 border-slate-400/30",
};

export default function Projects() {
  const qc = useQueryClient();
  const { data: projects = [], isLoading } = useListProjects();
  const { mutateAsync: createProject } = useCreateProject();
  const { mutateAsync: deleteProject } = useDeleteProject();
  const { mutateAsync: createRun } = useCreateRun();
  const { data: agents = [] } = useListAgents();

  const [showCreate, setShowCreate] = useState(false);
  const [showRun, setShowRun] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "", stack: "" });
  const [runForm, setRunForm] = useState({ prompt: "", agentKeys: [] as string[], parallelCount: 5 });
  const [creating, setCreating] = useState(false);
  const [running, setRunning] = useState(false);

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    setCreating(true);
    try {
      await createProject({ data: { name: form.name.trim(), description: form.description, stack: form.stack } });
      qc.invalidateQueries({ queryKey: getListProjectsQueryKey() });
      setShowCreate(false);
      setForm({ name: "", description: "", stack: "" });
    } finally {
      setCreating(false);
    }
  };

  const handleRun = async () => {
    if (!showRun || !runForm.prompt.trim() || !runForm.agentKeys.length) return;
    const proj = projects.find(p => p.id === showRun);
    if (!proj) return;
    setRunning(true);
    try {
      await createRun({ data: { projectId: showRun, projectName: proj.name, prompt: runForm.prompt, agentKeys: runForm.agentKeys, parallelCount: runForm.parallelCount } });
      qc.invalidateQueries({ queryKey: getListRunsQueryKey() });
      setShowRun(null);
      setRunForm({ prompt: "", agentKeys: [], parallelCount: 5 });
    } finally {
      setRunning(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteProject({ agentId: id });
    qc.invalidateQueries({ queryKey: getListProjectsQueryKey() });
  };

  const toggleAgent = (key: string) => {
    setRunForm(f => ({
      ...f,
      agentKeys: f.agentKeys.includes(key) ? f.agentKeys.filter(k => k !== key) : [...f.agentKeys, key],
    }));
  };

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground font-mono mt-1 text-sm">Each project accumulates memory and files across runs</p>
        </div>
        <Button onClick={() => setShowCreate(true)} size="sm" className="gap-2">
          <Plus className="w-4 h-4" /> New Project
        </Button>
      </div>

      {isLoading && (
        <div className="text-muted-foreground font-mono text-sm animate-pulse">Loading projects...</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <AnimatePresence>
          {projects.map((proj, i) => {
            const mem = (proj as any).memory as { facts: Array<{ key: string; value: string; source: string }>; summary: string } | undefined;
            const recentFacts = mem?.facts?.slice(-2) ?? [];
            return (
              <motion.div
                key={proj.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.04 }}
                className="border border-border bg-card rounded-lg p-4 flex flex-col gap-3 hover:border-primary/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <Link href={`/projects/${proj.id}`}>
                      <h3 className="font-mono font-semibold text-foreground hover:text-primary transition-colors cursor-pointer truncate">
                        {proj.name}
                      </h3>
                    </Link>
                    {proj.stack && (
                      <span className="text-xs font-mono text-cyan-400/70 mt-0.5 block">{proj.stack}</span>
                    )}
                  </div>
                  <Badge variant="outline" className={`text-xs shrink-0 border ${STATUS_COLORS[proj.status] ?? "text-slate-400"}`}>
                    {proj.status}
                  </Badge>
                </div>

                {proj.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{proj.description}</p>
                )}

                <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono">
                  <span className="flex items-center gap-1"><Play className="w-3 h-3" />{proj.totalRuns} runs</span>
                  <span className="flex items-center gap-1"><FileCode2 className="w-3 h-3" />{proj.totalFiles} files</span>
                  <span className="flex items-center gap-1 ml-auto"><Clock className="w-3 h-3" />{formatRelative(proj.updatedAt)}</span>
                </div>

                {recentFacts.length > 0 && (
                  <div className="border-t border-border/50 pt-2 flex flex-wrap gap-1">
                    {recentFacts.map((f, fi) => (
                      <span key={fi} className="text-xs font-mono text-purple-400/80 bg-purple-400/5 border border-purple-400/20 rounded px-2 py-0.5 flex items-center gap-1">
                        <Brain className="w-2.5 h-2.5" />
                        {f.key.replace(/_/g, " ")}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <Link href={`/projects/${proj.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs">
                      <FolderOpen className="w-3.5 h-3.5" /> Open <ChevronRight className="w-3 h-3 ml-auto" />
                    </Button>
                  </Link>
                  <Button
                    size="sm" variant="outline"
                    className="gap-1.5 text-xs text-green-400 border-green-400/30 hover:bg-green-400/10"
                    onClick={() => { setShowRun(proj.id); setRunForm({ prompt: "", agentKeys: [], parallelCount: 5 }); }}
                  >
                    <Play className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="sm" variant="outline"
                    className="gap-1.5 text-xs text-red-400 border-red-400/30 hover:bg-red-400/10"
                    onClick={() => handleDelete(proj.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {!isLoading && projects.length === 0 && (
        <div className="text-center py-24 text-muted-foreground">
          <Layers className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p className="font-mono text-sm">No projects yet. Create one to get started.</p>
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle className="font-mono">New Project</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-mono text-muted-foreground">PROJECT NAME</Label>
              <Input
                placeholder="my-project"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-mono text-muted-foreground">DESCRIPTION</Label>
              <Textarea
                placeholder="What will this project build?"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-mono text-muted-foreground">TECH STACK</Label>
              <Input
                placeholder="TypeScript + PostgreSQL + Express"
                value={form.stack}
                onChange={e => setForm(f => ({ ...f, stack: e.target.value }))}
                className="font-mono text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating || !form.name.trim()}>
              {creating ? "Creating..." : "Create Project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!showRun} onOpenChange={() => setShowRun(null)}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-mono">Start Run — {projects.find(p => p.id === showRun)?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-mono text-muted-foreground">OBJECTIVE PROMPT</Label>
              <Textarea
                placeholder="What should the agents build or fix?"
                value={runForm.prompt}
                onChange={e => setRunForm(f => ({ ...f, prompt: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-mono text-muted-foreground">SELECT AGENTS ({runForm.agentKeys.length} selected)</Label>
              <div className="flex flex-wrap gap-2">
                {agents.map(a => (
                  <button
                    key={a.key}
                    onClick={() => toggleAgent(a.key)}
                    className={`text-xs font-mono px-2.5 py-1 rounded border transition-colors ${runForm.agentKeys.includes(a.key) ? "bg-primary/20 border-primary text-primary" : "bg-background border-border text-muted-foreground hover:border-primary/50"}`}
                  >
                    {a.key}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-mono text-muted-foreground">PARALLEL AGENTS: {runForm.parallelCount}</Label>
              <input
                type="range" min={1} max={Math.min(500, agents.length || 10)}
                value={runForm.parallelCount}
                onChange={e => setRunForm(f => ({ ...f, parallelCount: Number(e.target.value) }))}
                className="w-full accent-cyan-400"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRun(null)}>Cancel</Button>
            <Button
              onClick={handleRun}
              disabled={running || !runForm.prompt.trim() || !runForm.agentKeys.length}
              className="gap-2 text-green-900 bg-green-400 hover:bg-green-300"
            >
              <Play className="w-4 h-4" /> {running ? "Starting..." : "Start Run"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
