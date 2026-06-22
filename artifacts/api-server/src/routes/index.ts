import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import agentsRouter from "./agents.js";
import runsRouter from "./runs.js";
import snapshotsRouter from "./snapshots.js";
import workspaceRouter from "./workspace.js";
import statsRouter from "./stats.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/agents", agentsRouter);
router.use("/runs", runsRouter);
router.use("/snapshots", snapshotsRouter);
router.use("/workspace", workspaceRouter);
router.use(statsRouter);

export default router;
