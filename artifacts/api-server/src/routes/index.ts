import { Router, type IRouter, type Request, type Response } from "express";
import swaggerUi from "swagger-ui-express";
import { readFileSync } from "fs";
import { load as yamlLoad } from "js-yaml";
import { fileURLToPath } from "url";
import { join, dirname } from "path";
import healthRouter from "./health.js";
import agentsRouter from "./agents.js";
import runsRouter from "./runs.js";
import snapshotsRouter from "./snapshots.js";
import workspaceRouter from "./workspace.js";
import statsRouter from "./stats.js";
import projectsRouter from "./projects.js";
import cliRouter from "./cli.js";
import modelsRouter from "./models.js";
import chatRouter from "./chat.js";
import authRouter from "./auth.js";
import keysRouter from "./keys.js";
import userActivityRouter from "./userActivity.js";
import uploadRouter from "./upload.js";

const router: IRouter = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let swaggerDocument: Record<string, unknown> | null = null;
try {
  const candidates = [
    join(__dirname, "../../../../lib/api-spec/openapi.yaml"),
    join(__dirname, "../../../lib/api-spec/openapi.yaml"),
    join(process.cwd(), "../../lib/api-spec/openapi.yaml"),
    join(process.cwd(), "lib/api-spec/openapi.yaml"),
  ];
  for (const p of candidates) {
    try {
      const raw = readFileSync(p, "utf8");
      swaggerDocument = yamlLoad(raw) as Record<string, unknown>;
      break;
    } catch {
      continue;
    }
  }
} catch {
  swaggerDocument = null;
}

if (swaggerDocument) {
  const swaggerOptions = {
    customCss: `
      .swagger-ui .topbar { background: #0f1117; border-bottom: 1px solid #1e2433; }
      .swagger-ui .topbar-wrapper .link { display: flex; align-items: center; gap: 8px; }
      .swagger-ui { font-family: 'JetBrains Mono', 'Fira Code', monospace; }
      .swagger-ui .info .title { color: #22d3ee; font-size: 2rem; }
      .swagger-ui .opblock.opblock-get .opblock-summary-method { background: #1d4ed8; }
      .swagger-ui .opblock.opblock-post .opblock-summary-method { background: #15803d; }
      .swagger-ui .opblock.opblock-put .opblock-summary-method { background: #b45309; }
      .swagger-ui .opblock.opblock-delete .opblock-summary-method { background: #9f1239; }
      .swagger-ui .opblock.opblock-patch .opblock-summary-method { background: #6b21a8; }
      body { background: #0f1117; }
    `,
    customSiteTitle: "SWARM_CTRL API Docs",
    customfavIcon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><text y='20' font-size='20'>⚡</text></svg>",
    swaggerOptions: {
      defaultModelsExpandDepth: 1,
      defaultModelExpandDepth: 2,
      docExpansion: "list",
      filter: true,
      showExtensions: true,
    },
  };
  router.use("/docs", swaggerUi.serve);
  router.get("/docs", swaggerUi.setup(swaggerDocument, swaggerOptions));
  router.get("/docs/openapi.json", (_req: Request, res: Response) => {
    res.json(swaggerDocument);
  });
  router.get("/docs/openapi.yaml", (_req: Request, res: Response) => {
    try {
      const candidates = [
        join(__dirname, "../../../../lib/api-spec/openapi.yaml"),
        join(__dirname, "../../../lib/api-spec/openapi.yaml"),
        join(process.cwd(), "../../lib/api-spec/openapi.yaml"),
        join(process.cwd(), "lib/api-spec/openapi.yaml"),
      ];
      for (const p of candidates) {
        try { res.type("text/yaml").send(readFileSync(p, "utf8")); return; } catch { continue; }
      }
      res.status(404).json({ error: "openapi.yaml bulunamadı" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
} else {
  router.get("/docs", (_req: Request, res: Response) => {
    res.json({ message: "Swagger UI hazır değil — openapi.yaml bulunamadı." });
  });
}

router.use(healthRouter);
router.use("/projects", projectsRouter);
router.use("/agents", agentsRouter);
router.use("/runs", runsRouter);
router.use("/snapshots", snapshotsRouter);
router.use("/workspace", workspaceRouter);
router.use("/cli", cliRouter);
router.use("/models", modelsRouter);
router.use("/chat", chatRouter);
router.use(authRouter);
router.use(keysRouter);
router.use(statsRouter);
router.use(userActivityRouter);
router.use(uploadRouter);

export default router;
