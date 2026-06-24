import { useListProjects, getListProjectsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useState } from "react";
import { Plus, FolderGit2, Activity, Clock, Github, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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

      setTimeout(() => {
        onClose();
        navigate(`/projects/${data.id}`);
      }, 1800);
    } catch (err: unknown) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Bilinmeyen bir hata oluştu");
    }
  };

  const handleClose = () => {
    if (status === "loading") return;
    setUrl("");
    setStatus("idle");
    setMessage("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Github className="w-5 h-5" />
            GitHub'dan Import Et
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Herkese açık bir GitHub repo URL'si girin. Dosyalar otomatik olarak indirilir ve yeni bir proje oluşturulur.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 pt-1">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Repo URL</label>
            <input
              type="text"
              placeholder="https://github.com/owner/repo"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && status !== "loading") handleImport(); }}
              disabled={status === "loading" || status === "success"}
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
            />
            <p className="text-xs text-muted-foreground">
              Örnek: <span className="font-mono text-foreground/70">facebook/react</span> veya tam URL
            </p>
          </div>

          {status === "error" && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/30 text-destructive text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{message}</span>
            </div>
          )}

          {status === "success" && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-green-500/10 border border-green-500/30 text-green-600 dark:text-green-400 text-sm">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <div>{message}</div>
                <div className="text-xs mt-0.5 opacity-80">{filesImported} dosya import edildi. Proje sayfasına yönlendiriliyorsunuz...</div>
              </div>
            </div>
          )}

          {status === "loading" && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-primary/10 border border-primary/30 text-primary text-sm">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              <span>Repo dosyaları indiriliyor, lütfen bekleyin...</span>
            </div>
          )}

          <div className="flex gap-2 justify-end pt-1">
            <Button variant="ghost" onClick={handleClose} disabled={status === "loading"} size="sm">
              İptal
            </Button>
            <Button
              onClick={handleImport}
              disabled={!url.trim() || status === "loading" || status === "success"}
              size="sm"
              className="gap-2 min-w-[120px]"
            >
              {status === "loading" ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> İndiriliyor...</>
              ) : status === "success" ? (
                <><CheckCircle2 className="w-3.5 h-3.5" /> Tamamlandı</>
              ) : (
                <><Github className="w-3.5 h-3.5" /> Import Et</>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Projects() {
  const { data: projects, isLoading } = useListProjects();
  const [importOpen, setImportOpen] = useState(false);

  if (isLoading) {
    return <div className="p-8 flex items-center justify-center h-full">Yükleniyor...</div>;
  }

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto w-full pb-20 md:pb-8">
      <div className="flex items-center justify-between mb-5 sm:mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Projeler</h1>
          <p className="text-muted-foreground text-sm mt-1">Sistemdeki tum calisma alanlari.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setImportOpen(true)}
          >
            <Github className="w-4 h-4" />
            <span className="hidden sm:inline">GitHub'dan Import</span>
            <span className="sm:hidden">Import</span>
          </Button>
          <Button className="gap-2" size="sm">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Yeni Proje</span>
            <span className="sm:hidden">Yeni</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {projects?.map((project) => (
          <Link key={project.id} href={`/projects/${project.id}`}>
            <div className="group border border-border bg-card hover:bg-accent/30 hover:border-primary/50 transition-all rounded-lg p-5 cursor-pointer flex flex-col h-full">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <FolderGit2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{project.name}</h3>
                    <div className="text-xs text-muted-foreground font-mono mt-0.5">{project.id.split('-')[0]}</div>
                  </div>
                </div>
                <Badge variant={project.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                  {project.status}
                </Badge>
              </div>
              
              <p className="text-sm text-muted-foreground line-clamp-2 mb-6 flex-1">
                {project.description || "Açıklama bulunmuyor."}
              </p>
              
              <div className="grid grid-cols-3 gap-2 border-t border-border/50 pt-4 mt-auto">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Activity className="w-3 h-3" />
                    Çalıştırmalar
                  </div>
                  <div className="font-mono text-sm">{project.totalRuns}</div>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <FolderGit2 className="w-3 h-3" />
                    Dosyalar
                  </div>
                  <div className="font-mono text-sm">{project.totalFiles}</div>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    Güncelleme
                  </div>
                  <div className="font-mono text-xs truncate">
                    {new Date(project.updatedAt).toLocaleDateString("tr-TR")}
                  </div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
      
      {projects?.length === 0 && (
        <div className="text-center py-20 border border-dashed border-border rounded-lg">
          <FolderGit2 className="w-10 h-10 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-medium text-lg mb-2">Henüz proje yok</h3>
          <p className="text-muted-foreground mb-6">Sistemde oluşturulmuş bir proje bulunamadı.</p>
          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" onClick={() => setImportOpen(true)} className="gap-2">
              <Github className="w-4 h-4" />
              GitHub'dan Import Et
            </Button>
            <Button variant="outline">İlk Projeyi Oluştur</Button>
          </div>
        </div>
      )}

      <ImportGitHubDialog open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
}
