import { useState } from "react";
import { Link, useRoute } from "wouter";
import {
  useGetProject, useListProjectFiles, useGetProjectFile,
  useCreateRun, useUpdateProjectMemory, useListAgents,
  getGetProjectQueryKey, getListProjectFilesQueryKey, getListRunsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Brain, FileCode2, Play, Plus, ChevronRight, Clock, Cpu,
  FolderOpen, File, ChevronDown, ChevronRight as ChevronRightSm,
  ArrowLeft, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatRelative } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  initialized: "text-cyan-400 bg-cyan-400/10 border-cyan-400/30",
  active: "text-green-400 bg-green-400/10 border-green-400/30",
  paused: "text-amber-400 bg-amber-400/10 border-amber-400/30",
  completed: "text-slate-400 bg-slate-400/10 border-slate-400/30",
};

const LOG_LEVEL_STYLES: Record<string, string> = {
  info: "text-cyan-400",
  warn: "text-amber-400",
  error: "text-red-400",
  think: "text-purple-400",
  output: "text-green-400",
  file: "text-cyan-300",
};

const LANG_COLORS: Record<string, string> = {
  typescript: "text-blue-400",
  javascript: "text-yellow-400",
  python: "text-yellow-300",
  sql: "text-green-400",
  markdown: "text-slate-400",
  json: "text-orange-400",
  text: "text-slate-400",
};

type FileNode = { name: string; path: string; type: "file" | "dir"; language?: string; children?: FileNode[] };

function buildFileTree(files: Array<{ path: string; language: string; id: string }>): FileNode[] {
  const root: FileNode[] = [];
  const dirs = new Map<string, FileNode>();

  const getOrCreateDir = (dirPath: string): FileNode => {
    if (dirs.has(dirPath)) return dirs.get(dirPath)!;
    const parts = dirPath.split("/");
    const name = parts[parts.length - 1] ?? dirPath;
    const node: FileNode = { name, path: dirPath, type: "dir", children: [] };
    dirs.set(dirPath, node);
    if (parts.length > 1) {
      const parentPath = parts.slice(0, -1).join("/");
      const parent = getOrCreateDir(parentPath);
      parent.children!.push(node);
    } else {
      root.push(node);
    }
    return node;
  };

  for (const f of files) {
    const parts = f.path.split("/");
    const fileName = parts[parts.length - 1] ?? f.path;
    const fileNode: FileNode = { name: fileName, path: f.path, type: "file", language: f.language };
    if (parts.length > 1) {
      const dirPath = parts.slice(0, -1).join("/");
      const dir = getOrCreateDir(dirPath);
      dir.children!.push(fileNode);
    } else {
      root.push(fileNode);
    }
  }
  return root;
}

function TreeNode({ node, onSelect, selectedPath }: { node: FileNode; onSelect: (path: string) => void; selectedPath: string | null }) {
  const [open, setOpen] = useState(true);
  if (node.type === "dir") {
    return (
      <div>
        <button
          className="flex items-center gap-1.5 w-full text-left px-2 py-0.5 hover:bg-white/5 rounded text-xs text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setOpen(o => !o)}
        >
          {open ? <ChevronDown className="w-3 h-3 shrink-0" /> : <ChevronRightSm className="w-3 h-3 shrink-0" />}
          <FolderOpen className="w-3 h-3 shrink-0 text-amber-400/70" />
          <span className="font-mono truncate">{node.name}</span>
        </button>
        {open && node.children && (
          <div className="pl-4">
            {node.children.map(c => <TreeNode key={c.path} node={c} onSelect={onSelect} selectedPath={selectedPath} />)}
          </div>
        )}
      </div>
    );
  }
  return (
    <button
      className={`flex items-center gap-1.5 w-full text-left px-2 py-0.5 rounded text-xs transition-colors ${selectedPath === node.path ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-white/5 hover:text-foreground"}`}
      onClick={() => onSelect(node.path)}
    >
      <File className={`w-3 h-3 shrink-0 ${LANG_COLORS[node.language ?? "text"] ?? "text-slate-400"}`} />
      <span className="font-mono truncate">{node.name}</span>
    </button>
  );
}

