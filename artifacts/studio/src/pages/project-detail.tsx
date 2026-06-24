import { useState, useRef, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import {
  useGetProject, useListProjectFiles, useListRuns,
} from "@workspace/api-client-react";
import {
  ArrowLeft, FolderGit2, Github, FileText, Activity,
  CheckCircle2, XCircle, ChevronRight, FolderOpen, File,
  Send, Plus, Search, Brain, MessageSquare, Loader2,
  Terminal, Zap, Settings,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useUser, useClerk } from "@clerk/react";

function Avatar({ user }: { user: { firstName?: string | null; imageUrl?: string | null } | null }) {
  if (user?.imageUrl) {
    return <img src={user.imageUrl} alt="K" className="w-7 h-7 rounded-full border border-white/10 object-cover" />;
  }
  return (
    <div className="w-7 h-7 rounded-full bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center text-xs font-semibold text-indigo-300">
      {user?.firstName?.[0]?.toUpperCase() || "K"}
    </div>
  );
}

function BuildPanel({ projectId }: { projectId: string }) {
  const { data: runs, isLoading } = useListRuns({ projectId });
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0 px-3 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-indigo-400" />
          <span className="text-sm font-semibold text-white/80">Build</span>
          {runs && runs.length > 0 && (
            <span className="ml-auto text-[10px] text-white/30 bg-white/5 px-1.5 py-0.5 rounded-full">
              {runs.length}
            </span>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-4 h-4 animate-spin text-white/30" />
          </div>
        ) : !runs?.length ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 px-4 text-center">
            <Activity className="w-6 h-6 text-white/15" />
            <p className="text-xs text-white/30">Henüz build yok</p>
            <p className="text-[11px] text-white/20">Chat'ten proje oluşturun</p>
          </div>
        ) : (
          <div className="p-2 flex flex-col gap-1">
            {runs.map((run) => {
              const isExpanded = expanded === run.id;
              return (
                <div key={run.id} className="rounded-lg border border-white/6 bg-white/[0.02] overflow-hidden">
                  <button
                    onClick={() => setExpanded(isExpanded ? null : run.id)}
                    className="w-full flex items-start gap-2.5 p-2.5 hover:bg-white/4 transition-colors text-left"
                  >
                    <div className="mt-0.5 shrink-0">
                      {run.status === "completed" ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                      ) : run.status === "failed" ? (
                        <XCircle className="w-3.5 h-3.5 text-red-400" />
                      ) : (
                        <Activity className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white/70 font-medium truncate leading-relaxed">
                        {run.prompt || `Run #${run.id.slice(0, 6)}`}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-white/30 font-mono">{run.id.slice(0, 6)}</span>
                        <span className="text-[10px] text-white/20">·</span>
                        <span className="text-[10px] text-white/30">{run.filesWritten ?? 0} dosya</span>
                      </div>
                    </div>
                    <ChevronRight className={`w-3 h-3 text-white/20 shrink-0 mt-0.5 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                  </button>
                  {isExpanded && (
                    <div className="border-t border-white/5 px-3 py-2.5 bg-white/[0.015]">
                      <div className="text-[11px] text-white/40 space-y-1">
                        <div className="flex justify-between">
                          <span>Durum</span>
                          <span className={
                            run.status === "completed" ? "text-green-400" :
                            run.status === "failed" ? "text-red-400" : "text-indigo-400"
                          }>{run.status}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Oluşturulma</span>
                          <span>{new Date(run.createdAt).toLocaleDateString("tr-TR")}</span>
                        </div>
                        {run.filesWritten ? (
                          <div className="flex justify-between">
                            <span>Dosyalar</span>
                            <span>{run.filesWritten}</span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  thinking?: string;
}

const INITIAL_MESSAGES: ChatMessage[] = [];

function ChatPanel({ project }: { project: { id: string; name: string } }) {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || sending) return;
    setInput("");
    setSending(true);

    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: "user", content: msg };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: msg, projectId: project.id }),
      });
      const data = await res.json();
      const assistantMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: data.message ?? data.content ?? data.response ?? "Yanıt alınamadı.",
        thinking: data.thinking,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [...prev, {
        id: `a-${Date.now()}`, role: "assistant",
        content: "Bir hata oluştu. Lütfen tekrar deneyin.",
      }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#080b14]">
      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b border-white/5 flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-indigo-400" />
        <span className="text-sm font-semibold text-white/80">Chat</span>
        <span className="text-xs text-white/30 ml-1">— {project.name}</span>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 overflow-hidden">
        <div className="p-4 flex flex-col gap-4 min-h-full">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center">
                <Terminal className="w-6 h-6 text-indigo-400/60" />
              </div>
              <div>
                <p className="text-sm font-medium text-white/50">{project.name} ile konuş</p>
                <p className="text-xs text-white/25 mt-1">Proje hakkında soru sor veya kod yazdır</p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center mt-2">
                {["Bu projeyi açıkla", "Dosyaları listele", "Bir API endpoint ekle"].map((s) => (
                  <button key={s} onClick={() => handleSend(s)}
                    className="text-xs px-3 py-1.5 rounded-full border border-white/8 text-white/40 hover:text-white/70 hover:border-white/20 hover:bg-white/5 transition-all">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={`flex flex-col gap-1.5 ${msg.role === "user" ? "items-end" : "items-start"}`}>
              {msg.thinking && (
                <div className="max-w-[85%] rounded-lg bg-white/3 border border-white/6 p-3 text-sm text-white/40">
                  <div className="flex items-center gap-1.5 font-medium text-xs mb-1.5">
                    <Brain className="w-3 h-3 text-purple-400" />
                    <span className="text-purple-400">Düşünce süreci</span>
                  </div>
                  <div className="font-mono text-xs leading-relaxed">{msg.thinking}</div>
                </div>
              )}
              <div className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-indigo-600 text-white"
                  : "bg-white/5 border border-white/8 text-white/80"
              }`}>
                <pre className="whitespace-pre-wrap font-sans">{msg.content}</pre>
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex items-start">
              <div className="bg-white/5 border border-white/8 rounded-xl px-3.5 py-2.5 flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                <span className="text-sm text-white/40">Yanıt oluşturuluyor...</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="shrink-0 p-3 border-t border-white/5 bg-[#080b14]">
        <div className="relative flex items-end gap-2">
          <textarea
            rows={1}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-indigo-500/50 focus:bg-white/7 resize-none leading-relaxed transition-colors pr-12"
            placeholder="Mesaj yaz..."
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
            }}
            style={{ minHeight: "44px" }}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || sending}
            className="absolute right-2 bottom-2 w-8 h-8 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
          >
            <Send className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}

function FilesPanel({ projectId, githubUrl }: { projectId: string; githubUrl?: string | null }) {
  const { data: files, isLoading } = useListProjectFiles(projectId);
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filtered = files?.filter((f) =>
    !search || f.path.toLowerCase().includes(search.toLowerCase())
  );

  const selectedFile = files?.find((f) => f.path === selected);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 px-3 py-3 border-b border-white/5">
        <div className="flex items-center gap-2 mb-2.5">
          <FileText className="w-4 h-4 text-indigo-400" />
          <span className="text-sm font-semibold text-white/80">Dosyalar</span>
          {files && files.length > 0 && (
            <span className="ml-auto text-[10px] text-white/30 bg-white/5 px-1.5 py-0.5 rounded-full">
              {files.length}
            </span>
          )}
        </div>
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-white/25" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Dosya ara..."
            className="w-full pl-8 pr-3 py-1.5 bg-white/5 border border-white/8 rounded-lg text-xs text-white/70 placeholder:text-white/25 focus:outline-none focus:border-indigo-500/40 transition-colors"
          />
        </div>
      </div>

      {/* GitHub link */}
      {githubUrl && (
        <a
          href={githubUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 flex items-center gap-2 px-3 py-2.5 border-b border-white/5 hover:bg-white/3 transition-colors group"
        >
          <Github className="w-3.5 h-3.5 text-white/40 group-hover:text-white/70" />
          <span className="text-xs text-white/40 group-hover:text-white/70 truncate">{githubUrl.replace("https://github.com/", "")}</span>
          <ChevronRight className="w-3 h-3 text-white/20 ml-auto shrink-0" />
        </a>
      )}

      {/* File list */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-4 h-4 animate-spin text-white/30" />
          </div>
        ) : !filtered?.length ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 px-4 text-center">
            <FolderOpen className="w-6 h-6 text-white/15" />
            <p className="text-xs text-white/30">{search ? "Sonuç yok" : "Henüz dosya yok"}</p>
          </div>
        ) : (
          <div className="p-2 flex flex-col gap-0.5">
            {filtered.map((file) => {
              const isActive = selected === file.path;
              const parts = file.path.split("/");
              const name = parts[parts.length - 1];
              const dir = parts.length > 1 ? parts.slice(0, -1).join("/") : null;
              return (
                <button
                  key={file.id}
                  onClick={() => setSelected(isActive ? null : file.path)}
                  className={`w-full flex items-start gap-2 px-2.5 py-2 rounded-lg text-left transition-all ${
                    isActive ? "bg-indigo-600/15 border border-indigo-500/25" : "hover:bg-white/4 border border-transparent"
                  }`}
                >
                  <File className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${isActive ? "text-indigo-400" : "text-white/30"}`} />
                  <div className="min-w-0 flex-1">
                    <span className={`text-xs font-medium truncate block ${isActive ? "text-indigo-300" : "text-white/60"}`}>{name}</span>
                    {dir && <span className="text-[10px] text-white/25 font-mono truncate block">{dir}</span>}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* File preview */}
      {selectedFile && (
        <div className="shrink-0 border-t border-white/5 max-h-56 flex flex-col">
          <div className="flex items-center justify-between px-3 py-2 bg-white/[0.02] border-b border-white/5">
            <span className="text-[11px] font-mono text-white/50 truncate">{selectedFile.path}</span>
            <span className="text-[10px] text-white/25 shrink-0 ml-2">v{selectedFile.version}</span>
          </div>
          <ScrollArea className="flex-1">
            <pre className="p-3 text-[11px] font-mono text-white/50 leading-relaxed whitespace-pre-wrap break-all">
              {selectedFile.content?.slice(0, 800) ?? ""}
              {(selectedFile.content?.length ?? 0) > 800 && "\n... (devamı var)"}
            </pre>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { data: project, isLoading } = useGetProject(id);
  const { user } = useUser();
  const { signOut } = useClerk();
  const basePath = import.meta.env.BASE_URL?.replace(/\/+$/, "") || "";

  if (isLoading) {
    return (
      <div className="h-screen bg-[#080b14] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="h-screen bg-[#080b14] flex items-center justify-center flex-col gap-3">
        <FolderGit2 className="w-8 h-8 text-white/20" />
        <p className="text-white/40 text-sm">Proje bulunamadı</p>
        <button onClick={() => navigate("/projects")}
          className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
          ← Projelere dön
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#080b14] text-white flex flex-col overflow-hidden">
      {/* Top bar */}
      <header className="shrink-0 h-12 border-b border-white/5 flex items-center px-3 gap-3 bg-[#080b14]/95">
        <button
          onClick={() => navigate("/projects")}
          className="flex items-center gap-1.5 text-white/40 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/5"
          title="Projelere dön"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="w-px h-4 bg-white/10" />
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-5 h-5 rounded-md bg-indigo-600/20 border border-indigo-500/20 flex items-center justify-center shrink-0">
            <FolderGit2 className="w-3 h-3 text-indigo-400" />
          </div>
          <span className="font-semibold text-sm text-white/80 truncate">{project.name}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium shrink-0 ${
            project.status === "active" ? "bg-green-500/15 text-green-400 border-green-500/25" : "bg-white/5 text-white/30 border-white/10"
          }`}>
            {project.status}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => navigate("/settings")}
            className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/5 transition-colors">
            <Settings className="w-3.5 h-3.5" />
          </button>
          <Avatar user={user} />
          <button onClick={() => signOut({ redirectUrl: basePath || "/" })}
            className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* 3-column workspace */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left: Build */}
        <div className="w-60 xl:w-64 shrink-0 border-r border-white/5 flex flex-col overflow-hidden hidden md:flex">
          <BuildPanel projectId={id} />
        </div>

        {/* Center: Chat */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <ChatPanel project={{ id, name: project.name }} />
        </div>

        {/* Right: Files + GitHub */}
        <div className="w-60 xl:w-72 shrink-0 border-l border-white/5 flex flex-col overflow-hidden hidden md:flex">
          <FilesPanel projectId={id} githubUrl={project.githubUrl} />
        </div>
      </div>
    </div>
  );
}
