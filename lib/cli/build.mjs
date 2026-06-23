import { build } from "esbuild";
import { mkdir } from "fs/promises";

await mkdir("dist", { recursive: true });
await mkdir("bin", { recursive: true });

await build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  outfile: "dist/cli.mjs",
  sourcemap: true,
  external: ["readline"],
});

// bin/swarm.mjs just re-exports dist/cli.mjs
import { writeFileSync, chmodSync } from "fs";
writeFileSync("bin/swarm.mjs", `#!/usr/bin/env node\nimport "../dist/cli.mjs";\n`);
try { chmodSync("bin/swarm.mjs", 0o755); } catch {}

console.log("CLI built.");
