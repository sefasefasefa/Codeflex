import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Plus, Brain, Send, FolderGit2, Loader2,
  Sparkles, Globe, Code2, Smartphone, LayoutDashboard,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useListProjects, getListProjectsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  thinking?: string;
  createdProject?: { id: string; name: string };
}

const APP_KEYWORDS = [
  "web sitesi", "website", "uygulama yap", "uygulama oluştur", "app yap",
  "mobil uygulama", "dashboard", "panel", "e-ticaret", "blog", "landing page",
  "portföy", "portfolio", "yönetim paneli", "admin panel", "build me", "create an app",
  "make a website", "make an app",
];

function isAppRequest(text: string): string | null {
  const lower = text.toLowerCase();
  for (const kw of APP_KEYWORDS) {
    if (lower.includes(kw)) return kw;
  }
  return null;
}

function guessProjectName(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("e-ticaret") || lower.includes("eticaret") || lower.includes("shop")) return "E-Ticaret Sitesi";
  if (lower.includes("blog")) return "Blog";
  if (lower.includes("portfolio") || lower.includes("portföy")) return "Portföy Sitesi";
  if (lower.includes("dashboard") || lower.includes("panel")) return "Dashboard";
  if (lower.includes("landing")) return "Landing Page";
  if (lower.includes("admin")) return "Admin Panel";
  if (lower.includes("mobil") || lower.includes("mobile")) return "Mobil Uygulama";
  if (lower.includes("web sitesi") || lower.includes("website")) return "Web Sitesi";
  return "Yeni Proje";
}

const QUICK_ACTIONS = [
  { icon: Globe, label: "Web Sitesi", prompt: "Benim için modern bir web sitesi yap" },
  { icon: LayoutDashboard, label: "Dashboard", prompt: "Bir yönetim dashboard'u oluştur" },
  { icon: Smartphone, label: "Mobil App", prompt: "Mobil uyumlu bir uygulama yap" },
  { icon: Code2, label: "API Projesi", prompt: "REST API projesi başlat" },
];

function ProjectCard({ project, onClick }: {
  project: { id: string; name: string; status: string; totalFiles?: number };
  onClick: () => void;
}) {
  const statusColor: Record<string, string> = {
    active: "bg-green-500",
    initialized: "bg-indigo-500",
    completed: "bg-slate-500",
    failed: "bg-red-500",
  };

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-3 rounded-xl border border-white/6 bg-white/[0.02] hover:bg-white/[0.06] hover:border-indigo-500/30 transition-all group"
    >
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-indigo-600/15 border border-indigo-500/20 flex items-center justify-center shrink-0 group-hover:bg-indigo-600/25 transition-colors">
          <FolderGit2 className="w-4 h-4 text-indigo-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-white/85 truncate group-hover:text-white">
            {project.name}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className={`w-1.5 h-1.5 rounded-full ${statusColor[project.status] ?? "bg-slate-500"}`} />
            <span className="text-[11px] text-white/30">{project.status}</span>
          </div>
        </div>
      </div>
    </button>
  );
}

