import { countTokens, generateId } from "./compressor";

export interface MemoryFact {
  id: string;
  key: string;
  value: string;
  createdAt: string;
}

export interface Checkpoint {
  id: string;
  label: string;
  summary: string;
  memorySnapshot: MemoryFact[];
  progressSnapshot: Task[];
  tokenCount: number;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  status: "todo" | "in_progress" | "done";
  notes: string;
  createdAt: string;
}

export interface ContextPackage {
  tokens: number;
  markdown: string;
}

export function exportMemoryMd(facts: MemoryFact[]): string {
  if (facts.length === 0) return "# MEMORY\n\n_No facts stored._\n";
  const lines = facts.map(f => `- **${f.key}**: ${f.value}`);
  return `# MEMORY\n\n${lines.join("\n")}\n`;
}

export function exportCheckpointMd(cp: Checkpoint): string {
  const date = new Date(cp.createdAt).toISOString().slice(0, 19).replace("T", " ");
  const memLines = cp.memorySnapshot.map(f => `- **${f.key}**: ${f.value}`).join("\n") || "_empty_";
  const taskLines = cp.progressSnapshot.map(t => {
    const icon = t.status === "done" ? "[x]" : t.status === "in_progress" ? "[~]" : "[ ]";
    return `${icon} ${t.title}${t.notes ? " — " + t.notes : ""}`;
  }).join("\n") || "_empty_";

  return `# CHECKPOINT — ${cp.label}
_Created: ${date}_

## Summary
${cp.summary}

## Memory at checkpoint
${memLines}

## Progress at checkpoint
${taskLines}
`;
}

export function exportProgressMd(tasks: Task[]): string {
  if (tasks.length === 0) return "# PROGRESS\n\n_No tasks._\n";
  const done = tasks.filter(t => t.status === "done");
  const inProgress = tasks.filter(t => t.status === "in_progress");
  const todo = tasks.filter(t => t.status === "todo");

  const fmt = (t: Task) =>
    `- ${t.status === "done" ? "[x]" : t.status === "in_progress" ? "[~]" : "[ ]"} **${t.title}**${t.notes ? ": " + t.notes : ""}`;

  const sections: string[] = [];
  if (inProgress.length) sections.push(`### In Progress\n${inProgress.map(fmt).join("\n")}`);
  if (todo.length) sections.push(`### Todo\n${todo.map(fmt).join("\n")}`);
  if (done.length) sections.push(`### Done\n${done.map(fmt).join("\n")}`);

  return `# PROGRESS\n\n${sections.join("\n\n")}\n`;
}

export function buildContextPackage(
  latestCheckpoint: Checkpoint | null,
  facts: MemoryFact[],
  tasks: Task[],
  lastMessages: string,
  contextLimitTokens: number
): ContextPackage {
  const memMd = exportMemoryMd(facts);
  const progressMd = exportProgressMd(tasks);
  const checkpointMd = latestCheckpoint ? exportCheckpointMd(latestCheckpoint) : "";
  const msgSection = lastMessages.trim()
    ? `# LAST MESSAGES\n\n${lastMessages.trim()}\n`
    : "";

  const markdown = [
    "# CONTEXT RECONSTRUCTION PACKAGE",
    `_Generated: ${new Date().toISOString().slice(0, 19).replace("T", " ")}_`,
    "",
    checkpointMd,
    memMd,
    progressMd,
    msgSection,
  ]
    .filter(Boolean)
    .join("\n");

  const tokens = countTokens(markdown);
  return { tokens, markdown };
}

export function createFact(key: string, value: string): MemoryFact {
  return { id: generateId(), key: key.trim(), value: value.trim(), createdAt: new Date().toISOString() };
}

export function createTask(title: string): Task {
  return { id: generateId(), title: title.trim(), status: "todo", notes: "", createdAt: new Date().toISOString() };
}

export function createCheckpoint(
  label: string,
  summary: string,
  facts: MemoryFact[],
  tasks: Task[]
): Checkpoint {
  const md = exportMemoryMd(facts) + "\n" + exportProgressMd(tasks) + "\n" + summary;
  return {
    id: generateId(),
    label: label.trim(),
    summary: summary.trim(),
    memorySnapshot: [...facts],
    progressSnapshot: [...tasks],
    tokenCount: countTokens(md),
    createdAt: new Date().toISOString(),
  };
}
