import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare, Plus, Trash2, Send, Loader2, FileCode2,
  ChevronDown, ChevronRight, Copy, Check, Bot, User,
  Layers, RefreshCw, FolderOpen, Sparkles,
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

type ConvSummary = {
  id: string; title: string; projectId: string | null;
  model: string | null; createdAt: string; updatedAt: string;
};

type ChatMsg = {
  role: "user" | "assistant";
  content: string;
  ts: string;
  files?: Array<{ path: string; content: string; language: string }>;
};

type Conversation = {
  id: string; title: string; projectId: string | null;
  model: string | null; messages: ChatMsg[]; createdAt: string; updatedAt: string;
};

type Project = { id: string; name: string; status: string };

// ── Markdown-like renderer (no external dep) ──────────────────────────────────
function renderMarkdown(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const lines = text.split("\n");
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      nodes.push(<CodeBlock key={key++} lang={lang} code={codeLines.join("\n")} />);
      i++;
      continue;
    }

    // Heading
    if (line.startsWith("### ")) {
      nodes.push(<h3 key={key++} className="text-sm font-bold font-mono text-foreground mt-3 mb-1">{line.slice(4)}</h3>);
      i++; continue;
    }
    if (line.startsWith("## ")) {
      nodes.push(<h2 key={key++} className="text-base font-bold font-mono text-foreground mt-4 mb-1">{line.slice(3)}</h2>);
      i++; continue;
    }
    if (line.startsWith("# ")) {
      nodes.push(<h1 key={key++} className="text-lg font-bold font-mono text-foreground mt-4 mb-2">{line.slice(2)}</h1>);
      i++; continue;
    }

    // Horizontal rule
    if (line.match(/^[-*]{3,}$/)) {
      nodes.push(<hr key={key++} className="border-border my-3" />);
      i++; continue;
    }

    // Empty line
    if (!line.trim()) {
      nodes.push(<div key={key++} className="h-2" />);
      i++; continue;
    }

    // Bullet list
    if (line.match(/^[\-\*] /)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^[\-\*] /)) {
        items.push(lines[i].slice(2));
        i++;
      }
      nodes.push(
        <ul key={key++} className="list-disc list-inside space-y-0.5 my-1">
          {items.map((item, idx) => (
            <li key={idx} className="text-sm text-foreground font-mono">{inlineFormat(item)}</li>
          ))}
        </ul>
      );
      continue;
    }

    // Numbered list
    if (line.match(/^\d+\. /)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^\d+\. /)) {
        items.push(lines[i].replace(/^\d+\. /, ""));
        i++;
      }
      nodes.push(
        <ol key={key++} className="list-decimal list-inside space-y-0.5 my-1">
          {items.map((item, idx) => (
            <li key={idx} className="text-sm text-foreground font-mono">{inlineFormat(item)}</li>
          ))}
        </ol>
      );
      continue;
    }

    // Paragraph
    nodes.push(<p key={key++} className="text-sm font-mono text-foreground leading-relaxed">{inlineFormat(line)}</p>);
    i++;
  }

  return nodes;
}

