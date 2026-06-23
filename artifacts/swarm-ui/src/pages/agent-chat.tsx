import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Send, Plus, Bot, User, Cpu, RefreshCw, Copy,
  Check, FileCode, ChevronRight, Trash2,
} from "lucide-react";
import ReactMarkdown from "react-markdown";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" }, ...opts,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

type Agent = {
  id: string; key: string; role: string;
  description?: string; modelName?: string;
};

type Msg = { role: "user" | "assistant"; content: string; ts: string; files?: any[] };

const SOURCE_COLORS: Record<string, string> = {
  mistral: "text-orange-400", groq: "text-yellow-400", openrouter: "text-violet-400",
  gemini: "text-blue-400", openai: "text-green-400", anthropic: "text-purple-400",
  ollama: "text-cyan-400", mock: "text-muted-foreground",
};

const AGENT_COLORS = [
  "from-cyan-500/20 to-cyan-600/10 border-cyan-500/30",
  "from-violet-500/20 to-violet-600/10 border-violet-500/30",
  "from-emerald-500/20 to-emerald-600/10 border-emerald-500/30",
  "from-orange-500/20 to-orange-600/10 border-orange-500/30",
  "from-pink-500/20 to-pink-600/10 border-pink-500/30",
  "from-yellow-500/20 to-yellow-600/10 border-yellow-500/30",
];

