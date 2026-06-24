import { useState, useMemo } from "react";
import {
  useListProjects,
  useListProjectFiles,
  useGetProjectFile,
  useGetProjectGitHub,
  useInitProjectGitHub,
  usePushProjectToGitHub,
  getGetProjectGitHubQueryKey,
  getListProjectFilesQueryKey,
  getGetProjectFileQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Folder, FolderOpen, File, FileCode2, FileText, Terminal,
  Github, GitBranch, Upload, ChevronDown, ChevronRight,
  Copy, Check, ExternalLink, RefreshCw, AlertCircle, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelative } from "@/lib/utils";

type FileNode = {
  name: string;
  path: string;
  type: "file" | "dir";
  language?: string;
  fileId?: string;
  children?: FileNode[];
};

function buildTree(files: Array<{ id: string; path: string; language: string }>): FileNode[] {
  const root: FileNode[] = [];
  const dirs = new Map<string, FileNode>();

  const getOrMakeDir = (dirPath: string): FileNode => {
    if (dirs.has(dirPath)) return dirs.get(dirPath)!;
    const parts = dirPath.split("/");
    const name = parts[parts.length - 1]!;
    const node: FileNode = { name, path: dirPath, type: "dir", children: [] };
    dirs.set(dirPath, node);
    if (parts.length > 1) {
      const parent = getOrMakeDir(parts.slice(0, -1).join("/"));
      parent.children!.push(node);
    } else {
      root.push(node);
    }
    return node;
  };

  for (const f of files) {
    const parts = f.path.split("/");
    const name = parts[parts.length - 1]!;
    const node: FileNode = { name, path: f.path, type: "file", language: f.language, fileId: f.id };
    if (parts.length > 1) {
      const dir = getOrMakeDir(parts.slice(0, -1).join("/"));
      dir.children!.push(node);
    } else {
      root.push(node);
    }
  }

  return root;
}

function getFileIcon(node: FileNode) {
  if (node.type === "dir") return null;
  const lang = node.language ?? "";
  if (["typescript", "javascript"].includes(lang)) return <FileCode2 className="w-4 h-4 text-yellow-400 shrink-0" />;
  if (["python"].includes(lang)) return <FileCode2 className="w-4 h-4 text-blue-400 shrink-0" />;
  if (["markdown"].includes(lang)) return <FileText className="w-4 h-4 text-slate-400 shrink-0" />;
  if (["sql"].includes(lang)) return <FileCode2 className="w-4 h-4 text-green-400 shrink-0" />;
  return <File className="w-4 h-4 text-slate-500 shrink-0" />;
}