function inlineFormat(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|_[^_]+_)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return <strong key={i} className="font-bold text-foreground">{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`"))
      return <code key={i} className="bg-muted px-1 py-0.5 rounded text-cyan-400 text-xs">{part.slice(1, -1)}</code>;
    if (part.startsWith("_") && part.endsWith("_"))
      return <em key={i} className="italic text-muted-foreground">{part.slice(1, -1)}</em>;
    return <span key={i}>{part}</span>;
  });
}

function CodeBlock({ lang, code }: { lang: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const isFile = lang.startsWith("// 📄 ");
  const displayLang = isFile ? lang.replace("// 📄 ", "📄 ") : (lang || "code");

  function copy() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="my-2 rounded-md border border-border overflow-hidden">
      <div className="flex items-center justify-between bg-muted/50 px-3 py-1.5 border-b border-border">
        <span className="text-xs font-mono text-muted-foreground">{displayLang}</span>
        <button onClick={copy} className="text-muted-foreground hover:text-foreground transition-colors">
          {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
        </button>
      </div>
      <pre className="p-3 text-xs font-mono text-foreground overflow-x-auto bg-background/80 max-h-80">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function FileCard({ file }: { file: { path: string; content: string; language: string } }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  function copy() { navigator.clipboard.writeText(file.content); setCopied(true); setTimeout(() => setCopied(false), 1500); }
  return (
    <div className="mt-2 rounded-md border border-cyan-400/30 bg-cyan-400/5 overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-cyan-400/10 transition-colors"
      >
        {open ? <ChevronDown className="w-3 h-3 text-cyan-400" /> : <ChevronRight className="w-3 h-3 text-cyan-400" />}
        <FileCode2 className="w-3 h-3 text-cyan-400" />
        <span className="text-xs font-mono text-cyan-400 flex-1">{file.path}</span>
        <Badge variant="outline" className="text-xs text-cyan-400 border-cyan-400/30">{file.language}</Badge>
        <button
          onClick={e => { e.stopPropagation(); copy(); }}
          className="ml-1 text-muted-foreground hover:text-foreground"
        >
          {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
        </button>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <pre className="p-3 text-xs font-mono text-foreground overflow-x-auto bg-background/80 max-h-60 border-t border-cyan-400/20">
              <code>{file.content}</code>
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MessageBubble({ msg }: { msg: ChatMsg }) {
  const isUser = msg.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
        isUser ? "bg-primary/20 text-primary" : "bg-cyan-400/20 text-cyan-400"
      }`}>
        {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
      </div>
      <div className={`flex-1 max-w-[85%] ${isUser ? "items-end" : "items-start"} flex flex-col`}>
        <div className={`rounded-lg px-3 py-2 ${
          isUser
            ? "bg-primary/15 border border-primary/30 text-right"
            : "bg-muted/50 border border-border"
        }`}>
          {isUser
            ? <p className="text-sm font-mono text-foreground whitespace-pre-wrap">{msg.content}</p>
            : <div className="space-y-1">{renderMarkdown(msg.content)}</div>
          }
        </div>
        {msg.files && msg.files.length > 0 && (
          <div className="w-full mt-1 space-y-1">
            {msg.files.map((f, i) => <FileCard key={i} file={f} />)}
          </div>
        )}
        <span className="text-xs text-muted-foreground mt-1 font-mono">
          {new Date(msg.ts).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </motion.div>
  );
}

