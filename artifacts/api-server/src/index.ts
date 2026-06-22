import app from "./app.js";
import { logger } from "./lib/logger.js";
import { WebSocketServer } from "ws";
import { createServer } from "http";
import { registerClient } from "./lib/broadcast.js";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer, path: "/api/ws" });

wss.on("connection", (ws) => {
  registerClient(ws);
  ws.send(JSON.stringify({ event: "connected", data: { message: "Swarm Agent WebSocket ready" }, ts: new Date().toISOString() }));
  logger.info("WebSocket client connected");
});

httpServer.listen(port, (err?: Error) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");
});
