import { useListProjects } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Plus, FolderGit2, Activity, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function Projects() {
  const { data: projects, isLoading } = useListProjects();

  if (isLoading) {
    return <div className="p-8 flex items-center justify-center h-full">Yükleniyor...</div>;
  }

  return (
    <div className="p-8 max-w-6xl mx-auto w-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Projeler</h1>
          <p className="text-muted-foreground text-sm mt-1">Sistemdeki tüm çalışma alanları ve projeler.</p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Yeni Proje
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
          <Button variant="outline">İlk Projeyi Oluştur</Button>
        </div>
      )}
    </div>
  );
}