export default function ProjectDetail() {
  const [, params] = useRoute("/projects/:projectId");
  const projectId = params?.projectId ?? "";
  const qc = useQueryClient();

  const { data: proj, isLoading } = useGetProject(projectId, {
    query: { queryKey: getGetProjectQueryKey(projectId), refetchInterval: 5000 },
  });
  const { data: files = [] } = useListProjectFiles(projectId, {
    query: { queryKey: getListProjectFilesQueryKey(projectId), refetchInterval: 5000 },
  });
  const { mutateAsync: createRun } = useCreateRun();
  const { mutateAsync: updateMemory } = useUpdateProjectMemory();
  const { data: agents = [] } = useListAgents();

  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"files" | "history">("files");
  const [showRun, setShowRun] = useState(false);
  const [showAddFact, setShowAddFact] = useState(false);
  const [runForm, setRunForm] = useState({ prompt: "", agentKeys: [] as string[], parallelCount: 5 });
  const [factForm, setFactForm] = useState({ key: "", value: "", source: "user" });
  const [running, setRunning] = useState(false);
  const [addingFact, setAddingFact] = useState(false);

  const fileMap = new Map(files.map(f => [f.path, f]));
  const fileTree = buildFileTree(files);

  const { data: fileDetail } = useGetProjectFile(projectId, selectedFileId ?? "", {
    query: { enabled: !!selectedFileId },
  });

  const handleFileSelect = (path: string) => {
    const f = fileMap.get(path);
    if (f) { setSelectedFilePath(path); setSelectedFileId(f.id); setActiveTab("files"); }
  };

  const handleRun = async () => {
    if (!runForm.prompt.trim() || !runForm.agentKeys.length) return;
    setRunning(true);
    try {
      await createRun({ data: { projectId, projectName: proj!.name, prompt: runForm.prompt, agentKeys: runForm.agentKeys, parallelCount: runForm.parallelCount } });
      qc.invalidateQueries({ queryKey: getListRunsQueryKey() });
      qc.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
      setShowRun(false);
      setRunForm({ prompt: "", agentKeys: [], parallelCount: 5 });
    } finally { setRunning(false); }
  };

  const handleAddFact = async () => {
    if (!factForm.key.trim() || !factForm.value.trim()) return;
    setAddingFact(true);
    try {
      await updateMemory({ projectId, data: { facts: [factForm] } });
      qc.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
      setShowAddFact(false);
      setFactForm({ key: "", value: "", source: "user" });
    } finally { setAddingFact(false); }
  };

  const toggleAgent = (key: string) => {
    setRunForm(f => ({ ...f, agentKeys: f.agentKeys.includes(key) ? f.agentKeys.filter(k => k !== key) : [...f.agentKeys, key] }));
  };

  const memory = proj?.memory as { facts: Array<{ key: string; value: string; source: string; createdAt: string }>; summary: string; lastUpdated: string } | undefined;
  const recentRuns = (proj as any)?.recentRuns as Array<{ id: string; status: string; prompt: string; filesWritten: number; agentKeys: string[]; createdAt: string }> ?? [];

  if (isLoading) return (
    <div className="p-6 text-muted-foreground font-mono text-sm animate-pulse">Loading project...</div>
  );
  if (!proj) return (
    <div className="p-6 text-red-400 font-mono text-sm">Project not found.</div>
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center gap-3 shrink-0">
        <Link href="/projects">
          <Button variant="ghost" size="icon" className="w-7 h-7"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="font-mono font-bold text-foreground truncate">{proj.name}</span>
          {proj.stack && <span className="text-xs font-mono text-cyan-400/70 hidden md:block">{proj.stack}</span>}
          <Badge variant="outline" className={`text-xs border ${STATUS_COLORS[proj.status] ?? ""}`}>{proj.status}</Badge>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
          <span>{proj.totalRuns} runs</span>
          <span className="opacity-40">·</span>
          <span>{proj.totalFiles} files</span>
          <span className="opacity-40">·</span>
          <span>{formatRelative(proj.updatedAt)}</span>
        </div>
        <Button
          size="sm" className="gap-1.5 text-xs bg-green-500 hover:bg-green-400 text-green-950"
          onClick={() => { setShowRun(true); setRunForm({ prompt: "", agentKeys: [], parallelCount: 5 }); }}
        >
          <Play className="w-3.5 h-3.5" /> Continue
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: File Tree */}
        <div className="w-56 shrink-0 border-r border-border flex flex-col overflow-hidden bg-background">
          <div className="px-3 py-2 border-b border-border/50 flex items-center gap-2">
            <FileCode2 className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Files</span>
            <span className="ml-auto text-xs font-mono text-muted-foreground">{files.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto py-1 px-1">
            {fileTree.length === 0 ? (
              <div className="px-3 py-4 text-xs text-muted-foreground font-mono opacity-60">No files yet. Run agents to generate files.</div>
            ) : (
              fileTree.map(node => <TreeNode key={node.path} node={node} onSelect={handleFileSelect} selectedPath={selectedFilePath} />)
            )}
          </div>
        </div>

        {/* Center: Content View */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="border-b border-border/50 flex items-center gap-0 px-3 shrink-0">
            {(["files", "history"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-xs font-mono uppercase tracking-wider border-b-2 transition-colors ${activeTab === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
              >
                {tab === "files" ? `File ${selectedFilePath ? `— ${selectedFilePath.split("/").pop()}` : "Viewer"}` : "Run History"}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto">
            {activeTab === "files" && (
              <>
                {!selectedFilePath ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <FileCode2 className="w-10 h-10 mb-3 opacity-20" />
                    <p className="font-mono text-sm">Select a file from the tree</p>
                  </div>
                ) : fileDetail ? (
                  <div className="p-0">
                    <div className="flex items-center gap-2 px-4 py-2 border-b border-border/40 bg-background/50">
                      <span className="font-mono text-xs text-cyan-400">{fileDetail.path}</span>
                      <Badge variant="outline" className="text-xs font-mono ml-auto">{fileDetail.language}</Badge>
                      <Badge variant="outline" className="text-xs font-mono">v{fileDetail.version}</Badge>
                      <Badge variant="outline" className="text-xs font-mono">{fileDetail.agentKey}</Badge>
                    </div>
                    <div className="overflow-auto">
                      <pre className="p-4 text-xs font-mono text-foreground/90 whitespace-pre leading-relaxed">
                        {fileDetail.content.split("\n").map((line, i) => (
                          <div key={i} className="flex">
                            <span className="select-none w-8 shrink-0 text-right pr-3 text-muted-foreground/40">{i + 1}</span>
                            <span>{line}</span>
                          </div>
                        ))}
                      </pre>
                    </div>
                    {fileDetail.history && fileDetail.history.length > 1 && (
                      <div className="border-t border-border/40 px-4 py-3">
                        <p className="text-xs font-mono text-muted-foreground mb-2">VERSION HISTORY ({fileDetail.history.length})</p>
                        <div className="space-y-1">
                          {fileDetail.history.map(h => (
                            <div key={h.version} className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                              <span className="text-cyan-400">v{h.version}</span>
                              <span>{h.operation}</span>
                              <span>by {h.agentKey}</span>
                              <span className="ml-auto">{formatRelative(h.createdAt)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <RefreshCw className="w-4 h-4 animate-spin mr-2" /><span className="font-mono text-sm">Loading...</span>
                  </div>
                )}
              </>
            )}
            {activeTab === "history" && (
              <div className="p-4 space-y-3">
                {recentRuns.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Clock className="w-8 h-8 mx-auto mb-3 opacity-20" />
                    <p className="font-mono text-sm">No runs yet for this project.</p>
                  </div>
                ) : recentRuns.map(run => (
                  <Link key={run.id} href={`/runs/${run.id}`}>
                    <motion.div
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="border border-border rounded p-3 hover:border-primary/40 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-mono px-2 py-0.5 rounded border ${run.status === "completed" ? "text-green-400 bg-green-400/10 border-green-400/30" : run.status === "running" ? "text-cyan-400 bg-cyan-400/10 border-cyan-400/30" : run.status === "failed" ? "text-red-400 bg-red-400/10 border-red-400/30" : "text-slate-400"}`}>
                          {run.status}
                        </span>
                        <span className="font-mono text-xs text-muted-foreground">{run.id}</span>
                        <span className="text-xs font-mono text-cyan-400 ml-auto">{run.filesWritten} files</span>
                        <span className="text-xs text-muted-foreground">{formatRelative(run.createdAt)}</span>
                        <ChevronRight className="w-3 h-3 text-muted-foreground" />
                      </div>
                      <p className="text-sm text-muted-foreground mt-1.5 line-clamp-1">{run.prompt}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {run.agentKeys.map(k => <span key={k} className="text-xs font-mono text-purple-400/70 bg-purple-400/5 border border-purple-400/20 rounded px-1.5 py-0.5">{k}</span>)}
                      </div>
                    </motion.div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Memory Panel */}
        <div className="w-72 shrink-0 border-l border-border flex flex-col overflow-hidden bg-background">
          <div className="px-3 py-2 border-b border-border/50 flex items-center gap-2">
            <Brain className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Project Memory</span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {memory?.summary && (
              <div className="bg-purple-400/5 border border-purple-400/20 rounded p-3">
                <p className="text-xs font-mono text-purple-300/90 leading-relaxed">{memory.summary}</p>
                {memory.lastUpdated && (
                  <p className="text-xs font-mono text-muted-foreground mt-1.5">{formatRelative(memory.lastUpdated)}</p>
                )}
              </div>
            )}

            {memory?.facts && memory.facts.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">FACTS ({memory.facts.length})</p>
                {memory.facts.map((f, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="border border-border/50 rounded p-2 space-y-0.5"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-mono text-foreground/90 truncate">{f.key.replace(/_/g, " ")}</span>
                      <span className="text-xs font-mono text-purple-400/70 shrink-0">[{f.source}]</span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{f.value}</p>
                  </motion.div>
                ))}
              </div>
            )}

            {(!memory?.facts || memory.facts.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                <Brain className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p className="text-xs font-mono">No memory yet. Run agents to populate.</p>
              </div>
            )}
          </div>

          <div className="p-3 border-t border-border/50 space-y-2">
            <Button
              variant="outline" size="sm" className="w-full gap-1.5 text-xs"
              onClick={() => setShowAddFact(true)}
            >
              <Plus className="w-3.5 h-3.5" /> Add Memory Fact
            </Button>
            <Button
              size="sm" className="w-full gap-1.5 text-xs bg-green-500 hover:bg-green-400 text-green-950"
              onClick={() => { setShowRun(true); setRunForm({ prompt: "", agentKeys: [], parallelCount: 5 }); }}
            >
              <Play className="w-3.5 h-3.5" /> Continue Project
            </Button>
          </div>
        </div>
      </div>

      {/* Run Dialog */}
      <Dialog open={showRun} onOpenChange={setShowRun}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-mono">Continue — {proj.name}</DialogTitle>
          </DialogHeader>
          {memory?.summary && (
            <div className="bg-purple-400/5 border border-purple-400/20 rounded p-3">
              <p className="text-xs font-mono text-purple-300/80 leading-relaxed">{memory.summary}</p>
            </div>
          )}
          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label className="text-xs font-mono text-muted-foreground">WHAT SHOULD AGENTS DO NEXT?</Label>
              <Textarea
                placeholder="Continue from where we left off..."
                value={runForm.prompt}
                onChange={e => setRunForm(f => ({ ...f, prompt: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-mono text-muted-foreground">SELECT AGENTS ({runForm.agentKeys.length})</Label>
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
              <Label className="text-xs font-mono text-muted-foreground">PARALLEL: {runForm.parallelCount}</Label>
              <input type="range" min={1} max={Math.min(500, agents.length || 10)} value={runForm.parallelCount} onChange={e => setRunForm(f => ({ ...f, parallelCount: Number(e.target.value) }))} className="w-full accent-cyan-400" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRun(false)}>Cancel</Button>
            <Button onClick={handleRun} disabled={running || !runForm.prompt.trim() || !runForm.agentKeys.length} className="gap-2 bg-green-500 hover:bg-green-400 text-green-950">
              <Play className="w-4 h-4" /> {running ? "Starting..." : "Start Run"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Fact Dialog */}
      <Dialog open={showAddFact} onOpenChange={setShowAddFact}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle className="font-mono">Add Memory Fact</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-mono text-muted-foreground">KEY</Label>
              <Input placeholder="tech_stack" value={factForm.key} onChange={e => setFactForm(f => ({ ...f, key: e.target.value }))} className="font-mono text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-mono text-muted-foreground">VALUE</Label>
              <Textarea placeholder="What should the agents remember?" value={factForm.value} onChange={e => setFactForm(f => ({ ...f, value: e.target.value }))} rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-mono text-muted-foreground">SOURCE</Label>
              <Input placeholder="user" value={factForm.source} onChange={e => setFactForm(f => ({ ...f, source: e.target.value }))} className="font-mono text-xs" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddFact(false)}>Cancel</Button>
            <Button onClick={handleAddFact} disabled={addingFact || !factForm.key.trim() || !factForm.value.trim()}>
              {addingFact ? "Saving..." : "Save Fact"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