export default function AgentChat() {
  const [, navigate] = useLocation();
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [convId, setConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { data: agents = [], isLoading } = useQuery<Agent[]>({
    queryKey: ["agents"],
    queryFn: () => apiFetch("/api/agents"),
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function selectAgent(agent: Agent) {
    setSelectedAgent(agent);
    setConvId(null);
    setMessages([]);
    setInput("");
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  function newChat() {
    setConvId(null);
    setMessages([]);
    setInput("");
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  async function sendMessage() {
    if (!input.trim() || !selectedAgent || sending) return;
    const userMsg: Msg = { role: "user", content: input, ts: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    const sentInput = input;
    setInput("");
    setSending(true);

    try {
      const res = await apiFetch(`/api/agents/${selectedAgent.key}/chat`, {
        method: "POST",
        body: JSON.stringify({ message: sentInput, conversationId: convId }),
      });
      setConvId(res.conversationId);
      const aMsg: Msg = {
        role: "assistant", content: res.content, ts: new Date().toISOString(),
        files: res.files?.length > 0 ? res.files : undefined,
      };
      setMessages(prev => [...prev, aMsg]);
    } catch (err: any) {
      setMessages(prev => [...prev, {
        role: "assistant", content: `❌ Hata: ${err.message}`, ts: new Date().toISOString(),
      }]);
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  function copyText(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key); setTimeout(() => setCopied(null), 1500);
  }

  function toggleFile(key: string) {
    setExpandedFiles(prev => { const s = new Set(prev); s.has(key) ? s.delete(key) : s.add(key); return s; });
  }

  const agentColor = (i: number) => AGENT_COLORS[i % AGENT_COLORS.length];

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Sol Panel: Ajan Listesi ─────────────────── */}
      <div className="w-64 shrink-0 border-r border-border flex flex-col bg-background">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <Cpu className="w-4 h-4 text-primary" />
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-primary">Ajanlar</span>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {isLoading && (
            <div className="flex items-center gap-2 px-2 py-4 text-muted-foreground">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span className="text-xs font-mono">Yükleniyor...</span>
            </div>
          )}
          {agents.map((agent, i) => (
            <button key={agent.id} onClick={() => selectAgent(agent)}
              className={`w-full text-left rounded-md p-3 border transition-all ${
                selectedAgent?.id === agent.id
                  ? `bg-gradient-to-br ${agentColor(i)} border-opacity-50`
                  : "border-transparent hover:border-border/50 hover:bg-muted/30"
              }`}>
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${agentColor(i)} flex items-center justify-center text-xs font-bold border ${agentColor(i).split(" ")[2]}`}>
                  {agent.key.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs font-mono font-semibold text-foreground truncate">{agent.key}</span>
                {selectedAgent?.id === agent.id && (
                  <ChevronRight className="w-3 h-3 text-primary ml-auto" />
                )}
              </div>
              <p className="text-xs text-muted-foreground leading-snug line-clamp-2">{agent.role}</p>
              {agent.modelName && (
                <Badge variant="outline" className="mt-1.5 text-xs py-0 font-mono">{agent.modelName}</Badge>
              )}
            </button>
          ))}
          {!isLoading && agents.length === 0 && (
            <div className="px-2 py-6 text-center">
              <Cpu className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground font-mono">Ajan bulunamadı</p>
              <button onClick={() => navigate("/agents")}
                className="text-xs text-primary hover:underline font-mono mt-1 block mx-auto">
                Ajan oluştur →
              </button>
            </div>
          )}
        </div>

        <div className="p-2 border-t border-border">
          <p className="text-xs text-muted-foreground font-mono px-2 mb-1 opacity-60">API</p>
          <div className="bg-background border border-border rounded p-2 font-mono text-xs text-muted-foreground">
            <p className="text-cyan-400 mb-0.5">POST /api/agents/:key/chat</p>
            <p className="opacity-60">{"{ message, conversationId? }"}</p>
          </div>
        </div>
      </div>

      {/* ── Sağ Panel: Sohbet Alanı ─────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selectedAgent ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
            <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Bot className="w-8 h-8 text-primary/60" />
            </div>
            <div>
              <h2 className="text-lg font-mono font-bold text-foreground mb-1">Ajan Sohbeti</h2>
              <p className="text-sm text-muted-foreground max-w-sm">
                Soldaki listeden bir ajan seçin. Her ajan kendi rolü ve kişiliğiyle yanıt verir.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 max-w-sm w-full">
              {agents.slice(0, 4).map((a, i) => (
                <button key={a.id} onClick={() => selectAgent(a)}
                  className={`text-left p-3 rounded-md border bg-gradient-to-br ${agentColor(i)} hover:opacity-90 transition-opacity`}>
                  <p className="text-xs font-mono font-bold">{a.key}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{a.role}</p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
              <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${agentColor(agents.findIndex(a => a.id === selectedAgent.id))} flex items-center justify-center text-sm font-bold border ${agentColor(agents.findIndex(a => a.id === selectedAgent.id)).split(" ")[2]}`}>
                {selectedAgent.key.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono font-bold text-foreground">{selectedAgent.key}</span>
                  {selectedAgent.modelName && (
                    <Badge variant="outline" className="text-xs font-mono py-0">{selectedAgent.modelName}</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">{selectedAgent.role}</p>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={newChat} className="h-7 text-xs">
                  <Plus className="w-3 h-3 mr-1" /> Yeni
                </Button>
                <Button variant="ghost" size="sm" onClick={() => {
                  copyText(`curl -X POST ${window.location.origin}${BASE}/api/agents/${selectedAgent.key}/chat \\\n  -H 'Content-Type: application/json' \\\n  -d '{"message": "Merhaba"}'`, "curl");
                }} className="h-7 text-xs" title="curl örneğini kopyala">
                  {copied === "curl" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                  <Bot className="w-10 h-10 text-muted-foreground/20" />
                  <div>
                    <p className="text-sm font-mono text-muted-foreground">{selectedAgent.key} ajana mesaj yaz</p>
                    {selectedAgent.description && (
                      <p className="text-xs text-muted-foreground/60 mt-1 max-w-xs">{selectedAgent.description}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center max-w-md">
                    {[
                      "Kendinizi tanıtır mısınız?",
                      "Nasıl yardımcı olabilirsiniz?",
                      "Bir kod örneği verir misiniz?",
                    ].map(q => (
                      <button key={q} onClick={() => { setInput(q); inputRef.current?.focus(); }}
                        className="text-xs font-mono border border-border rounded-full px-3 py-1.5 hover:border-primary hover:text-primary transition-colors bg-background">
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <AnimatePresence>
                {messages.map((msg, idx) => (
                  <motion.div key={idx} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                    <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${
                      msg.role === "user"
                        ? "bg-primary/20 text-primary border border-primary/30"
                        : `bg-gradient-to-br ${agentColor(agents.findIndex(a => a.id === selectedAgent.id))} border ${agentColor(agents.findIndex(a => a.id === selectedAgent.id)).split(" ")[2]}`
                    }`}>
                      {msg.role === "user" ? <User className="w-3.5 h-3.5" /> : selectedAgent.key.charAt(0).toUpperCase()}
                    </div>

                    <div className={`flex-1 max-w-[80%] ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col gap-1`}>
                      <div className={`rounded-xl px-4 py-3 text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "bg-primary/15 border border-primary/20 text-foreground"
                          : "bg-card border border-border text-foreground"
                      }`}>
                        {msg.role === "assistant" ? (
                          <div className="prose prose-invert prose-sm max-w-none">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        )}
                      </div>

                      {/* Files */}
                      {msg.files && msg.files.length > 0 && (
                        <div className="space-y-1.5 w-full">
                          {msg.files.map((f: any, fi: number) => {
                            const fileKey = `${idx}-${fi}`;
                            const isExp = expandedFiles.has(fileKey);
                            return (
                              <div key={fi} className="border border-border/60 rounded-lg overflow-hidden bg-background/50">
                                <button onClick={() => toggleFile(fileKey)}
                                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/30 transition-colors">
                                  <FileCode className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                                  <span className="text-xs font-mono text-cyan-400 flex-1 text-left">{f.path}</span>
                                  <Badge variant="outline" className="text-xs py-0">{f.language}</Badge>
                                  <button onClick={e => { e.stopPropagation(); copyText(f.content, fileKey + "copy"); }}
                                    className="p-1 hover:text-primary transition-colors">
                                    {copied === fileKey + "copy" ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                                  </button>
                                </button>
                                <AnimatePresence>
                                  {isExp && (
                                    <motion.pre initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
                                      className="overflow-hidden">
                                      <code className="block px-3 pb-3 text-xs font-mono text-muted-foreground overflow-x-auto whitespace-pre leading-relaxed">
                                        {f.content}
                                      </code>
                                    </motion.pre>
                                  )}
                                </AnimatePresence>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {msg.role === "assistant" && (
                        <button onClick={() => copyText(msg.content, `msg-${idx}`)}
                          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 self-start">
                          {copied === `msg-${idx}` ? <><Check className="w-2.5 h-2.5 text-green-400" /> Kopyalandı</> : <><Copy className="w-2.5 h-2.5" /> Kopyala</>}
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {sending && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                  <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold bg-gradient-to-br ${agentColor(agents.findIndex(a => a.id === selectedAgent.id))} border ${agentColor(agents.findIndex(a => a.id === selectedAgent.id)).split(" ")[2]}`}>
                    {selectedAgent.key.charAt(0).toUpperCase()}
                  </div>
                  <div className="bg-card border border-border rounded-xl px-4 py-3">
                    <div className="flex gap-1 items-center h-4">
                      {[0, 1, 2].map(i => (
                        <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50"
                          animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                          transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }} />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="shrink-0 border-t border-border p-3">
              <div className="flex gap-2 items-end">
                <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
                  rows={1} placeholder={`${selectedAgent.key} ajanına yaz... (Enter = gönder)`}
                  className="flex-1 bg-background border border-border rounded-xl px-4 py-3 text-sm font-mono resize-none focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
                  style={{ minHeight: 44, maxHeight: 200 }}
                  onInput={e => {
                    const t = e.currentTarget;
                    t.style.height = "auto";
                    t.style.height = Math.min(t.scrollHeight, 200) + "px";
                  }}
                />
                <Button onClick={sendMessage} disabled={!input.trim() || sending}
                  size="icon" className="h-11 w-11 rounded-xl shrink-0">
                  {sending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground font-mono mt-2 text-center opacity-50">
                Shift+Enter yeni satır · Enter gönder
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
