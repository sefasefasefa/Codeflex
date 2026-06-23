import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Cpu, Globe, Plus, Trash2, RefreshCw, CheckCircle2,
  XCircle, Zap, ExternalLink, Server, Star, Lock,
  ChevronDown, ChevronRight, Check,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" }, ...opts,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

type ModelSource = {
  id: string;
  type: "ollama" | "openai" | "anthropic" | "openrouter" | "groq" | "gemini" | "custom";
  label: string; url: string; apiKey?: string; isDefault: boolean; models?: string[];
};

type ModelConfig = {
  id: string; name: string; mode: "global" | "per_agent";
  globalModel: string; agentOverrides: Record<string, string>; sources: ModelSource[];
};

type AvailableSource = {
  sourceId: string; label: string; url: string; models: string[]; ok: boolean; error?: string;
};

type CatalogEntry = {
  type: string; label: string; description: string; url: string;
  signupUrl: string; icon: string; isFree: boolean; models: string[];
};

const SOURCE_META: Record<string, { color: string; needsKey: boolean; keyLabel: string; keyPlaceholder: string }> = {
  ollama:    { color: "text-orange-400", needsKey: false, keyLabel: "",           keyPlaceholder: "" },
  openrouter:{ color: "text-violet-400", needsKey: true,  keyLabel: "API Key",    keyPlaceholder: "sk-or-v1-..." },
  groq:      { color: "text-yellow-400", needsKey: true,  keyLabel: "API Key",    keyPlaceholder: "gsk_..." },
  gemini:    { color: "text-blue-400",   needsKey: true,  keyLabel: "API Key",    keyPlaceholder: "AIza..." },
  openai:    { color: "text-green-400",  needsKey: true,  keyLabel: "API Key",    keyPlaceholder: "sk-..." },
  anthropic: { color: "text-purple-400", needsKey: true,  keyLabel: "API Key",    keyPlaceholder: "sk-ant-..." },
  custom:    { color: "text-cyan-400",   needsKey: false,  keyLabel: "API Key",   keyPlaceholder: "opsiyonel" },
};

const DEFAULT_OLLAMA_MODELS = [
  "qwen2.5-coder:7b", "qwen2.5-coder:32b", "deepseek-r1:14b", "deepseek-r1:32b",
  "llama3.1:8b", "mistral:7b", "codellama:7b", "gemma2:9b", "phi4:14b",
];

