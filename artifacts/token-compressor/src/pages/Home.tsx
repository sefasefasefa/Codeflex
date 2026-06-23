import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Copy, RotateCcw, Zap, RefreshCw, Square } from "lucide-react";
import { compress, countTokens, ContentType, AggressionLevel, CompressResult } from "@/lib/compressor";

interface HistoryEntry {
  cacheId: string;
  contentType: ContentType;
  originalTokens: number;
  compressedTokens: number;
  savings: number;
  iterations?: number;
}

interface IterationLog {
  pass: number;
  tokens: number;
  savings: number;
}

export default function Home() {
  const [inputText, setInputText] = useState("");
  const [contentType, setContentType] = useState<ContentType>("generic");
  const [aggression, setAggression] = useState<AggressionLevel>("medium");
  const [compressResult, setCompressResult] = useState<CompressResult | null>(null);
  const [cacheMap] = useState<Map<string, string>>(new Map());
  const [cacheHistory, setCacheHistory] = useState<HistoryEntry[]>([]);

  const [isAutoRunning, setIsAutoRunning] = useState(false);
  const [iterationLogs, setIterationLogs] = useState<IterationLog[]>([]);
  const [currentPass, setCurrentPass] = useState(0);
  const stopRef = useRef(false);

  const originalTokenCount = countTokens(inputText);

  const getSavingsColor = (savings: number) => {
    if (savings < 30) return "text-muted-foreground";
    if (savings < 60) return "text-yellow-500";
    return "text-green-500";
  };

  const handleCompress = () => {
    if (!inputText.trim()) return;
    const result = compress(inputText, contentType, aggression, cacheMap);
    setCompressResult(result);
    setIterationLogs([]);
    setCacheHistory(prev => [{
      cacheId: result.cacheId,
      contentType,
      originalTokens: result.originalTokens,
      compressedTokens: result.compressedTokens,
      savings: result.savings,
    }, ...prev]);
  };

  const handleAutoCompress = async () => {
    if (!inputText.trim()) return;
    setIsAutoRunning(true);
    stopRef.current = false;
    setIterationLogs([]);
    setCurrentPass(0);

    const firstCacheId = Math.random().toString(36).slice(2, 9);
    cacheMap.set(firstCacheId, inputText);
    const firstTokens = countTokens(inputText);

    let current = inputText;
    let pass = 0;
    let lastResult: CompressResult | null = null;
    const logs: IterationLog[] = [];

    const MIN_GAIN = 0.5;
    const MAX_PASSES = 20;

    while (pass < MAX_PASSES && !stopRef.current) {
      pass++;
      setCurrentPass(pass);

      const result = compress(current, contentType, "aggressive", cacheMap);

      const roundSavings = result.savings;
      logs.push({ pass, tokens: result.compressedTokens, savings: roundSavings });
      setIterationLogs([...logs]);
      lastResult = result;

      if (roundSavings < MIN_GAIN || result.compressedTokens >= countTokens(current)) {
        break;
      }

      current = result.compressed;

      await new Promise(r => setTimeout(r, 80));
    }

    if (lastResult) {
      const totalSavings = Math.round((1 - lastResult.compressedTokens / firstTokens) * 100);
      const final: CompressResult = {
        ...lastResult,
        originalTokens: firstTokens,
        savings: totalSavings,
      };
      setCompressResult(final);
      setCacheHistory(prev => [{
        cacheId: firstCacheId,
        contentType,
        originalTokens: firstTokens,
        compressedTokens: lastResult!.compressedTokens,
        savings: totalSavings,
        iterations: pass,
      }, ...prev]);
    }

    setIsAutoRunning(false);
  };

  const handleStop = () => {
    stopRef.current = true;
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
        strategies: ["Orijinalden geri yüklendi"],
      });
      setIterationLogs([]);
    }
  };

  const copyToClipboard = () => {
    if (compressResult?.compressed) navigator.clipboard.writeText(compressResult.compressed);
  };

  const loadSampleAPI = () => {
    setInputText(`{
  "status": "success",
  "request_id": "req_abc123xyz",
  "data": {
    "items": [
      {
        "id": 1,
        "name": "Product Alpha",
        "description": "A very long description that repeats itself. A very long description that repeats itself.",
        "metadata": { "created_at": "2024-01-01T00:00:00Z", "updated_at": "2024-01-01T00:00:00Z", "version": 1 }
      },
      {
        "id": 2,
        "name": "Product Beta",
        "description": "A very long description that repeats itself. A very long description that repeats itself.",
        "metadata": { "created_at": "2024-01-02T00:00:00Z", "updated_at": "2024-01-02T00:00:00Z", "version": 1 }
      },
      {
        "id": 3,
        "name": "Product Gamma",
        "description": "A very long description that repeats itself. A very long description that repeats itself.",
        "metadata": { "created_at": "2024-01-03T00:00:00Z", "updated_at": "2024-01-03T00:00:00Z", "version": 1 }
      }
    ],
    "metadata": {
      "total": 3,
      "page": 1,
      "per_page": 10,
      "hasMore": false,
      "generated_at": "2024-03-10T12:00:00.000Z"
    }
  }
}`);
    setContentType("tool_output");
  };

  const loadSampleLogs = () => {
    setInputText(`2024-03-10T12:00:00.123Z [INFO] Server started on port 8080
2024-03-10T12:00:01.000Z [DEBUG] Connection established from 192.168.1.1
2024-03-10T12:00:01.001Z [DEBUG] Connection established from 192.168.1.1
2024-03-10T12:00:01.002Z [DEBUG] Connection established from 192.168.1.1
2024-03-10T12:00:01.003Z [DEBUG] Connection established from 192.168.1.1
2024-03-10T12:00:01.004Z [DEBUG] Connection established from 192.168.1.1
2024-03-10T12:00:01.005Z [DEBUG] Connection established from 192.168.1.1
2024-03-10T12:00:02.000Z [DEBUG] Heartbeat check OK
2024-03-10T12:00:02.001Z [DEBUG] Heartbeat check OK
2024-03-10T12:00:02.002Z [DEBUG] Heartbeat check OK
2024-03-10T12:00:02.003Z [DEBUG] Heartbeat check OK
2024-03-10T12:00:02.004Z [DEBUG] Heartbeat check OK
2024-03-10T12:00:03.000Z [INFO] Request received: GET /api/health
2024-03-10T12:00:03.001Z [INFO] Request received: GET /api/health
2024-03-10T12:00:03.002Z [INFO] Request received: GET /api/health
2024-03-10T12:00:04.000Z [ERROR] Failed to connect to database: timeout after 30000ms
2024-03-10T12:00:04.001Z [ERROR] Failed to connect to database: timeout after 30000ms
2024-03-10T12:00:04.002Z [ERROR] Failed to connect to database: timeout after 30000ms`);
    setContentType("log");
  };

  const loadSampleRAG = () => {
    setInputText(`## Introduction to Token Compression

**Token compression** is an essential technique for optimizing LLM context windows. When context windows fill up, models lose earlier information, leading to degraded performance.

### Key Benefits

By stripping out redundant whitespace, repetitive patterns, and unnecessary boilerplate, we can save up to 90% of tokens.

- **Cost reduction**: Fewer tokens means lower API costs
- **Speed improvement**: Smaller contexts process faster
- **Memory efficiency**: More useful content fits in the window

### How It Works

The compression engine applies multiple strategies in sequence:

1. Whitespace normalization — removes trailing spaces and collapses blank lines
2. JSON minification — removes pretty-printing from structured data
3. Log deduplication — collapses repeated log lines
4. Pattern compression — replaces repeated strings with references

\`\`\`javascript
// Before compression
const result = await compress(text, "rag_chunk", "aggressive", cache);
console.log("Saved tokens:", result.savings + "%");
\`\`\`

### Conclusion

**Token compression** is an essential technique. By applying these strategies iteratively, maximum compression is achieved.`);
    setContentType("rag_chunk");
  };

  const totalAutoSavings = iterationLogs.length > 0
    ? Math.round((1 - iterationLogs[iterationLogs.length - 1].tokens / countTokens(inputText)) * 100)
    : 0;

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
          <div className="flex gap-2 text-xs flex-wrap">
            <Button variant="secondary" size="sm" onClick={loadSampleAPI} data-testid="button-sample-api">Sample: API Response</Button>
            <Button variant="secondary" size="sm" onClick={loadSampleLogs} data-testid="button-sample-logs">Sample: Server Logs</Button>
            <Button variant="secondary" size="sm" onClick={loadSampleRAG} data-testid="button-sample-rag">Sample: RAG Chunk</Button>
          </div>

          <div className="flex-1 flex flex-col gap-2">
            <Textarea
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder="Paste raw context here..."
              className="flex-1 min-h-[300px] resize-none font-mono text-sm bg-background border-border focus-visible:ring-primary"
              data-testid="textarea-input"
            />
            <div className="text-xs text-muted-foreground text-right font-mono">
              Tokens: <span className="text-foreground">{originalTokenCount}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Content Type</Label>
              <Select value={contentType} onValueChange={(v: ContentType) => setContentType(v)}>
                <SelectTrigger className="font-mono text-sm bg-background" data-testid="select-content-type">
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

          <div className="flex gap-2">
            <Button
              onClick={handleCompress}
              disabled={isAutoRunning || !inputText.trim()}
              className="flex-1 bg-primary/20 border border-primary/40 text-primary hover:bg-primary/30 font-bold uppercase tracking-wider h-12"
              data-testid="button-compress-once"
            >
              Tek Sıkıştır <ArrowRight className="ml-2 h-4 w-4" />
            </Button>

            {isAutoRunning ? (
              <Button
                onClick={handleStop}
                className="flex-1 bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30 font-bold uppercase tracking-wider h-12"
                data-testid="button-stop-auto"
              >
                <Square className="mr-2 h-4 w-4 fill-current" /> Durdur
              </Button>
            ) : (
              <Button
                onClick={handleAutoCompress}
                disabled={!inputText.trim()}
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 font-bold uppercase tracking-wider h-12"
                data-testid="button-auto-compress"
              >
                <RefreshCw className="mr-2 h-4 w-4" /> Oto-Sıkıştır
              </Button>
            )}
          </div>

          {isAutoRunning && (
            <div className="text-xs text-muted-foreground font-mono flex items-center gap-2">
              <RefreshCw className="h-3 w-3 animate-spin text-primary" />
              <span>Tur {currentPass} işleniyor...</span>
              {totalAutoSavings > 0 && (
                <span className={`font-bold ${getSavingsColor(totalAutoSavings)}`}>
                  toplam -{totalAutoSavings}%
                </span>
              )}
            </div>
          )}
        </div>

        {/* RIGHT PANEL */}
        <div className="flex flex-col gap-4 border border-border bg-card p-4 rounded-lg shadow-sm relative overflow-hidden">
          {iterationLogs.length > 0 && (
            <div className="border border-border rounded-lg bg-background p-2 space-y-1">
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Tur bazlı ilerleme</div>
              {iterationLogs.map((log, i) => {
                const barWidth = Math.max(4, 100 - log.savings);
                return (
                  <div key={i} className="flex items-center gap-2 text-xs font-mono">
                    <span className="text-muted-foreground w-10">Tur {log.pass}</span>
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-300"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                    <span className="w-16 text-right text-foreground">{log.tokens} tok</span>
                    <span className={`w-14 text-right ${getSavingsColor(log.savings)}`}>
                      -{log.savings.toFixed(1)}%
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {compressResult ? (
            <>
              <div className="flex justify-between items-center bg-background p-3 rounded border border-border">
                <div className="text-sm font-mono flex items-center gap-2 flex-wrap">
                  <span className="text-muted-foreground">Orjinal:</span>
                  <span>{compressResult.originalTokens}</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <span className="text-primary font-bold">{compressResult.compressedTokens}</span>
                </div>
                <div className="text-sm font-mono">
                  <span className="text-muted-foreground">Tasarruf:</span>{" "}
                  <span className={`font-bold ${getSavingsColor(compressResult.savings)}`}>
                    {compressResult.savings.toFixed(1)}%
                  </span>
                  {iterationLogs.length > 0 && (
                    <span className="text-muted-foreground ml-2 text-xs">({iterationLogs.length} tur)</span>
                  )}
                </div>
              </div>

              <div className="flex-1 flex flex-col gap-2 relative">
                <Textarea
                  value={compressResult.compressed}
                  readOnly
                  className="flex-1 min-h-[280px] resize-none font-mono text-sm bg-background border-border focus-visible:ring-0"
                  data-testid="textarea-output"
                />
                <div className="absolute top-2 right-2 flex gap-2">
                  <Button size="icon" variant="secondary" onClick={copyToClipboard} title="Kopyala" data-testid="button-copy-output">
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="secondary" onClick={() => handleRestore(compressResult.cacheId)} title="Orijinali geri yükle" data-testid="button-restore">
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
              {isAutoRunning ? (
                <div className="text-center space-y-2">
                  <RefreshCw className="h-8 w-8 text-primary animate-spin mx-auto" />
                  <p className="text-muted-foreground text-sm font-mono">Tur {currentPass} sıkıştırılıyor...</p>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm font-mono flex items-center gap-2">
                  Sol tarafa içerik yapıştır ve Oto-Sıkıştır'a bas <ArrowRight className="h-4 w-4" />
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {cacheHistory.length > 0 && (
        <div className="mt-6 border border-border bg-card rounded-lg overflow-hidden">
          <div className="p-3 border-b border-border bg-background">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Sıkıştırma Geçmişi</h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="font-mono text-xs">ID</TableHead>
                <TableHead className="font-mono text-xs">Tip</TableHead>
                <TableHead className="font-mono text-xs text-right">Turlar</TableHead>
                <TableHead className="font-mono text-xs text-right">Orjinal</TableHead>
                <TableHead className="font-mono text-xs text-right">Sıkıştırılmış</TableHead>
                <TableHead className="font-mono text-xs text-right">Tasarruf</TableHead>
                <TableHead className="font-mono text-xs text-right">Geri Al</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cacheHistory.map(entry => (
                <TableRow key={entry.cacheId} className="border-border border-b hover:bg-background/50" data-testid={`row-history-${entry.cacheId}`}>
                  <TableCell className="font-mono text-xs text-muted-foreground">{entry.cacheId}</TableCell>
                  <TableCell className="font-mono text-xs">{entry.contentType}</TableCell>
                  <TableCell className="font-mono text-xs text-right text-muted-foreground">
                    {entry.iterations ? `${entry.iterations}x` : "1x"}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-right">{entry.originalTokens}</TableCell>
                  <TableCell className="font-mono text-xs text-right text-primary">{entry.compressedTokens}</TableCell>
                  <TableCell className={`font-mono text-xs text-right ${getSavingsColor(entry.savings)}`}>
                    {entry.savings.toFixed(1)}%
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="h-8 text-xs font-mono" onClick={() => handleRestore(entry.cacheId)} data-testid={`button-restore-${entry.cacheId}`}>
                      Geri Yükle
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
