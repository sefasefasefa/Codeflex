import { useState } from "react";
import { FolderOpen, File, ChevronRight, Terminal, Save, Trash2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

// MOCK data until we implement the actual hooks
const MOCK_FILES = [
  { name: "src", type: "directory", children: [
    { name: "App.tsx", type: "file", size: 1024 },
    { name: "index.css", type: "file", size: 512 },
  ]},
  { name: "package.json", type: "file", size: 856 },
  { name: "README.md", type: "file", size: 1200 },
];

export default function Files() {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const renderTree = (items: any[], path = "") => {
    return items.map((item) => {
      const currentPath = `${path}/${item.name}`;
      if (item.type === "directory") {
        return (
          <div key={currentPath}>
            <div className="flex items-center gap-2 p-1.5 px-3 hover:bg-accent cursor-pointer text-sm text-muted-foreground group">
              <ChevronRight className="w-3 h-3 group-hover:text-foreground transition-colors" />
              <FolderOpen className="w-4 h-4 text-primary/70" />
              <span className="group-hover:text-foreground transition-colors">{item.name}</span>
            </div>
            <div className="ml-4 border-l border-border/50 pl-1">
              {renderTree(item.children, currentPath)}
            </div>
          </div>
        );
      }
      return (
        <div 
          key={currentPath} 
          className={`flex items-center gap-2 p-1.5 px-3 hover:bg-accent cursor-pointer text-sm group ${selectedFile === currentPath ? "bg-accent text-foreground" : "text-muted-foreground"}`}
          onClick={() => setSelectedFile(currentPath)}
        >
          <File className="w-4 h-4" />
          <span className="group-hover:text-foreground transition-colors">{item.name}</span>
        </div>
      );
    });
  };

  return (
    <div className="flex h-full w-full bg-background">
      {/* File Tree */}
      <div className="w-64 border-r border-border bg-card flex flex-col flex-shrink-0">
        <div className="h-14 border-b border-border flex items-center px-4 shrink-0 font-medium text-sm">
          <Terminal className="w-4 h-4 mr-2 text-primary" />
          Workspace Dosyaları
        </div>
        <div className="p-2 overflow-y-auto flex-1">
          {renderTree(MOCK_FILES)}
        </div>
      </div>

      {/* File Content Viewer */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedFile ? (
          <>
            <div className="h-14 border-b border-border bg-card/50 flex items-center justify-between px-4 shrink-0">
              <div className="flex items-center text-sm font-mono text-muted-foreground">
                {selectedFile.split('/').map((part, i, arr) => (
                  <span key={i} className="flex items-center">
                    {i > 0 && <ChevronRight className="w-3 h-3 mx-1" />}
                    <span className={i === arr.length - 1 ? "text-foreground font-semibold" : ""}>{part}</span>
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-8 gap-2">
                  <Download className="w-3.5 h-3.5" />
                  İndir
                </Button>
                <Button size="sm" className="h-8 gap-2">
                  <Save className="w-3.5 h-3.5" />
                  Kaydet
                </Button>
              </div>
            </div>
            <div className="flex-1 bg-background p-4 overflow-auto">
              <pre className="font-mono text-sm leading-relaxed text-muted-foreground">
                <code>
{`// Mock content for ${selectedFile}
import React from 'react';

export default function Component() {
  return (
    <div className="p-4">
      <h1>Hello World</h1>
    </div>
  );
}`}
                </code>
              </pre>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground flex-col gap-4">
            <File className="w-16 h-16 opacity-20" />
            <p>Görüntülemek için bir dosya seçin.</p>
          </div>
        )}
      </div>
    </div>
  );
}