export default function Chat() {
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [projectId, setProjectId] = useState<string>("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: conversations = [] } = useQuery<ConvSummary[]>({
    queryKey: ["conversations"],
    queryFn: () => apiFetch("/api/chat"),
    refetchInterval: 10000,
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["projects-list"],
    queryFn: () => apiFetch("/api/projects"),
  });

  const { data: activeConv, isLoading: loadingConv } = useQuery<Conversation>({
    queryKey: ["conversation", activeId],
    queryFn: () => apiFetch(`/api/chat/${activeId}`),
    enabled: !!activeId,
    staleTime: 0,
  });

  const createMutation = useMutation({
    mutationFn: (data: { title?: string; projectId?: string }) =>
      apiFetch("/api/chat", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: (conv: ConvSummary) => {
      qc.invalidateQueries({ queryKey: ["conversations"] });
      setActiveId(conv.id);
    },
  });

  const sendMutation = useMutation({
    mutationFn: ({ id, content, pid }: { id: string; content: string; pid?: string }) =>
      apiFetch(`/api/chat/${id}/message`, {
        method: "POST",
        body: JSON.stringify({ content, projectId: pid || undefined }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conversation", activeId] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/chat/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conversations"] });
      if (activeId) setActiveId(null);
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConv?.messages]);

  async function handleSend() {
    const text = input.trim();
    if (!text || sendMutation.isPending) return;
    setInput("");

    let convId = activeId;
    if (!convId) {
      const conv = await createMutation.mutateAsync({
        title: text.slice(0, 60),
        projectId: projectId || undefined,
      });
      convId = conv.id;
    }

    await sendMutation.mutateAsync({ id: convId!, content: text, pid: projectId });
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  async function newConversation() {
    const conv = await createMutation.mutateAsync({ projectId: projectId || undefined });
    setActiveId(conv.id);
  }

  const isSending = sendMutation.isPending || createMutation.isPending;
  const messages = activeConv?.messages ?? [];

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Sidebar: Conversation List ───────────────────────── */}
      <div className="w-56 shrink-0 border-r border-border flex flex-col bg-background">
        <div className="p-3 border-b border-border flex items-center justify-between">
          <span className="text-xs font-mono font-semibold text-muted-foreground uppercase tracking-widest">Sohbetler</span>
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={newConversation}>
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Project Filter */}
        <div className="px-2 py-2 border-b border-border/50">
          <select
            value={projectId}
            onChange={e => setProjectId(e.target.value)}
            className="w-full bg-background border border-border rounded px-2 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">— proje seç —</option>
            {projects.map((p: Project) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 && (
            <div className="p-4 text-center">
              <MessageSquare className="w-6 h-6 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground font-mono">Henüz sohbet yok</p>
            </div>
          )}
          {conversations.map(conv => (
            <button
              key={conv.id}
              onClick={() => setActiveId(conv.id)}
              className={`w-full text-left px-3 py-2.5 border-b border-border/30 hover:bg-muted/30 transition-colors group ${
                activeId === conv.id ? "bg-primary/10 border-l-2 border-l-primary" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-1">
                <p className={`text-xs font-mono truncate flex-1 ${
                  activeId === conv.id ? "text-primary" : "text-foreground"
                }`}>{conv.title}</p>
                <button
                  onClick={e => { e.stopPropagation(); deleteMutation.mutate(conv.id); }}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
              {conv.projectId && (
                <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">
                  <Layers className="w-2.5 h-2.5 inline mr-1" />
                  {projects.find((p: Project) => p.id === conv.projectId)?.name ?? conv.projectId}
                </p>
              )}
              {conv.model && (
                <p className="text-xs text-cyan-400/60 font-mono mt-0.5 truncate">{conv.model}</p>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main Chat Area ────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Header */}
        <div className="flex items-center justify-between px-4 h-12 border-b border-border shrink-0">
          {activeConv ? (
            <div className="flex items-center gap-2 min-w-0">
              <Bot className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="text-sm font-mono font-medium text-foreground truncate">{activeConv.title}</span>
              {activeConv.model && (
                <Badge variant="outline" className="text-xs font-mono text-cyan-400 border-cyan-400/30 shrink-0">
                  {activeConv.model}
                </Badge>
              )}
              {activeConv.projectId && (
                <Badge variant="outline" className="text-xs font-mono shrink-0">
                  <Layers className="w-2.5 h-2.5 mr-1" />
                  {projects.find((p: Project) => p.id === activeConv.projectId)?.name}
                </Badge>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-mono text-muted-foreground">SWARM_CTRL AI Asistan</span>
            </div>
          )}
          <div className="flex items-center gap-2 shrink-0">
            {activeId && (
              <Button variant="ghost" size="icon" className="h-7 w-7"
                onClick={() => qc.invalidateQueries({ queryKey: ["conversation", activeId] })}>
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!activeId && (
            <div className="flex flex-col items-center justify-center h-full text-center gap-4 py-16">
              <div className="w-16 h-16 rounded-full bg-cyan-400/10 flex items-center justify-center">
                <Bot className="w-8 h-8 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold font-mono text-foreground mb-1">SWARM_CTRL AI</h2>
                <p className="text-sm text-muted-foreground font-mono max-w-sm">
                  Kod yaz, dosya oluştur, proje geliştir.<br />
                  Shift+Enter ile yeni satır, Enter ile gönder.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 max-w-md">
                {[
                  "Express.js ile JWT auth servisi yaz",
                  "React hook: useFetch ile API çağrısı",
                  "PostgreSQL schema: kullanıcı ve sipariş tabloları",
                  "TypeScript: generic pagination yardımcısı",
                ].map(suggestion => (
                  <button
                    key={suggestion}
                    onClick={() => { setInput(suggestion); textareaRef.current?.focus(); }}
                    className="text-left text-xs font-mono text-muted-foreground border border-border rounded-md px-3 py-2 hover:border-primary hover:text-foreground transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
              <Button onClick={newConversation} variant="outline" size="sm">
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Yeni Sohbet Başlat
              </Button>
            </div>
          )}

          {loadingConv && activeId && (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {messages.map((msg, i) => (
            <MessageBubble key={i} msg={msg} />
          ))}

          {isSending && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-3"
            >
              <div className="w-7 h-7 rounded-full bg-cyan-400/20 text-cyan-400 flex items-center justify-center shrink-0">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <div className="bg-muted/50 border border-border rounded-lg px-3 py-2.5">
                <div className="flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </motion.div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-border p-3 shrink-0">
          <div className="flex gap-2 items-end">
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder={activeId ? "Mesaj yaz... (Enter: gönder, Shift+Enter: yeni satır)" : "Yeni sohbet başlatmak için yaz..."}
                className="min-h-[44px] max-h-40 resize-none font-mono text-sm pr-3 bg-background border-border"
                rows={1}
                disabled={isSending}
              />
            </div>
            <Button
              size="icon"
              className="h-11 w-11 shrink-0"
              onClick={handleSend}
              disabled={!input.trim() || isSending}
            >
              {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground font-mono mt-1.5 flex items-center gap-1">
            <FileCode2 className="w-3 h-3" />
            Dosya oluşturmak için: <code className="text-cyan-400 bg-muted px-1 rounded">```file:src/app.ts</code> formatını kullanabilirsin
            {projectId && (
              <span className="ml-auto text-cyan-400/60 flex items-center gap-1">
                <Layers className="w-2.5 h-2.5" />
                {projects.find((p: Project) => p.id === projectId)?.name}
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