export default function Models() {
  const qc = useQueryClient();

  const { data: config, isLoading } = useQuery<ModelConfig>({
    queryKey: ["models-config"],
    queryFn: () => apiFetch("/api/models/config"),
  });

  const { data: catalog = {} } = useQuery<Record<string, CatalogEntry>>({
    queryKey: ["models-catalog"],
    queryFn: () => apiFetch("/api/models/catalog"),
    staleTime: Infinity,
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
    mutationFn: (patch: Partial<ModelConfig>) =>
      apiFetch("/api/models/config", { method: "PUT", body: JSON.stringify(patch) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["models-config"] }),
  });

  const testMutation = useMutation({
    mutationFn: (body: { type: string; url?: string; apiKey?: string }) =>
      apiFetch("/api/models/test", { method: "POST", body: JSON.stringify(body) }),
  });

  const [localConfig, setLocalConfig] = useState<ModelConfig | null>(null);
  const [testResult, setTestResult] = useState<Record<string, { ok: boolean; message: string; models?: string[] } | null>>({});
  const [showAddSource, setShowAddSource] = useState(false);
  const [addingType, setAddingType] = useState<string>("groq");
  const [addApiKey, setAddApiKey] = useState("");
  const [addLabel, setAddLabel] = useState("");
  const [addUrl, setAddUrl] = useState("");
  const [saved, setSaved] = useState(false);
  const [expandedCatalog, setExpandedCatalog] = useState<string | null>(null);

  useEffect(() => { if (config && !localConfig) setLocalConfig(config); }, [config]);

  const allModels = [
    ...DEFAULT_OLLAMA_MODELS,
    ...(available?.sources.flatMap(s => s.models) ?? []),
    ...Object.values(catalog).flatMap(c => c.models),
  ].filter((v, i, a) => a.indexOf(v) === i);

  function patch(updates: Partial<ModelConfig>) {
    setLocalConfig(prev => prev ? { ...prev, ...updates } : null);
  }

  function setOverride(agentKey: string, model: string) {
    if (!localConfig) return;
    const overrides = { ...localConfig.agentOverrides };
    if (model === "") delete overrides[agentKey]; else overrides[agentKey] = model;
    patch({ agentOverrides: overrides });
  }

  function removeSource(id: string) {
    if (!localConfig) return;
    patch({ sources: localConfig.sources.filter(s => s.id !== id) });
  }

  function setDefaultSource(id: string) {
    if (!localConfig) return;
    patch({ sources: localConfig.sources.map(s => ({ ...s, isDefault: s.id === id })) });
  }

  function addFromCatalog(entry: CatalogEntry) {
    setAddingType(entry.type);
    setAddLabel(entry.label);
    setAddUrl(entry.url);
    setAddApiKey("");
    setShowAddSource(true);
    setExpandedCatalog(null);
    setTimeout(() => document.getElementById("api-key-input")?.focus(), 100);
  }

  function addSource() {
    if (!localConfig) return;
    const meta = catalog[addingType];
    const src: ModelSource = {
      id: `src_${Date.now()}`,
      type: addingType as ModelSource["type"],
      label: addLabel || meta?.label || addingType,
      url: addUrl || meta?.url || "",
      apiKey: addApiKey || undefined,
      isDefault: localConfig.sources.length === 0,
      models: [],
    };
    const newSources = [...localConfig.sources, src];
    // Eğer ilk kaynak, global modeli katalog'un ilk modeline ayarla
    if (localConfig.sources.length === 0 && meta?.models?.[0]) {
      patch({ sources: newSources, globalModel: meta.models[0] });
    } else {
      patch({ sources: newSources });
    }
    setAddApiKey(""); setAddLabel(""); setAddUrl(""); setShowAddSource(false);
  }

  async function testSource(src: ModelSource) {
    setTestResult(p => ({ ...p, [src.id]: null }));
    try {
      const res = await testMutation.mutateAsync({ type: src.type, url: src.url, apiKey: src.apiKey });
      setTestResult(p => ({ ...p, [src.id]: res }));
      if (res.ok && res.models?.length > 0 && localConfig) {
        patch({
          sources: localConfig.sources.map(s =>
            s.id === src.id ? { ...s, models: res.models } : s
          ),
        });
      }
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
    return <div className="flex items-center justify-center h-full"><RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  }

  const isGlobal = localConfig.mode === "global";
  const addingMeta = SOURCE_META[addingType] || SOURCE_META.custom;
  const catalogEntries = Object.values(catalog);
  const freeEntries = catalogEntries.filter(c => c.isFree);
  const paidEntries = catalogEntries.filter(c => !c.isFree);
  const addedTypes = new Set(localConfig.sources.map(s => s.type));

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
              Ücretsiz modeller ekle — Mistral, Llama, DeepSeek, Gemma ve daha fazlası
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetchAvailable()} disabled={fetchingAvailable}>
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${fetchingAvailable ? "animate-spin" : ""}`} />
              Tara
            </Button>
            <Button size="sm" onClick={save} disabled={saveMutation.isPending}>
              {saved ? <Check className="w-3.5 h-3.5 mr-1.5 text-green-400" /> : <Zap className="w-3.5 h-3.5 mr-1.5" />}
              {saved ? "Kaydedildi" : "Kaydet"}
            </Button>
          </div>
        </div>

        {/* ── Ücretsiz Model Kataloğu ───────────────────── */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-400" />
            <span className="text-xs font-mono font-semibold uppercase tracking-widest text-muted-foreground">Ücretsiz Model Kaynakları</span>
            <Badge variant="outline" className="text-xs ml-auto text-green-400 border-green-400/30">Kayıt ücretsiz</Badge>
          </div>
          <div className="divide-y divide-border/40">
            {freeEntries.map(entry => {
              const alreadyAdded = addedTypes.has(entry.type);
              const isExpanded = expandedCatalog === entry.type;
              return (
                <div key={entry.type} className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{entry.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-mono font-semibold text-foreground">{entry.label}</span>
                        <Badge variant="outline" className="text-xs text-green-400 border-green-400/30">ücretsiz</Badge>
                        {alreadyAdded && <Badge variant="outline" className="text-xs text-primary border-primary/30"><Check className="w-2.5 h-2.5 mr-1" />Eklendi</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">{entry.description}</p>
                      <button
                        onClick={() => setExpandedCatalog(isExpanded ? null : entry.type)}
                        className="text-xs text-muted-foreground hover:text-foreground font-mono mt-1 flex items-center gap-1"
                      >
                        {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                        {entry.models.length} model
                      </button>
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="flex flex-wrap gap-1 mt-2">
                              {entry.models.map(m => (
                                <button
                                  key={m}
                                  onClick={() => patch({ globalModel: m })}
                                  className={`text-xs font-mono border rounded px-1.5 py-0.5 transition-colors ${
                                    localConfig.globalModel === m
                                      ? "border-primary text-primary bg-primary/10"
                                      : "border-border text-muted-foreground hover:border-primary hover:text-primary bg-background"
                                  }`}
                                  title="Global model olarak seç"
                                >
                                  {m}
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <a href={entry.signupUrl} target="_blank" rel="noopener noreferrer"
                        className="text-xs font-mono text-muted-foreground hover:text-foreground flex items-center gap-1">
                        API Key al <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                      <Button size="sm" variant={alreadyAdded ? "outline" : "default"}
                        onClick={() => addFromCatalog(entry)} className="h-7 text-xs">
                        {alreadyAdded ? "Tekrar Ekle" : "Ekle"}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {/* Ücretli kaynaklar */}
          <div className="border-t border-border/50 px-4 py-2 flex items-center gap-2">
            <Lock className="w-3 h-3 text-muted-foreground/50" />
            <span className="text-xs font-mono text-muted-foreground/50 uppercase tracking-widest">Ücretli</span>
          </div>
          <div className="divide-y divide-border/40">
            {paidEntries.map(entry => {
              const alreadyAdded = addedTypes.has(entry.type);
              return (
                <div key={entry.type} className="px-4 py-3 opacity-70">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{entry.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono font-semibold text-foreground">{entry.label}</span>
                        {alreadyAdded && <Badge variant="outline" className="text-xs text-primary border-primary/30"><Check className="w-2.5 h-2.5 mr-1" />Eklendi</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">{entry.description}</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => addFromCatalog(entry)} className="h-7 text-xs shrink-0">
                      {alreadyAdded ? "Tekrar Ekle" : "Ekle"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Çalışma Modu ───────────────────────────────── */}
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs font-mono text-muted-foreground mb-3 uppercase tracking-widest">Çalışma Modu</p>
          <div className="flex gap-3">
            {(["global", "per_agent"] as const).map(m => (
              <button key={m} onClick={() => patch({ mode: m })}
                className={`flex-1 rounded-md border p-4 text-left transition-all ${
                  localConfig.mode === m ? "border-primary bg-primary/10" : "border-border hover:border-border/80"
                }`}>
                <div className="flex items-center gap-2 mb-1">
                  {m === "global" ? <Zap className="w-4 h-4" /> : <Cpu className="w-4 h-4" />}
                  <span className={`font-mono font-semibold text-sm ${localConfig.mode === m ? "text-primary" : "text-foreground"}`}>
                    {m === "global" ? "Tek Model (İzole)" : "Ajan Bazında"}
                  </span>
                  {localConfig.mode === m && <Badge className="ml-auto text-xs">Aktif</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">
                  {m === "global" ? "Tüm ajanlar aynı modeli kullanır." : "Her ajana farklı model atanabilir."}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* ── Global Model Seçici ─────────────────────────── */}
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs font-mono text-muted-foreground mb-3 uppercase tracking-widest">
            {isGlobal ? "Global Model (Tüm Ajanlar)" : "Varsayılan Model (Override yoksa)"}
          </p>
          <div className="flex gap-2">
            <select value={localConfig.globalModel} onChange={e => patch({ globalModel: e.target.value })}
              className="flex-1 bg-background border border-border rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary">
              {allModels.map(m => <option key={m} value={m}>{m}</option>)}
              {!allModels.includes(localConfig.globalModel) && (
                <option value={localConfig.globalModel}>{localConfig.globalModel}</option>
              )}
            </select>
            <Input className="flex-1 font-mono text-sm" placeholder="veya manuel yaz: mistral:7b"
              onBlur={e => { if (e.target.value.trim()) patch({ globalModel: e.target.value.trim() }); }}
              defaultValue="" />
          </div>
          <p className="text-xs text-muted-foreground mt-2 font-mono">
            Mevcut: <span className="text-cyan-400">{localConfig.globalModel}</span>
          </p>
        </div>

        {/* ── Ajan Bazında Override ───────────────────────── */}
        <AnimatePresence>
          {!isGlobal && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="p-4 border-b border-border">
                <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Ajan Model Override</p>
              </div>
              <div className="divide-y divide-border/50">
                {agents.map((agent: any) => (
                  <div key={agent.key} className="flex items-center gap-4 px-4 py-3">
                    <div className="w-48 shrink-0">
                      <p className="text-sm font-mono font-medium">{agent.key}</p>
                      <p className="text-xs text-muted-foreground">{agent.role}</p>
                    </div>
                    <select value={localConfig.agentOverrides[agent.key] || ""}
                      onChange={e => setOverride(agent.key, e.target.value)}
                      className="flex-1 bg-background border border-border rounded-md px-2 py-1.5 text-xs font-mono">
                      <option value="">— global model ({localConfig.globalModel}) —</option>
                      {allModels.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    {localConfig.agentOverrides[agent.key] && (
                      <Badge variant="outline" className="text-xs font-mono text-cyan-400 border-cyan-400/40">
                        {localConfig.agentOverrides[agent.key]}
                      </Badge>
                    )}
                  </div>
                ))}
                {agents.length === 0 && <p className="px-4 py-4 text-sm text-muted-foreground font-mono">Ajan bulunamadı</p>}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Eklenen Kaynaklar ───────────────────────────── */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div>
              <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Eklenen Kaynaklar</p>
              <p className="text-xs text-muted-foreground mt-1">{localConfig.sources.length} kaynak yapılandırıldı</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowAddSource(v => !v)}>
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Manuel Ekle
            </Button>
          </div>

          {/* Manuel Kaynak Ekleme Formu */}
          <AnimatePresence>
            {showAddSource && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                className="border-b border-border bg-background/50">
                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs font-mono mb-1 block">Tür</Label>
                      <select value={addingType} onChange={e => setAddingType(e.target.value)}
                        className="w-full bg-background border border-border rounded-md px-2 py-1.5 text-xs font-mono">
                        {Object.entries(catalog).map(([k, v]) => (
                          <option key={k} value={k}>{v.icon} {v.label}</option>
                        ))}
                        <option value="custom">🔧 Custom</option>
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs font-mono mb-1 block">Etiket</Label>
                      <Input className="text-xs font-mono" placeholder={catalog[addingType]?.label || "Etiket"}
                        value={addLabel} onChange={e => setAddLabel(e.target.value)} />
                    </div>
                    {addingType === "ollama" || addingType === "custom" ? (
                      <div>
                        <Label className="text-xs font-mono mb-1 block">URL</Label>
                        <Input className="text-xs font-mono" placeholder={catalog[addingType]?.url || "http://..."}
                          value={addUrl} onChange={e => setAddUrl(e.target.value)} />
                      </div>
                    ) : (
                      <div>
                        <Label className="text-xs font-mono mb-1 block">
                          {addingMeta.keyLabel}
                          <a href={catalog[addingType]?.signupUrl} target="_blank" rel="noopener noreferrer"
                            className="ml-2 text-primary hover:underline text-xs">API Key al →</a>
                        </Label>
                        <Input id="api-key-input" type="password" className="text-xs font-mono"
                          placeholder={addingMeta.keyPlaceholder}
                          value={addApiKey} onChange={e => setAddApiKey(e.target.value)} />
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={addSource}
                      disabled={addingMeta.needsKey && !addApiKey && addingType !== "custom"}>
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
              const entry = catalog[src.type];
              const test = testResult[src.id];
              const avail = available?.sources.find(a => a.sourceId === src.id);
              const meta = SOURCE_META[src.type] || SOURCE_META.custom;
              const displayModels = avail?.models?.length ? avail.models : (src.models ?? entry?.models ?? []);
              return (
                <div key={src.id} className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    <span className="text-lg mt-0.5">{entry?.icon ?? "🔧"}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm font-mono font-semibold ${meta.color}`}>{src.label}</span>
                        <Badge variant="outline" className="text-xs">{src.type}</Badge>
                        {src.isDefault && <Badge className="text-xs bg-primary/20 text-primary border-primary/30">Varsayılan</Badge>}
                        {!src.isDefault && (
                          <button onClick={() => setDefaultSource(src.id)}
                            className="text-xs font-mono text-muted-foreground hover:text-primary transition-colors">
                            varsayılan yap
                          </button>
                        )}
                        {avail?.ok === true && <Badge variant="outline" className="text-xs text-green-400 border-green-400/30"><CheckCircle2 className="w-2.5 h-2.5 mr-1" />{avail.models.length} model</Badge>}
                        {avail?.ok === false && <Badge variant="outline" className="text-xs text-red-400 border-red-400/30"><XCircle className="w-2.5 h-2.5 mr-1" />Ulaşılamıyor</Badge>}
                        {src.apiKey && <Badge variant="outline" className="text-xs text-muted-foreground border-border/50">🔑 key var</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">
                        {src.type === "ollama" ? src.url : (src.url || entry?.url)}
                      </p>
                      {test && (
                        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                          className={`text-xs font-mono mt-1 ${test.ok ? "text-green-400" : "text-red-400"}`}>
                          {test.ok ? "✓" : "✗"} {test.message}
                        </motion.p>
                      )}
                      {/* Model chip listesi */}
                      {displayModels.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {displayModels.slice(0, 8).map((m: string) => (
                            <button key={m} onClick={() => patch({ globalModel: m })}
                              className={`text-xs font-mono border rounded px-1.5 py-0.5 transition-colors ${
                                localConfig.globalModel === m
                                  ? "border-primary text-primary bg-primary/10"
                                  : "border-border text-muted-foreground hover:border-primary hover:text-primary bg-background"
                              }`}>
                              {m}
                            </button>
                          ))}
                          {displayModels.length > 8 && (
                            <span className="text-xs font-mono text-muted-foreground px-1">+{displayModels.length - 8} daha</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => testSource(src)} title="Test Et">
                        <RefreshCw className={`w-3 h-3 ${testMutation.isPending ? "animate-spin" : ""}`} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => removeSource(src.id)}>
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
                <p className="text-sm text-muted-foreground font-mono">Kaynak eklenmedi</p>
                <p className="text-xs text-muted-foreground mt-1">Yukarıdaki katalogdan ücretsiz bir kaynak ekleyin</p>
              </div>
            )}
          </div>
        </div>

        {/* API Docs Link */}
        <div className="bg-card border border-border rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Globe className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-mono font-medium">API Dokümantasyonu</p>
              <p className="text-xs text-muted-foreground">Tüm endpointler — Swagger UI ile interaktif test</p>
            </div>
          </div>
          <a href="/api/docs" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-mono text-primary hover:underline">
            /api/docs <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Kaydet */}
        <div className="flex justify-end pb-6">
          <Button onClick={save} disabled={saveMutation.isPending} className="min-w-32">
            {saved ? <><Check className="w-4 h-4 mr-2 text-green-400" />Kaydedildi</> : <><Zap className="w-4 h-4 mr-2" />Kaydet</>}
          </Button>
        </div>
      </div>
    </div>
  );
}
