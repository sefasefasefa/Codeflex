import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Copy, RotateCcw, Zap } from "lucide-react";
import { compress, countTokens, ContentType, AggressionLevel, CompressResult } from "@/lib/compressor";

interface HistoryEntry {
  cacheId: string;
  contentType: ContentType;
  originalTokens: number;
  compressedTokens: number;
  savings: number;
}

export default function Home() {
  const [inputText, setInputText] = useState("");
  const [contentType, setContentType] = useState<ContentType>("generic");
  const [aggression, setAggression] = useState<AggressionLevel>("medium");
  const [compressResult, setCompressResult] = useState<CompressResult | null>(null);
  
  // To avoid re-renders with massive maps, we use state for history list but a ref or state for map
  const [cacheMap] = useState<Map<string, string>>(new Map());
  const [cacheHistory, setCacheHistory] = useState<HistoryEntry[]>([]);

  const originalTokenCount = countTokens(inputText);

  const handleCompress = () => {
    if (!inputText.trim()) return;
    const result = compress(inputText, contentType, aggression, cacheMap);
    setCompressResult(result);
    setCacheHistory(prev => [{
      cacheId: result.cacheId,
      contentType,
      originalTokens: result.originalTokens,
      compressedTokens: result.compressedTokens,
      savings: result.savings
    }, ...prev]);
  };

  const handleRestore = (id: string) => {
    const original = cacheMap.get(id);
    if (original) {
      setCompressResult({
        compressed: original,
        originalTokens: countTokens(original),
        compressedTokens: countTokens(original),
        savings: 0,
        cacheId: id,
        strategies: ["Restored from cache"]
      });
    }
  };

  const copyToClipboard = () => {
    if (compressResult?.compressed) {
      navigator.clipboard.writeText(compressResult.compressed);
    }
  };

  const loadSampleAPI = () => {
    setInputText(`{\n  "status": "success",\n  "data": {\n    "items": [\n      {"id": 1, "name": "test1", "description": "A very long description that goes on and on."},\n      {"id": 2, "name": "test2", "description": "Another very long description that goes on and on."}\n    ],\n    "metadata": {\n      "total": 2,\n      "page": 1,\n      "hasMore": false\n    }\n  }\n}`);
    setContentType("tool_output");
  };

  const loadSampleLogs = () => {
    setInputText(`2024-03-10T12:00:00Z [INFO] Server started on port 8080\n2024-03-10T12:00:01Z [DEBUG] Connection established from 192.168.1.1\n2024-03-10T12:00:01Z [DEBUG] Connection established from 192.168.1.1\n2024-03-10T12:00:01Z [DEBUG] Connection established from 192.168.1.1\n2024-03-10T12:00:01Z [DEBUG] Connection established from 192.168.1.1\n2024-03-10T12:00:01Z [DEBUG] Connection established from 192.168.1.1\n2024-03-10T12:00:02Z [ERROR] Failed to connect to database`);
    setContentType("log");
  };

  const loadSampleRAG = () => {
    setInputText(`## Introduction\n\n**Token compression** is an essential technique for optimizing LLM context windows.\n\n### Benefits\n\nIt reduces cost and latency. By stripping out redundant whitespace, repetitive patterns, and unnecessary boilerplate, we can save up to 90% of tokens.\n\n\`\`\`javascript\nconsole.log("Reduced tokens");\n\`\`\``);
    setContentType("rag_chunk");
  };

  const getSavingsColor = (savings: number) => {
    if (savings < 30) return "text-muted-foreground";
    if (savings < 60) return "text-yellow-500";
    return "text-green-500";
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col p-6 font-mono">
      <header className="mb-6 flex items-center justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
            <Zap className="h-6 w-6" />
            TOKEN_COMPRESSOR
          </h1>
          <p className="text-sm text-muted-foreground mt-1 tracking-tight">Precision context optimization engine</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
        {/* LEFT PANEL */}
        <div className="flex flex-col gap-4 border border-border bg-card p-4 rounded-lg shadow-sm">
          <div className="flex gap-2 text-xs">
            <Button variant="secondary" size="sm" onClick={loadSampleAPI}>Sample: API Response</Button>
            <Button variant="secondary" size="sm" onClick={loadSampleLogs}>Sample: Server Logs</Button>
            <Button variant="secondary" size="sm" onClick={loadSampleRAG}>Sample: RAG Chunk</Button>
          </div>

          <div className="flex-1 flex flex-col gap-2">
            <Textarea 
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder="Paste raw context here..."
              className="flex-1 min-h-[300px] resize-none font-mono text-sm bg-background border-border focus-visible:ring-primary"
            />
            <div className="text-xs text-muted-foreground text-right font-mono">
              Tokens: <span className="text-foreground">{originalTokenCount}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Content Type</Label>
              <Select value={contentType} onValueChange={(v: ContentType) => setContentType(v)}>
                <SelectTrigger className="font-mono text-sm bg-background">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="generic">Generic</SelectItem>
                  <SelectItem value="tool_output">Tool Output / JSON</SelectItem>
                  <SelectItem value="log">Server Logs</SelectItem>
                  <SelectItem value="rag_chunk">RAG Chunk / Markdown</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Aggression Level</Label>
              <RadioGroup value={aggression} onValueChange={(v: AggressionLevel) => setAggression(v)} className="flex items-center gap-4 h-10">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="light" id="light" />
                  <Label htmlFor="light" className="text-sm font-mono cursor-pointer">Light</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="medium" id="medium" />
                  <Label htmlFor="medium" className="text-sm font-mono cursor-pointer">Medium</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="aggressive" id="aggressive" />
                  <Label htmlFor="aggressive" className="text-sm font-mono cursor-pointer">Max</Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          <Button 
            onClick={handleCompress} 
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold uppercase tracking-wider h-12"
          >
            Compress Context <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        {/* RIGHT PANEL */}
        <div className="flex flex-col gap-4 border border-border bg-card p-4 rounded-lg shadow-sm relative overflow-hidden">
          {compressResult ? (
            <>
              <div className="flex justify-between items-center bg-background p-3 rounded border border-border">
                <div className="text-sm font-mono">
                  <span className="text-muted-foreground">Original:</span> {compressResult.originalTokens}
                  <span className="text-muted-foreground mx-2">→</span> 
                  <span className="text-muted-foreground">Compressed:</span> <span className="text-primary font-bold">{compressResult.compressedTokens}</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-sm font-mono">
                    <span className="text-muted-foreground">Saved:</span> <span className={`font-bold ${getSavingsColor(compressResult.savings)}`}>{compressResult.savings.toFixed(1)}%</span>
                  </div>
                </div>
              </div>

              <div className="flex-1 flex flex-col gap-2 relative">
                <Textarea 
                  value={compressResult.compressed}
                  readOnly
                  className="flex-1 min-h-[300px] resize-none font-mono text-sm bg-background border-border focus-visible:ring-0"
                />
                <div className="absolute top-2 right-2 flex gap-2">
                  <Button size="icon" variant="secondary" onClick={copyToClipboard} title="Copy">
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="secondary" onClick={() => handleRestore(compressResult.cacheId)} title="Restore Original">
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {compressResult.strategies.map((s, i) => (
                    <Badge key={i} variant="outline" className="text-xs font-normal border-primary/30 text-primary/80">{s}</Badge>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center border-2 border-dashed border-border rounded-lg bg-background/50">
              <p className="text-muted-foreground text-sm font-mono flex items-center gap-2">
                Paste content on the left and press Compress <ArrowRight className="h-4 w-4" />
              </p>
            </div>
          )}
        </div>
      </div>

      {cacheHistory.length > 0 && (
        <div className="mt-6 border border-border bg-card rounded-lg overflow-hidden">
          <div className="p-3 border-b border-border bg-background">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Compression History</h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="font-mono text-xs">ID</TableHead>
                <TableHead className="font-mono text-xs">Type</TableHead>
                <TableHead className="font-mono text-xs text-right">Original</TableHead>
                <TableHead className="font-mono text-xs text-right">Compressed</TableHead>
                <TableHead className="font-mono text-xs text-right">Savings</TableHead>
                <TableHead className="font-mono text-xs text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cacheHistory.map(entry => (
                <TableRow key={entry.cacheId} className="border-border border-b hover:bg-background/50">
                  <TableCell className="font-mono text-xs text-muted-foreground">{entry.cacheId}</TableCell>
                  <TableCell className="font-mono text-xs">{entry.contentType}</TableCell>
                  <TableCell className="font-mono text-xs text-right">{entry.originalTokens}</TableCell>
                  <TableCell className="font-mono text-xs text-right text-primary">{entry.compressedTokens}</TableCell>
                  <TableCell className={`font-mono text-xs text-right ${getSavingsColor(entry.savings)}`}>
                    {entry.savings.toFixed(1)}%
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="h-8 text-xs font-mono" onClick={() => handleRestore(entry.cacheId)}>
                      Restore
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