function TreeNode({
  node,
  depth,
  selectedFileId,
  onSelect,
}: {
  node: FileNode;
  depth: number;
  selectedFileId: string | null;
  onSelect: (id: string, path: string) => void;
}) {
  const [open, setOpen] = useState(depth === 0);

  if (node.type === "dir") {
    return (
      <div>
        <button
          className="w-full flex items-center gap-1.5 px-2 py-1 hover:bg-white/5 rounded text-left font-mono text-xs text-slate-400 select-none"
          style={{ paddingLeft: `${8 + depth * 16}px` }}
          onClick={() => setOpen(o => !o)}
        >
          {open ? <ChevronDown className="w-3 h-3 shrink-0" /> : <ChevronRight className="w-3 h-3 shrink-0" />}
          {open ? <FolderOpen className="w-4 h-4 text-blue-400 shrink-0" /> : <Folder className="w-4 h-4 text-blue-400 shrink-0" />}
          <span className="truncate">{node.name}</span>
        </button>
        {open && node.children?.map(child => (
          <TreeNode key={child.path} node={child} depth={depth + 1} selectedFileId={selectedFileId} onSelect={onSelect} />
        ))}
      </div>
    );
  }

  return (
    <button
      className={cn(
        "w-full flex items-center gap-1.5 px-2 py-1 hover:bg-white/5 rounded text-left font-mono text-xs select-none",
        selectedFileId === node.fileId ? "bg-primary/20 text-primary" : "text-slate-300",
      )}
      style={{ paddingLeft: `${8 + depth * 16}px` }}
      onClick={() => node.fileId && onSelect(node.fileId, node.path)}
    >
      {getFileIcon(node)}
      <span className="truncate">{node.name}</span>
    </button>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        });
      }}
      className="p-1 hover:text-white text-slate-400 transition-colors"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function GitHubPanel({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const { data: gh, isLoading } = useGetProjectGitHub(projectId);
  const { mutate: initGitHub, isPending: initPending } = useInitProjectGitHub({
    mutation: {
      onSuccess: () => qc.invalidateQueries({ queryKey: getGetProjectGitHubQueryKey(projectId) }),
    },
  });
  const { mutate: pushToGitHub, isPending: pushPending } = usePushProjectToGitHub({
    mutation: {
      onSuccess: () => qc.invalidateQueries({ queryKey: getGetProjectGitHubQueryKey(projectId) }),
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 text-slate-500 text-xs font-mono">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading GitHub status…
      </div>
    );
  }

  return (
    <div className="border-t border-border/50 bg-black/30 px-4 py-3 space-y-3 shrink-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Github className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-mono font-bold text-slate-300">GITHUB</span>
        </div>
        {gh?.connected ? (
          <Badge className="text-[10px] bg-green-500/10 text-green-400 border-green-500/30">CONNECTED</Badge>
        ) : (
          <Badge className="text-[10px] bg-slate-500/10 text-slate-400 border-slate-500/30">NOT LINKED</Badge>
        )}
      </div>

      {gh?.connected ? (
        <div className="space-y-2">
          <div className="flex items-center gap-1 bg-slate-900/60 rounded px-2 py-1">
            <GitBranch className="w-3 h-3 text-slate-500 shrink-0" />
            <code className="text-[11px] text-slate-300 flex-1 truncate">{gh.repo}</code>
            <a href={gh.url ?? "#"} target="_blank" rel="noopener noreferrer" className="hover:text-white text-slate-400">
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {gh.cloneUrl && (
            <div>
              <p className="text-[10px] text-slate-500 font-mono mb-1">CLONE URL</p>
              <div className="flex items-center gap-1 bg-slate-900/60 rounded px-2 py-1">
                <code className="text-[10px] text-slate-400 flex-1 truncate">{gh.cloneUrl}</code>
                <CopyButton text={gh.cloneUrl} />
              </div>
            </div>
          )}

          {gh.pushedAt && (
            <p className="text-[10px] text-slate-500 font-mono">
              Last push: {formatRelative(gh.pushedAt)} &bull; {gh.sha?.slice(0, 7)}
            </p>
          )}

          <Button
            size="sm"
            className="w-full h-7 text-xs font-mono"
            onClick={() => pushToGitHub({ projectId })}
            disabled={pushPending}
          >
            {pushPending ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 mr-1.5" />}
            {pushPending ? "PUSHING…" : "PUSH TO GITHUB"}
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-[11px] text-slate-500 font-mono leading-relaxed">
            Connect a GitHub repo to auto-push files on every run checkpoint.
          </p>
          <Button
            size="sm"
            variant="outline"
            className="w-full h-7 text-xs font-mono"
            onClick={() => initGitHub({ projectId })}
            disabled={initPending}
          >
            {initPending ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Github className="w-3.5 h-3.5 mr-1.5" />}
            {initPending ? "CREATING REPO…" : "CREATE GITHUB REPO"}
          </Button>
        </div>
      )}
    </div>
  );
}

const LANG_COLORS: Record<string, string> = {
  typescript: "text-blue-400",
  javascript: "text-yellow-400",
  python: "text-yellow-300",
  sql: "text-green-400",
  markdown: "text-slate-400",
  json: "text-orange-400",
  go: "text-cyan-400",
  rust: "text-orange-500",
  default: "text-slate-400",
};

export default function Workspace() {
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);

  const { data: projects } = useListProjects();
  const { data: files, isLoading: filesLoading } = useListProjectFiles(selectedProjectId, {
    query: { queryKey: getListProjectFilesQueryKey(selectedProjectId), enabled: !!selectedProjectId },
  });
  const { data: fileContent, isLoading: contentLoading } = useGetProjectFile(
    selectedProjectId,
    selectedFileId ?? "",
    { query: { queryKey: getGetProjectFileQueryKey(selectedProjectId, selectedFileId ?? ""), enabled: !!selectedProjectId && !!selectedFileId } },
  );

  const tree = useMemo(() => {
    if (!files) return [];
    return buildTree(files.map(f => ({ id: f.id, path: f.path, language: f.language })));
  }, [files]);

  const handleSelectFile = (fileId: string, path: string) => {
    setSelectedFileId(fileId);
    setSelectedFilePath(path);
  };

  const currentProject = projects?.find(p => p.id === selectedProjectId);
  const langColor = fileContent
    ? LANG_COLORS[fileContent.language ?? "default"] ?? LANG_COLORS.default
    : LANG_COLORS.default;

  return (
    <div className="h-full flex overflow-hidden">
      {/* Left Sidebar */}
      <div className="w-64 border-r border-border bg-card/50 flex flex-col">
        {/* Project Selector */}
        <div className="h-14 border-b border-border flex items-center px-3 gap-2 shrink-0">
          <FileCode2 className="w-4 h-4 text-primary shrink-0" />
          <select
            className="flex-1 bg-transparent font-mono text-sm text-foreground focus:outline-none cursor-pointer truncate"
            value={selectedProjectId}
            onChange={e => {
              setSelectedProjectId(e.target.value);
              setSelectedFileId(null);
              setSelectedFilePath(null);
            }}
          >
            <option value="">— SELECT PROJECT —</option>
            {projects?.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* File Tree */}
        <ScrollArea className="flex-1 py-2">
          {!selectedProjectId ? (
            <div className="px-4 py-8 text-center text-muted-foreground font-mono text-xs">
              Select a project to browse files
            </div>
          ) : filesLoading ? (
            <div className="px-4 py-4 text-muted-foreground font-mono text-xs flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading files…
            </div>
          ) : !files?.length ? (
            <div className="px-4 py-8 text-center text-muted-foreground font-mono text-xs space-y-1">
              <AlertCircle className="w-6 h-6 mx-auto mb-2 opacity-30" />
              <p>No files yet.</p>
              <p className="opacity-60">Run an agent to generate files.</p>
            </div>
          ) : (
            tree.map(node => (
              <TreeNode
                key={node.path}
                node={node}
                depth={0}
                selectedFileId={selectedFileId}
                onSelect={handleSelectFile}
              />
            ))
          )}
        </ScrollArea>

        {/* GitHub Panel */}
        {selectedProjectId && <GitHubPanel projectId={selectedProjectId} />}
      </div>

      {/* Editor Area */}
      <div className="flex-1 bg-[#0d0d0d] flex flex-col overflow-hidden">
        {selectedFilePath ? (
          <>
            {/* Tab bar */}
            <div className="h-10 border-b border-border/30 bg-[#1a1a1a] flex items-center px-4 gap-3 shrink-0">
              <span className="font-mono text-xs text-slate-400 truncate">{selectedFilePath}</span>
              {fileContent && (
                <Badge className={cn("text-[10px] ml-auto", langColor, "bg-transparent border-current/30")}>
                  {fileContent.language?.toUpperCase()}
                </Badge>
              )}
            </div>

            {/* Content */}
            {contentLoading ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground font-mono text-sm">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Reading file…
              </div>
            ) : (
              <ScrollArea className="flex-1 p-4">
                <pre className="font-mono text-sm text-slate-300 whitespace-pre leading-relaxed">
                  {fileContent?.content ?? ""}
                </pre>
              </ScrollArea>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground font-mono">
            <Terminal className="w-12 h-12 mb-4 opacity-10" />
            {!selectedProjectId ? (
              <>
                <p className="text-sm opacity-50">SELECT A PROJECT</p>
                <p className="text-xs opacity-30 mt-1">Choose a project from the sidebar to browse its files</p>
              </>
            ) : (
              <>
                <p className="text-sm opacity-50">SELECT A FILE</p>
                <p className="text-xs opacity-30 mt-1">Click a file in the tree to view its contents</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
