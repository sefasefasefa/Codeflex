import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import agentsRouter from "./agents.js";
import runsRouter from "./runs.js";
import snapshotsRouter from "./snapshots.js";
import workspaceRouter from "./workspace.js";
import statsRouter from "./stats.js";
import projectsRouter from "./projects.js";
import cliRouter from "./cli.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/projects", projectsRouter);
router.use("/agents", agentsRouter);
router.use("/runs", runsRouter);
router.use("/snapshots", snapshotsRouter);
router.use("/workspace", workspaceRouter);
router.use("/cli", cliRouter);
router.use(statsRouter);

export default router;
