const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = process.env.GITHUB_OWNER;

export function isGitHubConfigured(): boolean {
  return !!(GITHUB_TOKEN && GITHUB_OWNER);
}

export function getOwner(): string {
  return GITHUB_OWNER ?? "";
}

async function ghFetch(path: string, options: RequestInit = {}): Promise<unknown> {
  if (!GITHUB_TOKEN || !GITHUB_OWNER) {
    throw new Error("GitHub not configured. Set GITHUB_TOKEN and GITHUB_OWNER environment variables.");
  }
  const res = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  if (res.status === 204) return null;
  const body = await res.text();
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${body}`);
  return JSON.parse(body);
}

export interface RepoInfo {
  name: string;
  html_url: string;
  clone_url: string;
}

export async function createRepo(repoName: string, description: string): Promise<RepoInfo> {
  return ghFetch("/user/repos", {
    method: "POST",
    body: JSON.stringify({
      name: repoName,
      description,
      private: false,
      auto_init: true,
    }),
  }) as Promise<RepoInfo>;
}

export async function getRepo(repoName: string): Promise<RepoInfo | null> {
  try {
    return (await ghFetch(`/repos/${GITHUB_OWNER}/${repoName}`)) as RepoInfo;
  } catch {
    return null;
  }
}

interface GitRef { object: { sha: string } }
interface GitCommit { tree: { sha: string } }
interface GitBlob { sha: string }
interface GitTree { sha: string }
interface GitNewCommit { sha: string }

interface GitHubTreeItem {
  path: string;
  type: "blob" | "tree";
  sha: string;
  size?: number;
}

interface GitHubTreeResponse {
  sha: string;
  tree: GitHubTreeItem[];
  truncated: boolean;
}

const SKIP_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".webp", ".bmp", ".tiff",
  ".mp4", ".mp3", ".wav", ".ogg", ".webm", ".avi", ".mov",
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
  ".zip", ".tar", ".gz", ".7z", ".rar",
  ".ttf", ".woff", ".woff2", ".eot",
  ".bin", ".exe", ".dll", ".so", ".dylib",
  ".lock",
]);

const EXT_TO_LANG: Record<string, string> = {
  ".ts": "typescript", ".tsx": "typescript", ".js": "javascript", ".jsx": "javascript",
  ".py": "python", ".rb": "ruby", ".go": "go", ".rs": "rust", ".java": "java",
  ".c": "c", ".cpp": "cpp", ".h": "c", ".cs": "csharp", ".php": "php",
  ".html": "html", ".css": "css", ".scss": "scss", ".sass": "sass",
  ".json": "json", ".yaml": "yaml", ".yml": "yaml", ".toml": "toml",
  ".md": "markdown", ".mdx": "markdown", ".txt": "text", ".sh": "bash",
  ".sql": "sql", ".graphql": "graphql", ".xml": "xml", ".env": "dotenv",
  ".dockerfile": "dockerfile",
};

function extLang(filePath: string): string {
  const lower = filePath.toLowerCase();
  if (lower.endsWith("dockerfile")) return "dockerfile";
  const dot = lower.lastIndexOf(".");
  if (dot === -1) return "text";
  return EXT_TO_LANG[lower.slice(dot)] ?? "text";
}

function shouldSkip(filePath: string): boolean {
  const lower = filePath.toLowerCase();
  const dot = lower.lastIndexOf(".");
  if (dot !== -1 && SKIP_EXTENSIONS.has(lower.slice(dot))) return true;
  return false;
}

export interface ImportedFile {
  path: string;
  content: string;
  language: string;
  sizeBytes: number;
}

async function publicFetch(url: string, token?: string): Promise<unknown> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(url, { headers });
  if (res.status === 204) return null;
  const body = await res.text();
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${body}`);
  return JSON.parse(body);
}