export default function Chat() {
  const [, navigate] = useLocation();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: projects, isLoading: projectsLoading } = useListProjects();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const createProject = async (name: string, prompt: string): Promise<{ id: string; name: string } | null> => {
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description: prompt }),
        credentials: "include",
      });
      if (!res.ok) return null;
      const data = await res.json();
      await queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
      return { id: data.id, name: data.name };
    } catch {
      return null;
    }
  };

  const handleSend = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || isCreating) return;
    setInput("");

    const userMsg: Message = { id: `u-${Date.now()}`, role: "user", content: msg };
    setMessages((prev) => [...prev, userMsg]);

    const appKw = isAppRequest(msg);

    if (appKw) {
      setIsCreating(true);
      const projectName = guessProjectName(msg);

      const thinkingMsg: Message = {
        id: `t-${Date.now()}`,
        role: "assistant",
        content: "",
        thinking: `"${projectName}" projesi oluşturuluyor...`,
      };
      setMessages((prev) => [...prev, thinkingMsg]);

      const created = await createProject(projectName, msg);
      setIsCreating(false);

      if (created) {
        const assistantMsg: Message = {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: `"${created.name}" projesi oluşturuldu! Sol panelde görünüyor. Projeye girmek ister misiniz?`,
          createdProject: created,
        };
        setMessages((prev) => prev.filter((m) => m.id !== thinkingMsg.id).concat(assistantMsg));
      } else {
        const errMsg: Message = {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: "Proje oluşturulurken bir sorun oluştu. Tekrar deneyin.",
        };
        setMessages((prev) => prev.filter((m) => m.id !== thinkingMsg.id).concat(errMsg));
      }
    } else {
      const assistantMsg: Message = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: "Merhaba! Size bir uygulama veya web sitesi oluşturmamı ister misiniz? Örnek: \"Modern bir web sitesi yap\" veya \"E-ticaret uygulaması oluştur\"",
      };
      setMessages((prev) => [...prev, assistantMsg]);
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-full w-full overflow-hidden bg-[#080b14]">
      {/* Left sidebar — Projects */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 border-r border-white/5 bg-[#0d1117]">
        <div className="p-3 border-b border-white/5 flex items-center justify-between">
          <span className="text-xs font-semibold text-white/40 uppercase tracking-wider">Projeler</span>
          <button
            onClick={() => navigate("/projects")}
            className="p-1 rounded-lg text-white/30 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
            title="Tüm projeleri gör"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 flex flex-col gap-1">
            {projectsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-4 h-4 animate-spin text-white/20" />
              </div>
            ) : projects && projects.length > 0 ? (
              projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onClick={() => navigate(`/projects/${project.id}`)}
                />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 py-10 px-3 text-center">
                <FolderGit2 className="w-6 h-6 text-white/10" />
                <p className="text-xs text-white/25">Henüz proje yok</p>
                <p className="text-[11px] text-white/15">Chat'ten proje oluşturun</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </aside>

      {/* Main Chat */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {isEmpty ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center h-full px-6 gap-8">
              <div className="text-center">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/20 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-6 h-6 text-indigo-400" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Ne yapalım?</h2>
                <p className="text-white/40 text-sm max-w-xs">
                  Bir uygulama veya web sitesi isteyin — otomatik olarak proje oluşturulur.
                </p>
              </div>

              {/* Quick actions */}
              <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => handleSend(action.prompt)}
                    className="flex flex-col items-start gap-2 p-4 rounded-xl border border-white/6 bg-white/[0.02] hover:bg-white/[0.06] hover:border-indigo-500/30 transition-all text-left"
                  >
                    <action.icon className="w-5 h-5 text-indigo-400" />
                    <span className="text-sm font-medium text-white/70">{action.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-4 max-w-2xl mx-auto flex flex-col gap-4 pb-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col gap-1.5 ${msg.role === "user" ? "items-end" : "items-start"}`}
                >
                  {msg.thinking && (
                    <div className="max-w-[85%] rounded-xl bg-white/[0.03] border border-white/6 p-3">
                      <div className="flex items-center gap-1.5 text-xs text-purple-400 mb-1.5">
                        <Brain className="w-3 h-3" />
                        <span>Düşünüyor...</span>
                        <Loader2 className="w-3 h-3 animate-spin ml-1" />
                      </div>
                      <p className="text-xs text-white/40 font-mono">{msg.thinking}</p>
                    </div>
                  )}

                  {msg.content && (
                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-indigo-600 text-white"
                        : "bg-white/[0.04] border border-white/8 text-white/85"
                    }`}>
                      {msg.content}
                    </div>
                  )}

                  {msg.createdProject && (
                    <button
                      onClick={() => navigate(`/projects/${msg.createdProject!.id}`)}
                      className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-indigo-500/30 bg-indigo-600/10 hover:bg-indigo-600/20 transition-colors text-sm text-indigo-300 font-medium"
                    >
                      <FolderGit2 className="w-4 h-4" />
                      {msg.createdProject.name} projesine git →
                    </button>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-3 sm:p-4 border-t border-white/5 bg-[#080b14]">
          <div className="max-w-2xl mx-auto">
            <div className="relative flex items-center gap-2 bg-white/[0.04] border border-white/8 rounded-2xl px-4 py-3 focus-within:border-indigo-500/50 transition-colors">
              <input
                ref={inputRef}
                className="flex-1 bg-transparent text-sm text-white placeholder:text-white/25 outline-none"
                placeholder="Bir uygulama veya web sitesi isteyin..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                disabled={isCreating}
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || isCreating}
                className="w-8 h-8 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors shrink-0"
              >
                {isCreating ? (
                  <Loader2 className="w-4 h-4 text-white animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5 text-white" />
                )}
              </button>
            </div>
            <p className="text-center mt-2 text-[11px] text-white/20">
              Uygulama veya site isteğiniz sol panelde proje olarak oluşturulur
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
