import { useState } from "react";
import { useListWorkspaceFiles, useGetWorkspaceFile } from "@workspace/api-client-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Folder, File, FileText, Code2, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Workspace() {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  
  return (
    <div className="h-full flex overflow-hidden">
      {/* File Tree Sidebar */}
      <div className="w-64 border-r border-border bg-card/50 flex flex-col">
        <div className="h-14 border-b border-border flex items-center px-4 shrink-0 font-mono text-sm text-primary font-bold">
          WORKSPACE_TREE
        </div>
        <ScrollArea className="flex-1 p-2">
          <FileTree onSelect={setSelectedFile} selected={selectedFile} />
        </ScrollArea>
      </div>

      {/* Editor/Viewer Area */}
      <div className="flex-1 bg-black/95 flex flex-col overflow-hidden">
        {selectedFile ? (
          <FileViewer path={selectedFile} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground font-mono">
            <Terminal className="w-12 h-12 mb-4 opacity-20" />
            <p>SELECT_FILE_TO_VIEW</p>
          </div>
        )}
      </div>
    </div>
  );
}

function FileTree({ path = "", onSelect, selected, level = 0 }: { path?: string, onSelect: (path: string) => void, selected: string | null, level?: number }) {
  const { data: files } = useListWorkspaceFiles({ project: "default" }); // In a real app, pass project context
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleDir = (dirPath: string) => {
    setExpanded(prev => ({ ...prev, [dirPath]: !prev[dirPath] }));
  };

  const getIcon = (type: string, name: string) => {
    if (type === 'directory') return <Folder className="w-4 h-4 text-blue-400" />;
    if (name.endsWith('.ts') || name.endsWith('.tsx') || name.endsWith('.js')) return <Code2 className="w-4 h-4 text-yellow-400" />;
    return <FileText className="w-4 h-4 text-gray-400" />;
  };

  // Mock tree render based on flat list (in reality backend returns tree or flat)
  // Assuming flat list with `path`
  const renderTree = (items: any[] | undefined) => {
    if (!items) return null;
    return items.map((file, idx) => (
      <div key={idx} className="font-mono text-sm">
        <div 
          className={cn(
            "flex items-center gap-2 py-1 px-2 hover:bg-white/5 rounded cursor-pointer select-none",
            selected === file.path && "bg-primary/20 text-primary"
          )}
          style={{ paddingLeft: `${(level * 12) + 8}px` }}
          onClick={() => file.type === 'directory' ? toggleDir(file.path) : onSelect(file.path)}
        >
          {getIcon(file.type, file.name)}
          <span className="truncate">{file.name}</span>
        </div>
        {file.type === 'directory' && expanded[file.path] && file.children && (
          <FileTree 
            path={file.path} 
            onSelect={onSelect} 
            selected={selected} 
            level={level + 1} 
          />
        )}
      </div>
    ));
  };

  return <div className="space-y-0.5">{renderTree(files)}</div>;
}

function FileViewer({ path }: { path: string }) {
  const { data: file, isLoading } = useGetWorkspaceFile({ path }, { query: { enabled: !!path }});

  if (isLoading) return <div className="p-6 font-mono text-muted-foreground animate-pulse">READING_FILE...</div>;

  return (
    <>
      <div className="h-10 border-b border-border/50 bg-[#1e1e1e] flex items-center px-4 font-mono text-sm text-gray-400 shrink-0">
        {path}
      </div>
      <ScrollArea className="flex-1 p-4 bg-[#1e1e1e]">
        <pre className="font-mono text-sm text-gray-300">
          <code>{file?.content || "/* Empty file or unreadable content */"}</code>
        </pre>
      </ScrollArea>
    </>
  );
}
