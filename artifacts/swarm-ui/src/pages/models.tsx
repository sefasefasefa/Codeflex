import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Cpu, Globe, Plus, Trash2, RefreshCw, CheckCircle2,
  XCircle, Zap, ExternalLink, AlertTriangle, Key, Server,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

type ModelSource = {
  id: string;
  type: "ollama" | "openai" | "anthropic" | "custom";
  label: string;
  url: string;
  apiKey?: string;
  isDefault: boolean;
  models?: string[];
};

type ModelConfig = {
  id: string;
  name: string;
  mode: "global" | "per_agent";
  globalModel: string;
  agentOverrides: Record<string, string>;
  sources: ModelSource[];
};

type AvailableSource = {
  sourceId: string;
  label: string;
  url: string;
  models: string[];
  ok: boolean;
  error?: string;
};

const SOURCE_TYPE_META: Record<string, { label: string; icon: string; placeholder: string; color: string }> = {
  ollama:    { label: "Ollama",    icon: "🦙", placeholder: "http://localhost:11434", color: "text-orange-400" },
  openai:    { label: "OpenAI",    icon: "⚡", placeholder: "https://api.openai.com", color: "text-green-400" },
  anthropic: { label: "Anthropic", icon: "🧠", placeholder: "https://api.anthropic.com", color: "text-purple-400" },
  custom:    { label: "Custom",    icon: "🔧", placeholder: "http://my-llm-server:8000", color: "text-cyan-400" },
};

const DEFAULT_OLLAMA_MODELS = [
  "qwen2.5-coder:7b", "qwen2.5-coder:32b", "deepseek-r1:14b", "deepseek-r1:32b",
  "llama3.1:8b", "llama3.1:70b", "codellama:7b", "mistral:7b", "gemma2:9b",
];

