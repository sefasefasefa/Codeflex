export type ContentType = "tool_output" | "log" | "rag_chunk" | "file" | "generic";
export type AggressionLevel = "light" | "medium" | "aggressive";

export interface CompressResult {
  compressed: string;
  originalTokens: number;
  compressedTokens: number;
  savings: number;
  cacheId: string;
  strategies: string[];
}

export function countTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

export function compress(
  text: string,
  contentType: ContentType,
  aggression: AggressionLevel,
  cache: Map<string, string>
): CompressResult {
  let result = text;
  const strategies: string[] = [];

  // Strategy 1: Whitespace normalization
  result = result.replace(/\r\n/g, '\n');
  result = result.replace(/[ \t]+$/gm, '');
  result = result.replace(/\n{3,}/g, '\n\n');
  strategies.push("Whitespace normalization");

  // Strategy 2: JSON minification
  if ((aggression === "medium" || aggression === "aggressive") && ["tool_output", "rag_chunk", "generic"].includes(contentType)) {
    try {
      const maybeJson = result.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (maybeJson && maybeJson[0]) {
        const parsed = JSON.parse(maybeJson[0]);
        const minified = JSON.stringify(parsed);
        result = result.replace(maybeJson[0], minified);
        strategies.push("JSON minification");
      }
    } catch (e) {
      // ignore
    }
  }

  // Strategy 3: Log deduplication
  if (contentType === "log" || aggression === "aggressive") {
    const lines = result.split('\n');
    const newLines = [];
    let currentLine = lines[0];
    let count = 1;

    for (let i = 1; i <= lines.length; i++) {
      if (lines[i] === currentLine && currentLine?.trim() !== '') {
        count++;
      } else {
        if (count >= 3) {
          newLines.push(`[x${count}] ${currentLine}`);
        } else {
          for (let j = 0; j < count; j++) {
            if (currentLine !== undefined) newLines.push(currentLine);
          }
        }
        currentLine = lines[i];
        count = 1;
      }
    }
    
    const newResult = newLines.join('\n');
    if (newResult !== result) {
      result = newResult;
      strategies.push("Log deduplication");
    }
  }

  // Strategy 4: Repeated pattern compression (simplified heuristic)
  if (aggression === "medium" || aggression === "aggressive") {
    // This is a complex string algorithm, using a very simple regex heuristic for demonstration
    // Find consecutive identical long words/phrases or use a simple chunking
    const chunks = result.match(/.{30,100}/g) || [];
    const counts = new Map<string, number>();
    for (const chunk of chunks) {
        counts.set(chunk, (counts.get(chunk) || 0) + 1);
    }
    
    let refId = 1;
    let refHeader = "";
    let replaced = false;
    for (const [chunk, count] of counts.entries()) {
        if (count >= 3 && chunk.trim().length >= 30) {
            const refLabel = `[REF_${refId}]`;
            refHeader += `${refLabel}: ${chunk}\n`;
            result = result.split(chunk).join(refLabel);
            refId++;
            replaced = true;
        }
    }
    
    if (replaced) {
        result = refHeader + "\n" + result;
        strategies.push("Repeated pattern compression");
    }
  }

  // Strategy 5: Strip markdown formatting
  if (aggression === "aggressive") {
    let newResult = result.replace(/^#+\s+/gm, '> ');
    newResult = newResult.replace(/\*\*(.*?)\*\*/g, '$1');
    newResult = newResult.replace(/```[a-z]*\n([\s\S]*?)\n```/g, '$1');
    if (newResult !== result) {
      result = newResult;
      strategies.push("Markdown stripping");
    }
  }

  // Strategy 6: Remove log boilerplate
  if (contentType === "log" || aggression === "aggressive") {
    let newResult = result.replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z?\s*/g, '');
    newResult = newResult.replace(/\[?(DEBUG|TRACE|INFO|WARN|ERROR)\]?\s*/g, '');
    if (newResult !== result) {
      result = newResult;
      strategies.push("Log boilerplate removal");
    }
  }

  const cacheId = generateId();
  cache.set(cacheId, text);

  const originalTokens = countTokens(text);
  const compressedTokens = countTokens(result);
  const savings = originalTokens > 0 ? ((originalTokens - compressedTokens) / originalTokens) * 100 : 0;

  return {
    compressed: result,
    originalTokens,
    compressedTokens,
    savings,
    cacheId,
    strategies
  };
}
