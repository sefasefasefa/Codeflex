import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, ExternalLink, Check, X, ChevronDown, ChevronUp, Eye, EyeOff, Cpu, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" }, ...opts,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

type Provider = {
  id: string;
  name: string;
  envKey: string | null;
  baseUrl: string;
  kind: string;
  local: boolean;
  status: "configured" | "missing" | "online" | "offline";
  models: string[];
  signupUrl: string;
  hasDbKey: boolean;
  hasEnvKey: boolean;
};

const STATUS_BADGE: Record<string, { label: string; class: string }> = {
  configured: { label: "Configured",   class: "bg-green-500/15 text-green-400 border-green-500/30" },
  missing:    { label: "Missing key",  class: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30" },
  online:     { label: "Online",       class: "bg-green-500/15 text-green-400 border-green-500/30" },
  offline:    { label: "Offline",      class: "bg-red-500/15 text-red-400 border-red-500/30" },
};

export default function Models() {
  const qc = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [refreshStatus, setRefreshStatus] = useState<Record<string, { ok: boolean; count: number } | null>>({});
  const [saveStatus, setSaveStatus] = useState<Record<string, "saving" | "saved" | "error" | null>>({});

  const { data: providers = [], isLoading, refetch } = useQuery<Provider[]>({
    queryKey: ["providers"],
    queryFn: () => apiFetch("/api/models/providers"),
    staleTime: 15000,
  });

  const refreshMutation = useMutation({
    mutationFn: (providerId: string) =>
      apiFetch("/api/models/providers/refresh", { method: "POST", body: JSON.stringify({ providerId }) }),
  });

  const saveKeyMutation = useMutation({
    mutationFn: ({ providerId, apiKey }: { providerId: string; apiKey: string }) =>
      apiFetch("/api/models/providers/save-key", { method: "POST", body: JSON.stringify({ providerId, apiKey }) }),
  });

  const setDefaultMutation = useMutation({
    mutationFn: ({ providerId, model }: { providerId: string; model: string }) =>
      apiFetch("/api/models/providers/set-default", { method: "POST", body: JSON.stringify({ providerId, model }) }),
  });

  async function handleRefresh(p: Provider) {
    setRefreshStatus(s => ({ ...s, [p.id]: null }));
    try {
      const res = await refreshMutation.mutateAsync(p.id);
      setRefreshStatus(s => ({ ...s, [p.id]: { ok: true, count: res.count } }));
      qc.invalidateQueries({ queryKey: ["providers"] });
    } catch {
      setRefreshStatus(s => ({ ...s, [p.id]: { ok: false, count: 0 } }));
    }
  }

  async function handleSaveKey(p: Provider) {
    const key = apiKeys[p.id]?.trim();
    if (!key) return;
    setSaveStatus(s => ({ ...s, [p.id]: "saving" }));
    try {
      await saveKeyMutation.mutateAsync({ providerId: p.id, apiKey: key });
      setSaveStatus(s => ({ ...s, [p.id]: "saved" }));
      setApiKeys(k => ({ ...k, [p.id]: "" }));
      qc.invalidateQueries({ queryKey: ["providers"] });
      setTimeout(() => setSaveStatus(s => ({ ...s, [p.id]: null })), 2000);
    } catch {
      setSaveStatus(s => ({ ...s, [p.id]: "error" }));
      setTimeout(() => setSaveStatus(s => ({ ...s, [p.id]: null })), 2000);
    }
  }

  async function handleSetDefault(p: Provider, model: string) {
    await setDefaultMutation.mutateAsync({ providerId: p.id, model });
    qc.invalidateQueries({ queryKey: ["providers"] });
  }

  const configured = providers.filter(p => p.status === "configured" || p.status === "online");
  const missing    = providers.filter(p => p.status === "missing" || p.status === "offline");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full gap-3">
        <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
        <span className="text-sm font-mono text-muted-foreground">Providers yükleniyor...</span>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-5xl mx-auto p-6 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-mono text-foreground flex items-center gap-2">
              <Cpu className="w-6 h-6 text-primary" /> Providers
            </h1>
            <p className="text-sm text-muted-foreground mt-1 font-mono">
              {configured.length} aktif · {missing.length} bekleniyor
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
            Tara
          </Button>
        </div>

        {/* Provider Grid */}
        <div className="space-y-2">
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground px-1">Providers</p>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 divide-y divide-border sm:divide-y-0 sm:divide-x sm:divide-border">
              {providers.map((p, idx) => {
                const badge = STATUS_BADGE[p.status] ?? STATUS_BADGE.missing;
                const isExpanded = expandedId === p.id;
                const rfStatus = refreshStatus[p.id];
                const svStatus = saveStatus[p.id];
                const isRefreshing = refreshMutation.isPending && refreshMutation.variables === p.id;
                const isSaving = svStatus === "saving";

                return (
                  <div
                    key={p.id}
                    className={`relative ${idx % 3 !== 2 ? "lg:border-r border-border" : ""} ${Math.floor(idx / 3) > 0 ? "lg:border-t border-border" : ""}`}
                  >
                    <div className="p-4">
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="font-semibold text-sm text-foreground leading-tight">{p.name}</span>
                        <Badge className={`shrink-0 text-xs border font-mono px-1.5 py-0 ${badge.class}`}>
                          {badge.label}
                        </Badge>
                      </div>

                      {/* Subtitle: env var or URL */}
                      <p className="text-xs font-mono text-muted-foreground/70 mb-3 truncate">
                        {p.local ? p.baseUrl : (p.envKey ?? p.baseUrl)}
                      </p>

                      {/* Action button */}
                      <div className="flex gap-1.5 items-center">
                        {p.local ? (
                          <Button
                            size="sm" variant="outline"
                            className="h-7 text-xs flex-1"
                            onClick={() => handleRefresh(p)}
                            disabled={isRefreshing}
                          >
                            {isRefreshing
                              ? <RefreshCw className="w-3 h-3 animate-spin mr-1" />
                              : rfStatus?.ok === false
                                ? <X className="w-3 h-3 text-red-400 mr-1" />
                                : rfStatus?.ok === true
                                  ? <Check className="w-3 h-3 text-green-400 mr-1" />
                                  : null}
                            Test
                          </Button>
                        ) : (
                          <>
                            <Button
                              size="sm" variant="outline"
                              className="h-7 text-xs flex-1"
                              onClick={() => handleRefresh(p)}
                              disabled={isRefreshing || p.status === "missing"}
                            >
                              {isRefreshing
                                ? <RefreshCw className="w-3 h-3 animate-spin mr-1" />
                                : rfStatus?.ok
                                  ? <Check className="w-3 h-3 text-green-400 mr-1" />
                                  : null}
                              Refresh models
                            </Button>
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : p.id)}
                              className="h-7 w-7 rounded-md border border-border flex items-center justify-center hover:bg-muted/40 transition-colors text-muted-foreground"
                            >
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Expanded: Key input + model list */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden border-t border-border bg-background/40"
                        >
                          <div className="p-3 space-y-3">
                            {/* API Key input */}
                            {!p.local && (
                              <div className="space-y-1.5">
                                <label className="text-xs font-mono text-muted-foreground flex items-center justify-between">
                                  API Key
                                  <a href={p.signupUrl} target="_blank" rel="noopener noreferrer"
                                    className="text-primary hover:underline flex items-center gap-0.5">
                                    Key al <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                                  </a>
                                </label>
                                <div className="flex gap-1.5">
                                  <div className="relative flex-1">
                                    <Input
                                      type={showKey[p.id] ? "text" : "password"}
                                      className="text-xs font-mono h-7 pr-8"
                                      placeholder={p.hasDbKey ? "••••••• (kayıtlı)" : "sk-..."}
                                      value={apiKeys[p.id] ?? ""}
                                      onChange={e => setApiKeys(k => ({ ...k, [p.id]: e.target.value }))}
                                    />
                                    <button
                                      onClick={() => setShowKey(s => ({ ...s, [p.id]: !s[p.id] }))}
                                      className="absolute right-2 top-1.5 text-muted-foreground hover:text-foreground"
                                    >
                                      {showKey[p.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                    </button>
                                  </div>
                                  <Button
                                    size="sm" className="h-7 text-xs px-2.5 shrink-0"
                                    onClick={() => handleSaveKey(p)}
                                    disabled={!apiKeys[p.id]?.trim() || isSaving}
                                  >
                                    {svStatus === "saved"
                                      ? <Check className="w-3 h-3 text-green-400" />
                                      : svStatus === "error"
                                        ? <X className="w-3 h-3 text-red-400" />
                                        : isSaving
                                          ? <RefreshCw className="w-3 h-3 animate-spin" />
                                          : "Kaydet"}
                                  </Button>
                                </div>
                                {p.hasEnvKey && (
                                  <p className="text-xs text-green-400/70 font-mono">✓ {p.envKey} env var bulundu</p>
                                )}
                              </div>
                            )}

                            {/* Model list */}
                            {p.models.length > 0 && (
                              <div className="space-y-1">
                                <p className="text-xs font-mono text-muted-foreground">{p.models.length} model</p>
                                <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                                  {p.models.map(m => (
                                    <button
                                      key={m}
                                      onClick={() => handleSetDefault(p, m)}
                                      className="text-xs font-mono border border-border rounded px-1.5 py-0.5 hover:border-primary hover:text-primary transition-colors bg-background text-muted-foreground"
                                      title="Varsayılan model olarak seç"
                                    >
                                      {m}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            {rfStatus && (
                              <p className={`text-xs font-mono ${rfStatus.ok ? "text-green-400" : "text-red-400"}`}>
                                {rfStatus.ok ? `✓ ${rfStatus.count} model yüklendi` : "✗ Bağlantı kurulamadı"}
                              </p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Tip */}
        <div className="flex items-start gap-2 text-xs text-muted-foreground font-mono bg-muted/20 border border-border/50 rounded-lg p-3">
          <Zap className="w-3.5 h-3.5 text-yellow-400 shrink-0 mt-0.5" />
          <span>
            API anahtarını kaydettikten sonra <strong className="text-foreground">Refresh models</strong> butonuna bas — 
            modeller yüklenince kartlardan birini tıklayıp varsayılan model seçebilirsin.
          </span>
        </div>
      </div>
    </div>
  );
}
