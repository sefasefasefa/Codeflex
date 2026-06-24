import { useListProjects, getListProjectsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useState } from "react";
import {
  Plus, FolderGit2, Github, Loader2, CheckCircle2, AlertCircle,
  LogOut, Settings, Terminal, Sparkles,
} from "lucide-react";
import { useAuth } from "@workspace/replit-auth-web";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";

function ImportGitHubDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [filesImported, setFilesImported] = useState(0);
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const handleImport = async () => {
    if (!url.trim()) return;
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/projects/import-github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl: url.trim() }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Import başarısız oldu");
      setFilesImported(data.filesImported ?? 0);
      setStatus("success");
      setMessage(`"${data.name}" projesi başarıyla oluşturuldu.`);
      await queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
      setTimeout(() => { onClose(); navigate(`/projects/${data.id}`); }, 1800);
    } catch (err: unknown) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Bilinmeyen bir hata oluştu");
    }
  };

  const handleClose = () => {
    if (status === "loading") return;
    setUrl(""); setStatus("idle"); setMessage(""); onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-md bg-[#0d1117] border-white/10">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Github className="w-5 h-5" /> GitHub'dan Import Et
          </DialogTitle>
          <DialogDescription className="text-white/50">
            Herkese açık bir GitHub repo URL'si girin. Dosyalar indirilir ve yeni proje oluşturulur.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 pt-1">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-white/80">Repo URL</label>
            <input
              type="text"
              placeholder="https://github.com/owner/repo"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && status !== "loading") handleImport(); }}
              disabled={status === "loading" || status === "success"}
              className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-50"
            />
          </div>
          {status === "error" && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> <span>{message}</span>
            </div>
          )}
          {status === "success" && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
              <div><div>{message}</div><div className="text-xs mt-0.5 opacity-70">{filesImported} dosya import edildi.</div></div>
            </div>
          )}
          {status === "loading" && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" /> <span>Repo dosyaları indiriliyor...</span>
            </div>
          )}
          <div className="flex gap-2 justify-end pt-1">
            <button onClick={handleClose} disabled={status === "loading"}
              className="px-4 py-2 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/5 transition-colors">
              İptal
            </button>
            <button onClick={handleImport} disabled={!url.trim() || status === "loading" || status === "success"}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {status === "loading" ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> İndiriliyor...</>
                : status === "success" ? <><CheckCircle2 className="w-3.5 h-3.5" /> Tamamlandı</>
                : <><Github className="w-3.5 h-3.5" /> Import Et</>}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function NewProjectDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const handleCreate = async () => {
    if (!name.trim()) return;
    setStatus("loading");
    setError("");
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Proje oluşturulamadı");
      await queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
      onClose();
      navigate(`/projects/${data.id}`);
    } catch (err: unknown) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Bilinmeyen hata");
    }
  };

  const handleClose = () => {
    if (status === "loading") return;
    setName(""); setDescription(""); setStatus("idle"); setError(""); onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-md bg-[#0d1117] border-white/10">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Sparkles className="w-5 h-5 text-indigo-400" /> Yeni Proje
          </DialogTitle>
          <DialogDescription className="text-white/50">
            Yeni bir proje oluşturun ve AI ile kod yazmaya başlayın.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 pt-1">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-white/80">Proje Adı</label>
            <input
              type="text"
              placeholder="my-awesome-project"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
              autoFocus
              className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-white/80">Açıklama <span className="text-white/30">(isteğe bağlı)</span></label>
            <input
              type="text"
              placeholder="Proje açıklaması..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>
          {status === "error" && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          )}
          <div className="flex gap-2 justify-end pt-1">
            <button onClick={handleClose} disabled={status === "loading"}
              className="px-4 py-2 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/5 transition-colors">
              İptal
            </button>
            <button onClick={handleCreate} disabled={!name.trim() || status === "loading"}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors disabled:opacity-50">
              {status === "loading" ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Oluşturuluyor...</> : <><Sparkles className="w-3.5 h-3.5" /> Oluştur</>}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500/20 text-green-400 border-green-500/30",
  initialized: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  completed: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  failed: "bg-red-500/20 text-red-400 border-red-500/30",
};

