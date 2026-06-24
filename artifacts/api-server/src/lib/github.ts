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
