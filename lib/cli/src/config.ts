import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { homedir } from "os";
import { join } from "path";

export interface CliConfig {
  serverUrl: string;
  projectName?: string;
  projectId?: string;
}

const CONFIG_PATH = join(homedir(), ".swarm-ctrl.json");

export function loadConfig(): CliConfig {
  const defaults: CliConfig = {
    serverUrl: process.env["SWARM_SERVER"] ?? "http://localhost:8080",
    projectName: process.env["SWARM_PROJECT"],
  };

  if (existsSync(CONFIG_PATH)) {
    try {
      const raw = readFileSync(CONFIG_PATH, "utf8");
      const parsed = JSON.parse(raw) as Partial<CliConfig>;
      return { ...defaults, ...parsed };
    } catch {
      return defaults;
    }
  }
  return defaults;
}

export function saveConfig(cfg: Partial<CliConfig>): void {
  const current = loadConfig();
  const merged = { ...current, ...cfg };
  writeFileSync(CONFIG_PATH, JSON.stringify(merged, null, 2), "utf8");
}

export async function apiCall<T = unknown>(
  path: string,
  options: { method?: string; body?: unknown } = {},
  config?: CliConfig
): Promise<T> {
  const cfg = config ?? loadConfig();
  const url = `${cfg.serverUrl.replace(/\/$/, "")}${path}`;
  const resp = await fetch(url, {
    method: options.method ?? "GET",
    headers: { "Content-Type": "application/json" },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`API ${resp.status}: ${text}`);
  }
  return resp.json() as Promise<T>;
}
