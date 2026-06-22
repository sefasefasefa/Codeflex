import { WebSocket } from "ws";

const clients = new Set<WebSocket>();

export function registerClient(ws: WebSocket) {
  clients.add(ws);
  ws.on("close", () => clients.delete(ws));
}

export function broadcast(event: string, data: unknown) {
  const msg = JSON.stringify({ event, data, ts: new Date().toISOString() });
  for (const ws of clients) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(msg);
    }
  }
}