export default function Projects() {
  const { data: projects, isLoading } = useListProjects();
  const [importOpen, setImportOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [, navigate] = useLocation();
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-[#080b14] text-white flex flex-col">
      {/* Top bar */}
      <header className="shrink-0 border-b border-white/5 bg-[#080b14]/95 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-indigo-600 flex items-center justify-center">
              <Terminal className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-sm tracking-tight">AI Studio</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/settings")}
              className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
              title="Ayarlar"
            >
              <Settings className="w-4 h-4" />
            </button>
            {user?.profileImageUrl ? (
              <img src={user.profileImageUrl} alt="Kullanici" className="w-8 h-8 rounded-full border border-white/10 object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center text-xs font-semibold text-indigo-300">
                {user?.firstName?.[0]?.toUpperCase() || "K"}
              </div>
            )}
            <button
              onClick={logout}
              className="p-2 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              title="Çıkış Yap"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">
        {/* Page header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Projelerim</h1>
            <p className="text-white/40 text-sm mt-0.5">Projene gir ve AI ile kodlamaya başla.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setImportOpen(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm border border-white/10 text-white/60 hover:text-white hover:border-white/20 hover:bg-white/5 transition-all"
            >
              <Github className="w-4 h-4" />
              <span className="hidden sm:inline">GitHub'dan Import</span>
            </button>
            <button
              onClick={() => setNewOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Yeni Proje</span>
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {projects?.map((project) => (
              <button
                key={project.id}
                onClick={() => navigate(`/projects/${project.id}`)}
                className="group relative aspect-square flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] hover:bg-white/[0.07] hover:border-indigo-500/40 transition-all duration-200 p-4 cursor-pointer overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
                <div className="relative w-12 h-12 rounded-xl bg-indigo-600/15 border border-indigo-500/20 flex items-center justify-center group-hover:bg-indigo-600/25 group-hover:border-indigo-500/40 transition-all">
                  <FolderGit2 className="w-6 h-6 text-indigo-400" />
                </div>
                <div className="relative flex flex-col items-center gap-1 w-full">
                  <span className="font-semibold text-sm text-white/90 truncate w-full text-center group-hover:text-white">
                    {project.name}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[project.status] ?? STATUS_COLORS.initialized}`}>
                    {project.status}
                  </span>
                </div>
                <div className="relative flex items-center gap-3 text-[11px] text-white/30">
                  <span>{project.totalRuns} run</span>
                  <span>·</span>
                  <span>{project.totalFiles} dosya</span>
                </div>
              </button>
            ))}

            {/* New project card */}
            <button
              onClick={() => setNewOpen(true)}
              className="group aspect-square flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-white/10 hover:border-indigo-500/40 hover:bg-indigo-500/5 transition-all duration-200 p-4 cursor-pointer"
            >
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-indigo-600/20 group-hover:border-indigo-500/30 transition-all">
                <Plus className="w-6 h-6 text-white/30 group-hover:text-indigo-400 transition-colors" />
              </div>
              <span className="text-sm text-white/30 group-hover:text-white/60 font-medium transition-colors">
                Yeni Proje
              </span>
            </button>
          </div>
        )}

        {!isLoading && projects?.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-4">
              <FolderGit2 className="w-8 h-8 text-indigo-400/60" />
            </div>
            <h3 className="text-lg font-semibold text-white/80 mb-2">Henüz proje yok</h3>
            <p className="text-white/40 text-sm mb-6">İlk projeyi oluştur ve AI ile kodlamaya başla.</p>
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => setImportOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm border border-white/10 text-white/60 hover:text-white hover:bg-white/5 transition-all">
                <Github className="w-4 h-4" /> GitHub'dan Import
              </button>
              <button onClick={() => setNewOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors">
                <Plus className="w-4 h-4" /> Proje Oluştur
              </button>
            </div>
          </div>
        )}
      </div>

      <ImportGitHubDialog open={importOpen} onClose={() => setImportOpen(false)} />
      <NewProjectDialog open={newOpen} onClose={() => setNewOpen(false)} />
    </div>
  );
}
