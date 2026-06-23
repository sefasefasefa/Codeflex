import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import {
  Brain, CheckSquare, Clock, RefreshCw, Plus, Trash2, Copy,
  ChevronDown, ChevronUp, Download
} from "lucide-react";
import {
  MemoryFact, Checkpoint, Task,
  createFact, createTask, createCheckpoint,
  buildContextPackage, exportMemoryMd, exportCheckpointMd, exportProgressMd
} from "@/lib/contextManager";
import { countTokens } from "@/lib/compressor";

export default function ContextManager() {
  const [facts, setFacts] = useState<MemoryFact[]>([
    { id: "init1", key: "Proje", value: "Token sıkıştırma ve bağlam yönetim aracı", createdAt: new Date().toISOString() },
    { id: "init2", key: "Stack", value: "React + Vite, Tailwind, browser-only", createdAt: new Date().toISOString() },
  ]);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [editingFact, setEditingFact] = useState<string | null>(null);

  const [tasks, setTasks] = useState<Task[]>([
    { id: "t1", title: "Token sıkıştırıcı kur", status: "done", notes: "", createdAt: new Date().toISOString() },
    { id: "t2", title: "Context Manager ekle", status: "in_progress", notes: "Şu an yapılıyor", createdAt: new Date().toISOString() },
    { id: "t3", title: "Batch dosya modu", status: "todo", notes: "", createdAt: new Date().toISOString() },
  ]);
  const [newTask, setNewTask] = useState("");

  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [cpLabel, setCpLabel] = useState("");
  const [cpSummary, setCpSummary] = useState("");
  const [expandedCp, setExpandedCp] = useState<string | null>(null);

  const [lastMessages, setLastMessages] = useState("");
  const [contextLimit, setContextLimit] = useState(8000);
  const [contextPackage, setContextPackage] = useState<{ tokens: number; markdown: string } | null>(null);

  const addFact = () => {
    if (!newKey.trim() || !newValue.trim()) return;
    setFacts(prev => [...prev, createFact(newKey, newValue)]);
    setNewKey("");
    setNewValue("");
  };

  const deleteFact = (id: string) => setFacts(prev => prev.filter(f => f.id !== id));

  const updateFact = (id: string, field: "key" | "value", val: string) => {
    setFacts(prev => prev.map(f => f.id === id ? { ...f, [field]: val } : f));
  };

  const addTask = () => {
    if (!newTask.trim()) return;
    setTasks(prev => [...prev, createTask(newTask)]);
    setNewTask("");
  };

  const deleteTask = (id: string) => setTasks(prev => prev.filter(t => t.id !== id));

  const cycleStatus = (id: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== id) return t;
      const next: Record<Task["status"], Task["status"]> = { todo: "in_progress", in_progress: "done", done: "todo" };
      return { ...t, status: next[t.status] };
    }));
  };

  const updateTaskNotes = (id: string, notes: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, notes } : t));
  };

  const saveCheckpoint = () => {
    if (!cpLabel.trim() || !cpSummary.trim()) return;
    const cp = createCheckpoint(cpLabel, cpSummary, facts, tasks);
    setCheckpoints(prev => [cp, ...prev]);
    setCpLabel("");
    setCpSummary("");
  };

  const buildPackage = () => {
    const latest = checkpoints[0] ?? null;
    const pkg = buildContextPackage(latest, facts, tasks, lastMessages, contextLimit);
    setContextPackage(pkg);
  };

  const copy = (text: string) => navigator.clipboard.writeText(text);

  const statusColor = (s: Task["status"]) => {
    if (s === "done") return "text-green-500";
    if (s === "in_progress") return "text-yellow-500";
    return "text-muted-foreground";
  };

  const statusLabel = (s: Task["status"]) => {
    if (s === "done") return "Tamamlandı";
    if (s === "in_progress") return "Devam ediyor";
    return "Yapılacak";
  };

  const memTokens = countTokens(exportMemoryMd(facts));
  const progressTokens = countTokens(exportProgressMd(tasks));
  const latestCpTokens = checkpoints[0]?.tokenCount ?? 0;
  const totalContextTokens = memTokens + progressTokens + latestCpTokens;
  const usagePercent = Math.min(100, Math.round((totalContextTokens / contextLimit) * 100));

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col p-6 font-mono">
      <div className="mb-6 flex items-start justify-between border-b border-border pb-4">
        <div>
          <h2 className="text-lg font-bold text-primary flex items-center gap-2">
            <Brain className="h-5 w-5" /> CONTEXT_MANAGER
          </h2>
          <p className="text-xs text-muted-foreground mt-1">MEMORY · CHECKPOINT · PROGRESS · Bağlam yeniden kurma</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground mb-1">Bağlam kullanımı (tahmini)</div>
          <div className="flex items-center gap-2">
            <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${usagePercent > 80 ? "bg-red-500" : usagePercent > 50 ? "bg-yellow-500" : "bg-green-500"}`}
                style={{ width: `${usagePercent}%` }}
              />
            </div>
            <span className={`text-xs font-bold ${usagePercent > 80 ? "text-red-500" : usagePercent > 50 ? "text-yellow-500" : "text-green-500"}`}>
              {totalContextTokens.toLocaleString()} / {contextLimit.toLocaleString()} tok
            </span>
          </div>
        </div>
      </div>

      <Tabs defaultValue="memory" className="flex-1">
        <TabsList className="mb-4 bg-muted/50 border border-border">
          <TabsTrigger value="memory" className="font-mono text-xs uppercase tracking-wider">
            <Brain className="h-3 w-3 mr-1" /> Memory
          </TabsTrigger>
          <TabsTrigger value="progress" className="font-mono text-xs uppercase tracking-wider">
            <CheckSquare className="h-3 w-3 mr-1" /> Progress
          </TabsTrigger>
          <TabsTrigger value="checkpoint" className="font-mono text-xs uppercase tracking-wider">
            <Clock className="h-3 w-3 mr-1" /> Checkpoint
          </TabsTrigger>
          <TabsTrigger value="rebuild" className="font-mono text-xs uppercase tracking-wider">
            <RefreshCw className="h-3 w-3 mr-1" /> Yeniden Kur
          </TabsTrigger>
        </TabsList>

        {/* MEMORY TAB */}
        <TabsContent value="memory" className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{facts.length} gerçek · {memTokens} token</span>
            <Button size="sm" variant="outline" className="text-xs font-mono h-7" onClick={() => copy(exportMemoryMd(facts))}>
              <Copy className="h-3 w-3 mr-1" /> MEMORY.md kopyala
            </Button>
          </div>

          <div className="border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="font-mono text-xs w-1/3">Anahtar</TableHead>
                  <TableHead className="font-mono text-xs">Değer</TableHead>
                  <TableHead className="font-mono text-xs w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {facts.map(f => (
                  <TableRow key={f.id} className="border-border hover:bg-background/50">
                    <TableCell className="py-1">
                      {editingFact === f.id ? (
                        <Input
                          value={f.key}
                          onChange={e => updateFact(f.id, "key", e.target.value)}
                          className="h-7 text-xs font-mono bg-background"
                          data-testid={`input-fact-key-${f.id}`}
                        />
                      ) : (
                        <span
                          className="text-xs font-mono text-primary cursor-pointer"
                          onClick={() => setEditingFact(f.id)}
                          data-testid={`text-fact-key-${f.id}`}
                        >
                          {f.key}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="py-1">
                      {editingFact === f.id ? (
                        <Input
                          value={f.value}
                          onChange={e => updateFact(f.id, "value", e.target.value)}
                          onBlur={() => setEditingFact(null)}
                          className="h-7 text-xs font-mono bg-background"
                          data-testid={`input-fact-value-${f.id}`}
                        />
                      ) : (
                        <span
                          className="text-xs font-mono text-muted-foreground cursor-pointer"
                          onClick={() => setEditingFact(f.id)}
                          data-testid={`text-fact-value-${f.id}`}
                        >
                          {f.value}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="py-1">
                      <Button
                        size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-red-500"
                        onClick={() => deleteFact(f.id)}
                        data-testid={`button-delete-fact-${f.id}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="Anahtar"
              value={newKey}
              onChange={e => setNewKey(e.target.value)}
              className="h-8 text-xs font-mono bg-background w-1/3"
              data-testid="input-new-fact-key"
            />
            <Input
              placeholder="Değer"
              value={newValue}
              onChange={e => setNewValue(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addFact()}
              className="h-8 text-xs font-mono bg-background flex-1"
              data-testid="input-new-fact-value"
            />
            <Button size="sm" onClick={addFact} className="h-8 font-mono text-xs" data-testid="button-add-fact">
              <Plus className="h-3 w-3 mr-1" /> Ekle
            </Button>
          </div>

          <div className="bg-muted/30 rounded border border-border p-3">
            <pre className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">{exportMemoryMd(facts)}</pre>
          </div>
        </TabsContent>

        {/* PROGRESS TAB */}
        <TabsContent value="progress" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-3 text-xs text-muted-foreground">
              <span className="text-green-500">{tasks.filter(t => t.status === "done").length} tamamlandı</span>
              <span className="text-yellow-500">{tasks.filter(t => t.status === "in_progress").length} devam ediyor</span>
              <span>{tasks.filter(t => t.status === "todo").length} yapılacak</span>
            </div>
            <Button size="sm" variant="outline" className="text-xs font-mono h-7" onClick={() => copy(exportProgressMd(tasks))}>
              <Copy className="h-3 w-3 mr-1" /> PROGRESS.md kopyala
            </Button>
          </div>

          <div className="space-y-2">
            {tasks.map(t => (
              <div key={t.id} className="flex items-start gap-2 border border-border rounded-lg p-2 bg-card hover:bg-background/50 transition-colors" data-testid={`card-task-${t.id}`}>
                <Button
                  size="sm" variant="ghost"
                  className={`h-6 px-2 text-xs font-mono mt-0.5 min-w-[110px] justify-start ${statusColor(t.status)}`}
                  onClick={() => cycleStatus(t.id)}
                  data-testid={`button-cycle-status-${t.id}`}
                >
                  {statusLabel(t.status)}
                </Button>
                <div className="flex-1">
                  <div className="text-xs font-mono font-medium">{t.title}</div>
                  <Input
                    placeholder="Not ekle..."
                    value={t.notes}
                    onChange={e => updateTaskNotes(t.id, e.target.value)}
                    className="h-6 text-xs font-mono bg-transparent border-0 p-0 mt-0.5 focus-visible:ring-0 text-muted-foreground placeholder:text-muted-foreground/50"
                    data-testid={`input-task-notes-${t.id}`}
                  />
                </div>
                <Button
                  size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-red-500 mt-0.5"
                  onClick={() => deleteTask(t.id)}
                  data-testid={`button-delete-task-${t.id}`}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="Yeni görev..."
              value={newTask}
              onChange={e => setNewTask(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addTask()}
              className="h-8 text-xs font-mono bg-background flex-1"
              data-testid="input-new-task"
            />
            <Button size="sm" onClick={addTask} className="h-8 font-mono text-xs" data-testid="button-add-task">
              <Plus className="h-3 w-3 mr-1" /> Ekle
            </Button>
          </div>
        </TabsContent>

        {/* CHECKPOINT TAB */}
        <TabsContent value="checkpoint" className="space-y-4">
          <div className="border border-border rounded-lg p-4 bg-card space-y-3">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Yeni Checkpoint</Label>
            <Input
              placeholder="Checkpoint etiketi (örn: v1.2 — auth eklendi)"
              value={cpLabel}
              onChange={e => setCpLabel(e.target.value)}
              className="h-8 text-xs font-mono bg-background"
              data-testid="input-checkpoint-label"
            />
            <Textarea
              placeholder="Bu oturumda ne yapıldı? Hangi kararlar alındı?"
              value={cpSummary}
              onChange={e => setCpSummary(e.target.value)}
              className="min-h-[80px] resize-none text-xs font-mono bg-background"
              data-testid="textarea-checkpoint-summary"
            />
            <Button
              onClick={saveCheckpoint}
              disabled={!cpLabel.trim() || !cpSummary.trim()}
              className="w-full h-8 font-mono text-xs font-bold uppercase tracking-wider"
              data-testid="button-save-checkpoint"
            >
              <Clock className="h-3 w-3 mr-2" /> Checkpoint Kaydet
            </Button>
          </div>

          {checkpoints.length === 0 && (
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
              <p className="text-xs text-muted-foreground">Henüz checkpoint yok. Oturumun önemli noktalarını kaydet.</p>
            </div>
          )}

          <div className="space-y-2">
            {checkpoints.map((cp, i) => (
              <div key={cp.id} className="border border-border rounded-lg bg-card overflow-hidden" data-testid={`card-checkpoint-${cp.id}`}>
                <div
                  className="flex items-center justify-between p-3 cursor-pointer hover:bg-background/50"
                  onClick={() => setExpandedCp(expandedCp === cp.id ? null : cp.id)}
                >
                  <div className="flex items-center gap-2">
                    {i === 0 && <Badge className="text-xs h-4 px-1 bg-primary/20 text-primary border-primary/30 font-mono">LATEST</Badge>}
                    <span className="text-xs font-bold font-mono">{cp.label}</span>
                    <span className="text-xs text-muted-foreground">{cp.tokenCount} tok</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{new Date(cp.createdAt).toLocaleTimeString("tr-TR")}</span>
                    <Button
                      size="icon" variant="ghost" className="h-6 w-6"
                      onClick={e => { e.stopPropagation(); copy(exportCheckpointMd(cp)); }}
                      data-testid={`button-copy-checkpoint-${cp.id}`}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    {expandedCp === cp.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </div>
                </div>
                {expandedCp === cp.id && (
                  <div className="border-t border-border p-3 bg-muted/20">
                    <pre className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">{exportCheckpointMd(cp)}</pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        </TabsContent>

        {/* REBUILD TAB */}
        <TabsContent value="rebuild" className="space-y-4">
          <div className="border border-amber-500/30 bg-amber-500/5 rounded-lg p-3 text-xs text-amber-400 font-mono">
            Bağlam dolmaya yaklaşınca bu sekmeyi kullan. Son checkpoint + sıkıştırılmış memory + progress + son mesajlardan minimal bir bağlam paketi üretir.
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Bağlam Limiti (token)</Label>
              <Input
                type="number"
                value={contextLimit}
                onChange={e => setContextLimit(Number(e.target.value))}
                className="h-8 text-xs font-mono bg-background"
                data-testid="input-context-limit"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Durum</Label>
              <div className="h-8 flex items-center">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${usagePercent > 80 ? "bg-red-500" : usagePercent > 50 ? "bg-yellow-500" : "bg-green-500"}`} />
                  <span className="text-xs font-mono">
                    {usagePercent > 80 ? "KRITIK — yeniden kur" : usagePercent > 50 ? "DIKKAT — yaklasiyor" : "TAMAM"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Son Mesajlar (isteğe bağlı)</Label>
            <Textarea
              placeholder="Buraya son konuşma mesajlarını yapıştır..."
              value={lastMessages}
              onChange={e => setLastMessages(e.target.value)}
              className="min-h-[100px] resize-none text-xs font-mono bg-background"
              data-testid="textarea-last-messages"
            />
            <div className="text-right text-xs text-muted-foreground">{countTokens(lastMessages)} token</div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { label: "Memory", tokens: memTokens },
              { label: "Progress", tokens: progressTokens },
              { label: "Checkpoint", tokens: latestCpTokens },
            ].map(item => (
              <div key={item.label} className="border border-border rounded p-2 bg-card">
                <div className="text-xs text-muted-foreground">{item.label}</div>
                <div className="text-sm font-bold text-primary font-mono">{item.tokens}</div>
                <div className="text-xs text-muted-foreground">token</div>
              </div>
            ))}
          </div>

          <Button
            onClick={buildPackage}
            className="w-full h-10 font-mono text-sm font-bold uppercase tracking-wider"
            data-testid="button-build-context"
          >
            <RefreshCw className="h-4 w-4 mr-2" /> Bağlam Paketini Oluştur
          </Button>

          {contextPackage && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold">{contextPackage.tokens.toLocaleString()} token</span>
                  <Badge className={`text-xs font-mono h-4 px-1 ${contextPackage.tokens < contextLimit * 0.3 ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"}`}>
                    {Math.round((contextPackage.tokens / contextLimit) * 100)}% limit
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm" variant="outline" className="h-7 text-xs font-mono"
                    onClick={() => copy(contextPackage.markdown)}
                    data-testid="button-copy-context"
                  >
                    <Copy className="h-3 w-3 mr-1" /> Kopyala
                  </Button>
                  <Button
                    size="sm" variant="outline" className="h-7 text-xs font-mono"
                    onClick={() => {
                      const blob = new Blob([contextPackage.markdown], { type: "text/markdown" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = "context-package.md";
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    data-testid="button-download-context"
                  >
                    <Download className="h-3 w-3 mr-1" /> .md indir
                  </Button>
                </div>
              </div>
              <div className="border border-border rounded-lg bg-muted/20 p-3 max-h-80 overflow-y-auto">
                <pre className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">{contextPackage.markdown}</pre>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
