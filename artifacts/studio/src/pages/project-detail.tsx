import { useGetProject, useListProjectFiles, useListRuns } from "@workspace/api-client-react";
import { useParams } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FolderGit2, FileText, Activity, Database, GitCommit, FileCode, CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: project, isLoading: isProjectLoading } = useGetProject(id);
  const { data: files, isLoading: isFilesLoading } = useListProjectFiles(id);
  const { data: runs, isLoading: isRunsLoading } = useListRuns({ projectId: id });

  if (isProjectLoading) {
    return <div className="p-8 flex items-center justify-center h-full">Yükleniyor...</div>;
  }

  if (!project) {
    return <div className="p-8 text-center text-muted-foreground">Proje bulunamadı.</div>;
  }

  return (
    <div className="flex flex-col h-full w-full">
      <div className="border-b border-border bg-card p-8 shrink-0">
        <div className="max-w-6xl mx-auto flex items-start justify-between">
          <div className="flex gap-4 items-start">
            <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center mt-1">
              <FolderGit2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-foreground">{project.name}</h1>
                <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>{project.status}</Badge>
              </div>
              <p className="text-muted-foreground text-sm max-w-xl">{project.description}</p>
              {project.stack && (
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">STACK:</span>
                  <Badge variant="outline" className="text-xs bg-background">{project.stack}</Badge>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex gap-6 text-right">
            <div>
              <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Çalıştırmalar</div>
              <div className="text-2xl font-mono text-foreground">{project.totalRuns}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Dosyalar</div>
              <div className="text-2xl font-mono text-foreground">{project.totalFiles}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col bg-background">
        <Tabs defaultValue="runs" className="h-full flex flex-col max-w-6xl mx-auto w-full px-8 pt-6">
          <TabsList className="w-full justify-start border-b border-border rounded-none h-12 bg-transparent p-0">
            <TabsTrigger value="runs" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 h-full font-medium">
              <Activity className="w-4 h-4 mr-2" />
              Çalıştırma Geçmişi
            </TabsTrigger>
            <TabsTrigger value="files" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 h-full font-medium">
              <FileCode className="w-4 h-4 mr-2" />
              Dosyalar
            </TabsTrigger>
            <TabsTrigger value="memory" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 h-full font-medium">
              <Database className="w-4 h-4 mr-2" />
              Hafıza & Context
            </TabsTrigger>
          </TabsList>

          <TabsContent value="runs" className="flex-1 overflow-y-auto py-6 m-0 outline-none">
            <div className="flex flex-col gap-3">
              {isRunsLoading ? (
                <div className="text-sm text-muted-foreground">Çalıştırmalar yükleniyor...</div>
              ) : runs?.length ? (
                runs.map((run) => (
                  <div key={run.id} className="border border-border bg-card rounded-lg p-4 flex items-center justify-between hover:border-primary/50 transition-colors cursor-pointer group">
                    <div className="flex items-center gap-4">
                      {run.status === 'completed' ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      ) : run.status === 'failed' ? (
                        <XCircle className="w-5 h-5 text-destructive" />
                      ) : (
                        <Activity className="w-5 h-5 text-primary animate-pulse" />
                      )}
                      <div>
                        <div className="font-medium text-foreground group-hover:text-primary transition-colors">{run.prompt || "Çalıştırma #" + run.id.split("-")[0]}</div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          <span className="font-mono">{run.id.split('-')[0]}</span>
                          <span>•</span>
                          <span>{new Date(run.createdAt).toLocaleString("tr-TR")}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground uppercase font-semibold">Dosyalar</span>
                        <Badge variant="outline">{run.filesWritten || 0}</Badge>
                      </div>
                      <Badge variant={run.status === 'completed' ? 'default' : run.status === 'failed' ? 'destructive' : 'secondary'}>
                        {run.status}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-muted-foreground bg-card/50 rounded-lg border border-border border-dashed">
                  Henüz çalıştırma bulunmuyor.
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="files" className="flex-1 overflow-y-auto py-6 m-0 outline-none">
             <div className="rounded-md border border-border overflow-hidden bg-card">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr className="text-left text-muted-foreground">
                      <th className="px-4 py-3 font-medium">Dosya Yolu</th>
                      <th className="px-4 py-3 font-medium">Dil</th>
                      <th className="px-4 py-3 font-medium">Boyut</th>
                      <th className="px-4 py-3 font-medium">Versiyon</th>
                      <th className="px-4 py-3 font-medium">Tarih</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {isFilesLoading ? (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Dosyalar yükleniyor...</td></tr>
                    ) : files?.length ? (
                      files.map(file => (
                        <tr key={file.id} className="hover:bg-accent/50 transition-colors cursor-pointer group">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2 text-foreground font-medium group-hover:text-primary">
                              <FileText className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                              {file.path}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className="text-xs bg-background">{file.language}</Badge>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                            {(file.sizeBytes / 1024).toFixed(1)} KB
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-mono">
                              <GitCommit className="w-3 h-3" />
                              v{file.version}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">
                            {new Date(file.createdAt).toLocaleDateString("tr-TR")}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground border-dashed">Projeye ait dosya bulunamadı.</td></tr>
                    )}
                  </tbody>
                </table>
             </div>
          </TabsContent>

          <TabsContent value="memory" className="flex-1 overflow-y-auto py-6 m-0 outline-none">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1 border border-border bg-card p-5 rounded-lg h-fit">
                <h3 className="font-semibold mb-2">Özet</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{project.memory?.summary || "Hafıza özeti bulunmuyor."}</p>
                <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                  <span>Son Güncelleme</span>
                  <span className="font-mono">{project.memory?.lastUpdated ? new Date(project.memory.lastUpdated).toLocaleDateString("tr-TR") : "-"}</span>
                </div>
              </div>
              <div className="md:col-span-2 border border-border bg-card rounded-lg overflow-hidden flex flex-col">
                <div className="p-4 border-b border-border bg-muted/30 font-medium">Bilinen Gerçekler (Facts)</div>
                <div className="p-0">
                  {project.memory?.facts?.length ? (
                    <ul className="divide-y divide-border">
                      {project.memory.facts.map((fact, i) => (
                        <li key={i} className="p-4 hover:bg-accent/30 transition-colors">
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-mono text-xs font-bold text-primary">{fact.key}</span>
                            <span className="text-[10px] text-muted-foreground px-2 py-0.5 rounded bg-muted/50 uppercase tracking-wider">{fact.source}</span>
                          </div>
                          <p className="text-sm text-foreground mt-2">{fact.value}</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="p-8 text-center text-muted-foreground text-sm">Hafızada kayıtlı gerçek bulunmuyor.</div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}