export async function importRepoFiles(repoUrl: string): Promise<{ name: string; description: string; files: ImportedFile[] }> {
  const clean = repoUrl.trim().replace(/\/$/, "").replace(/\.git$/, "");
  let owner: string, repo: string;

  const ghMatch = clean.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (ghMatch) {
    owner = ghMatch[1];
    repo = ghMatch[2];
  } else {
    const parts = clean.split("/").filter(Boolean);
    if (parts.length < 2) throw new Error("Geçersiz repo URL'si. Örnek: https://github.com/owner/repo");
    owner = parts[parts.length - 2];
    repo = parts[parts.length - 1];
  }

  const token = GITHUB_TOKEN;

  const repoInfo = await publicFetch(`https://api.github.com/repos/${owner}/${repo}`, token) as {
    name: string;
    description: string | null;
    default_branch: string;
  };

  const branch = repoInfo.default_branch;
  const tree = await publicFetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
    token,
  ) as GitHubTreeResponse;

  const blobs = tree.tree.filter(
    (item) => item.type === "blob" && !shouldSkip(item.path) && (item.size ?? 0) < 200_000,
  );

  const MAX_FILES = 80;
  const selected = blobs.slice(0, MAX_FILES);

  const files: ImportedFile[] = [];

  const BATCH = 6;
  for (let i = 0; i < selected.length; i += BATCH) {
    const batch = selected.slice(i, i + BATCH);
    const results = await Promise.allSettled(
      batch.map(async (item) => {
        const raw = await publicFetch(
          `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(item.path)}?ref=${branch}`,
          token,
        ) as { content?: string; encoding?: string };
        if (!raw.content || raw.encoding !== "base64") return null;
        const content = Buffer.from(raw.content.replace(/\n/g, ""), "base64").toString("utf-8");
        return {
          path: item.path,
          content,
          language: extLang(item.path),
          sizeBytes: Buffer.byteLength(content, "utf-8"),
        } satisfies ImportedFile;
      }),
    );
    for (const r of results) {
      if (r.status === "fulfilled" && r.value) files.push(r.value);
    }
  }

  return {
    name: repoInfo.name,
    description: repoInfo.description ?? `Imported from github.com/${owner}/${repo}`,
    files,
  };
}

export async function pushFiles(
  repoName: string,
  files: Array<{ path: string; content: string }>,
  message: string,
): Promise<{ sha: string; commitUrl: string }> {
  const owner = GITHUB_OWNER!;

  const refData = (await ghFetch(`/repos/${owner}/${repoName}/git/refs/heads/main`)) as GitRef;
  const latestCommitSha = refData.object.sha;

  const commitData = (await ghFetch(`/repos/${owner}/${repoName}/git/commits/${latestCommitSha}`)) as GitCommit;
  const baseTreeSha = commitData.tree.sha;

  const BATCH = 8;
  const treeEntries: Array<{ path: string; mode: string; type: string; sha: string }> = [];

  for (let i = 0; i < files.length; i += BATCH) {
    const batch = files.slice(i, i + BATCH);
    const blobs = await Promise.all(
      batch.map(async (f) => {
        const blob = (await ghFetch(`/repos/${owner}/${repoName}/git/blobs`, {
          method: "POST",
          body: JSON.stringify({
            content: Buffer.from(f.content, "utf-8").toString("base64"),
            encoding: "base64",
          }),
        })) as GitBlob;
        return { path: f.path, mode: "100644", type: "blob", sha: blob.sha };
      }),
    );
    treeEntries.push(...blobs);
  }

  const treeData = (await ghFetch(`/repos/${owner}/${repoName}/git/trees`, {
    method: "POST",
    body: JSON.stringify({ base_tree: baseTreeSha, tree: treeEntries }),
  })) as GitTree;

  const newCommit = (await ghFetch(`/repos/${owner}/${repoName}/git/commits`, {
    method: "POST",
    body: JSON.stringify({
      message,
      tree: treeData.sha,
      parents: [latestCommitSha],
    }),
  })) as GitNewCommit;

  await ghFetch(`/repos/${owner}/${repoName}/git/refs/heads/main`, {
    method: "PATCH",
    body: JSON.stringify({ sha: newCommit.sha, force: false }),
  });

  return {
    sha: newCommit.sha,
    commitUrl: `https://github.com/${owner}/${repoName}/commit/${newCommit.sha}`,
  };
}
