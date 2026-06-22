import { Router } from "express";
import { readdirSync, statSync, readFileSync, existsSync } from "fs";
import { join, relative, basename } from "path";
import { GetWorkspaceFileQueryParams, ListWorkspaceFilesQueryParams } from "@workspace/api-zod";

const router = Router();

const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || "/home/runner/workspace";

interface FileNode {
  path: string;
  name: string;
  type: "file" | "directory";
  size: number | null;
  children?: FileNode[];
}

function buildTree(dir: string, rootDir: string, depth = 0): FileNode[] {
  if (depth > 4) return [];
  const IGNORE = new Set(["node_modules", ".git", "dist", "build", ".tsbuildinfo", "pnpm-lock.yaml"]);
  try {
    return readdirSync(dir)
      .filter(f => !f.startsWith(".") || f === ".env")
      .filter(f => !IGNORE.has(f))
      .map(f => {
        const full = join(dir, f);
        const rel = relative(rootDir, full);
        try {
          const st = statSync(full);
          if (st.isDirectory()) {
            return { path: rel, name: f, type: "directory" as const, size: null, children: buildTree(full, rootDir, depth + 1) };
          }
          return { path: rel, name: f, type: "file" as const, size: st.size, children: undefined };
        } catch {
          return null;
        }
      })
      .filter(Boolean) as FileNode[];
  } catch {
    return [];
  }
}

router.get("/", (req, res) => {
  const query = ListWorkspaceFilesQueryParams.parse(req.query);
  const projectDir = query.project
    ? join(WORKSPACE_ROOT, "artifacts", query.project)
    : WORKSPACE_ROOT;
  const rootDir = existsSync(projectDir) ? projectDir : WORKSPACE_ROOT;
  const tree = buildTree(rootDir, rootDir);
  res.json(tree);
});

router.get("/file", (req, res) => {
  const query = GetWorkspaceFileQueryParams.parse(req.query);
  const full = join(WORKSPACE_ROOT, query.path.replace(/^\/+/, ""));
  if (!existsSync(full)) return res.status(404).json({ error: "File not found" });
  try {
    const content = readFileSync(full, "utf-8");
    res.json({ path: query.path, content, lines: content.split("\n").length });
  } catch {
    res.status(400).json({ error: "Cannot read file" });
  }
});

export default router;