export default function Models() {
  const qc = useQueryClient();

  const { data: config, isLoading } = useQuery<ModelConfig>({
    queryKey: ["models-config"],
    queryFn: () => apiFetch("/api/models/config"),
  });

  const { data: available, refetch: refetchAvailable, isFetching: fetchingAvailable } = useQuery<{ sources: AvailableSource[] }>({
    queryKey: ["models-available"],
    queryFn: () => apiFetch("/api/models/available"),
    enabled: !!config,
    staleTime: 30000,
  });

  const { data: agents = [] } = useQuery<{ key: string; role: string; modelName: string }[]>({
    queryKey: ["agents"],
    queryFn: () => apiFetch("/api/agents"),
  });

  const saveMutation = useMutation({
    mutationFn: (patch: Partial<ModelConfig>) => apiFetch("/api/models/config", { method: "PUT", body: JSON.stringify(patch) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["models-config"] }),
  });

  const testMutation = useMutation({
    mutationFn: (body: { type: string; url: string; apiKey?: string }) =>
      apiFetch("/api/models/test", { method: "POST", body: JSON.stringify(body) }),
  });

  const [localConfig, setLocalConfig] = useState<ModelConfig | null>(null);
  const [testResult, setTestResult] = useState<Record<string, { ok: boolean; message: string } | null>>({});
  const [newSource, setNewSource] = useState<Partial<ModelSource>>({ type: "ollama", label: "", url: "", apiKey: "" });
  const [showAddSource, setShowAddSource] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (config && !localConfig) setLocalConfig(config);
  }, [config]);

  const allModels = [
    ...DEFAULT_OLLAMA_MODELS,
    ...(available?.sources.flatMap(s => s.models) ?? []),
  ].filter((v, i, a) => a.indexOf(v) === i);

  function patch(updates: Partial<ModelConfig>) {
    setLocalConfig(prev => prev ? { ...prev, ...updates } : null);
  }

  function setOverride(agentKey: string, model: string) {
    if (!localConfig) return;
    const overrides = { ...localConfig.agentOverrides };
    if (model === "") delete overrides[agentKey];
    else overrides[agentKey] = model;
    patch({ agentOverrides: overrides });
  }

  function removeSource(id: string) {
    if (!localConfig) return;
    patch({ sources: localConfig.sources.filter(s => s.id !== id) });
  }

  function addSource() {
    if (!localConfig || !newSource.url || !newSource.type) return;
    const src: ModelSource = {
      id: `src_${Date.now()}`,
      type: newSource.type as ModelSource["type"],
      label: newSource.label || SOURCE_TYPE_META[newSource.type!].label,
      url: newSource.url,
      apiKey: newSource.apiKey || undefined,
      isDefault: false,
      models: [],
    };
    patch({ sources: [...localConfig.sources, src] });
    setNewSource({ type: "ollama", label: "", url: "", apiKey: "" });
    setShowAddSource(false);
  }

  async function testSource(src: ModelSource) {
    setTestResult(p => ({ ...p, [src.id]: null }));
    try {
      const res = await testMutation.mutateAsync({ type: src.type, url: src.url, apiKey: src.apiKey });
      setTestResult(p => ({ ...p, [src.id]: res }));
    } catch (e: any) {
      setTestResult(p => ({ ...p, [src.id]: { ok: false, message: e.message } }));
    }
  }

  async function save() {
    if (!localConfig) return;
    await saveMutation.mutateAsync({
      mode: localConfig.mode,
      globalModel: localConfig.globalModel,
      agentOverrides: localConfig.agentOverrides,
      sources: localConfig.sources,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    qc.invalidateQueries({ queryKey: ["models-available"] });
  }

  if (isLoading || !localConfig) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isGlobal = localConfig.mode === "global";

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-5xl mx-auto p-6 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-mono text-foreground flex items-center gap-2">
              <Cpu className="w-6 h-6 text-primary" /> Model Yapılandırması
            </h1>
            <p className="text-sm text-muted-foreground mt-1 font-mono">
              Tek modelde izole çalış ya da ajan bazında farklı model ata
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetchAvailable()} disabled={fetchingAvailable}>
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${fetchingAvailable ? "animate-spin" : ""}`} />
              Modelleri Tara
            </Button>
            <Button size="sm" onClick={save} disabled={saveMutation.isPending}>
              {saved ? <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-green-400" /> : <Zap className="w-3.5 h-3.5 mr-1.5" />}
              {saved ? "Kaydedildi" : "Kaydet"}
            </Button>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs font-mono text-muted-foreground mb-3 uppercase tracking-widest">Çalışma Modu</p>
          <div className="flex gap-3">
            <button
              onClick={() => patch({ mode: "global" })}
              className={`flex-1 rounded-md border p-4 text-left transition-all ${
                isGlobal ? "border-primary bg-primary/10" : "border-border hover:border-border/80"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Zap className={`w-4 h-4 ${isGlobal ? "text-primary" : "text-muted-foreground"}`} />
                <span className={`font-mono font-semibold text-sm ${isGlobal ? "text-primary" : "text-foreground"}`}>
                  Tek Model (İzole)
                </span>
                {isGlobal && <Badge className="ml-auto text-xs">Aktif</Badge>}
              </div>
              <p className="text-xs text-muted-foreground">Tüm ajanlar aynı modeli kullanır. Basit ve tahmin edilebilir.</p>
            </button>
            <button
              onClick={() => patch({ mode: "per_agent" })}
              className={`flex-1 rounded-md border p-4 text-left transition-all ${
                !isGlobal ? "border-primary bg-primary/10" : "border-border hover:border-border/80"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Cpu className={`w-4 h-4 ${!isGlobal ? "text-primary" : "text-muted-foreground"}`} />
                <span className={`font-mono font-semibold text-sm ${!isGlobal ? "text-primary" : "text-foreground"}`}>
                  Ajan Bazında
                </span>
                {!isGlobal && <Badge className="ml-auto text-xs">Aktif</Badge>}
              </div>
              <p className="text-xs text-muted-foreground">Her ajana farklı model atanabilir. Override yoksa global model kullanılır.</p>
            </button>
          </div>
        </div>

        {/* Global Model Seçici */}
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs font-mono text-muted-foreground mb-3 uppercase tracking-widest">
            {isGlobal ? "Global Model (Tüm Ajanlar)" : "Varsayılan Model (Override yoksa)"}
          </p>
          <div className="flex gap-2">
            <div className="flex-1">
              <select
                value={localConfig.globalModel}
                onChange={e => patch({ globalModel: e.target.value })}
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {allModels.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
                {!allModels.includes(localConfig.globalModel) && (
                  <option value={localConfig.globalModel}>{localConfig.globalModel}</option>
                )}
              </select>
            </div>
            <Input
              className="flex-1 font-mono text-sm"
              placeholder="veya manuel yaz: llama3.1:70b"
              onBlur={e => { if (e.target.value) patch({ globalModel: e.target.value }); }}
              defaultValue=""
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2 font-mono">
            Mevcut: <span className="text-cyan-400">{localConfig.globalModel}</span>
          </p>
        </div>

        {/* Ajan Bazında Override (per_agent modunda) */}
        <AnimatePresence>
          {!isGlobal && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-card border border-border rounded-lg overflow-hidden"
            >
              <div className="p-4 border-b border-border">
                <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Ajan Model Override'ları</p>
                <p className="text-xs text-muted-foreground mt-1">Boş bırakılan ajanlar varsayılan modeli kullanır</p>
              </div>
              <div className="divide-y divide-border/50">
                {agents.map((agent: any) => {
                  const override = localConfig.agentOverrides[agent.key] || "";
                  return (
                    <div key={agent.key} className="flex items-center gap-4 px-4 py-3">
                      <div className="w-48 shrink-0">
                        <p className="text-sm font-mono font-medium text-foreground">{agent.key}</p>
                        <p className="text-xs text-muted-foreground">{agent.role}</p>
                      </div>
                      <div className="flex-1 flex gap-2 items-center">
                        <select
                          value={override}
                          onChange={e => setOverride(agent.key, e.target.value)}
                          className="flex-1 bg-background border border-border rounded-md px-2 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          <option value="">— global modeli kullan ({localConfig.globalModel}) —</option>
                          {allModels.map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                        {override && (
                          <Badge variant="outline" className="text-xs font-mono text-cyan-400 border-cyan-400/40">
                            {override}
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
                {agents.length === 0 && (
                  <p className="text-sm text-muted-foreground font-mono px-4 py-4">Ajan bulunamadı</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Model Kaynakları */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div>
              <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Model Kaynakları</p>
              <p className="text-xs text-muted-foreground mt-1">Ollama, OpenAI, Anthropic veya özel endpoint ekle</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowAddSource(v => !v)}>
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Kaynak Ekle
            </Button>
          </div>

          {/* Yeni Kaynak Formu */}
          <AnimatePresence>
            {showAddSource && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="border-b border-border bg-background/50"
              >
                <div className="p-4 grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-mono mb-1 block">Tür</Label>
                    <select
                      value={newSource.type}
                      onChange={e => setNewSource(p => ({ ...p, type: e.target.value as any }))}
                      className="w-full bg-background border border-border rounded-md px-2 py-1.5 text-xs font-mono"
                    >
                      {Object.entries(SOURCE_TYPE_META).map(([k, v]) => (
                        <option key={k} value={k}>{v.icon} {v.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs font-mono mb-1 block">Etiket</Label>
                    <Input
                      className="text-xs font-mono"
                      placeholder="Örn: Ev Sunucusu"
                      value={newSource.label}
                      onChange={e => setNewSource(p => ({ ...p, label: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-mono mb-1 block">URL</Label>
                    <Input
                      className="text-xs font-mono"
                      placeholder={SOURCE_TYPE_META[newSource.type || "ollama"].placeholder}
                      value={newSource.url}
                      onChange={e => setNewSource(p => ({ ...p, url: e.target.value }))}
                    />
                  </div>
                  {(newSource.type === "openai" || newSource.type === "anthropic") && (
                    <div>
                      <Label className="text-xs font-mono mb-1 block">API Key</Label>
                      <Input
                        type="password"
                        className="text-xs font-mono"
                        placeholder="sk-..."
                        value={newSource.apiKey}
                        onChange={e => setNewSource(p => ({ ...p, apiKey: e.target.value }))}
                      />
                    </div>
                  )}
                  <div className="col-span-2 flex gap-2">
                    <Button size="sm" onClick={addSource} disabled={!newSource.url}>
                      <Plus className="w-3.5 h-3.5 mr-1.5" /> Ekle
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setShowAddSource(false)}>İptal</Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Kaynak Listesi */}
          <div className="divide-y divide-border/50">
            {localConfig.sources.map(src => {
              const meta = SOURCE_TYPE_META[src.type] || SOURCE_TYPE_META.custom;
              const test = testResult[src.id];
              const avail = available?.sources.find(a => a.sourceId === src.id);
              return (
                <div key={src.id} className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    <span className="text-lg mt-0.5">{meta.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm font-mono font-semibold ${meta.color}`}>{src.label}</span>
                        <Badge variant="outline" className="text-xs">{src.type}</Badge>
                        {src.isDefault && <Badge className="text-xs">Varsayılan</Badge>}
                        {avail?.ok === true && (
                          <Badge variant="outline" className="text-xs text-green-400 border-green-400/30">
                            <CheckCircle2 className="w-2.5 h-2.5 mr-1" />{avail.models.length} model
                          </Badge>
                        )}
                        {avail?.ok === false && (
                          <Badge variant="outline" className="text-xs text-red-400 border-red-400/30">
                            <XCircle className="w-2.5 h-2.5 mr-1" />Ulaşılamıyor
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">{src.url}</p>

                      {/* Test Sonucu */}
                      {test && (
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className={`text-xs font-mono mt-1 ${test.ok ? "text-green-400" : "text-red-400"}`}
                        >
                          {test.ok ? "✓" : "✗"} {test.message}
                        </motion.p>
                      )}

                      {/* Mevcut Modeller */}
                      {avail?.ok && avail.models.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {avail.models.slice(0, 6).map(m => (
                            <button
                              key={m}
                              onClick={() => patch({ globalModel: m })}
                              className="text-xs font-mono bg-background border border-border rounded px-1.5 py-0.5 hover:border-primary hover:text-primary transition-colors"
                              title="Global model olarak seç"
                            >
                              {m}
                            </button>
                          ))}
                          {avail.models.length > 6 && (
                            <span className="text-xs font-mono text-muted-foreground px-1">+{avail.models.length - 6} daha</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => testSource(src)}
                        disabled={testMutation.isPending} title="Bağlantıyı Test Et">
                        <RefreshCw className={`w-3 h-3 ${testMutation.isPending ? "animate-spin" : ""}`} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => removeSource(src.id)} title="Kaynağı Sil">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
            {localConfig.sources.length === 0 && (
              <div className="px-4 py-8 text-center">
                <Server className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground font-mono">Henüz kaynak eklenmedi</p>
                <p className="text-xs text-muted-foreground mt-1">Ollama, OpenAI veya özel bir LLM endpoint ekleyin</p>
              </div>
            )}
          </div>
        </div>

        {/* Docs Link */}
        <div className="bg-card border border-border rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Globe className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-mono font-medium">API Dokümantasyonu</p>
              <p className="text-xs text-muted-foreground">Tüm endpointler — Swagger UI ile interaktif test</p>
            </div>
          </div>
          <a
            href="/api/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-mono text-primary hover:underline"
          >
            /api/docs <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Kaydet butonu alt kısım */}
        <div className="flex justify-end pb-6">
          <Button onClick={save} disabled={saveMutation.isPending} className="min-w-32">
            {saved ? (
              <><CheckCircle2 className="w-4 h-4 mr-2 text-green-400" />Kaydedildi</>
            ) : (
              <><Zap className="w-4 h-4 mr-2" />Kaydet</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
