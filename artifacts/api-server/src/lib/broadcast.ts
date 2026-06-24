import { WebSocket } from "ws";

const clients = new Set<WebSocket>();

type BroadcastHandler = (event: string, data: unknown) => void;
const subscribers = new Set<BroadcastHandler>();

export function registerClient(ws: WebSocket) {
  clients.add(ws);
  ws.on("close", () => clients.delete(ws));
}

export function subscribe(handler: BroadcastHandler): void {
  subscribers.add(handler);
}

export function unsubscribe(handler: BroadcastHandler): void {
  subscribers.delete(handler);
}

export function broadcast(event: string, data: unknown) {
  const msg = JSON.stringify({ event, data, ts: new Date().toISOString() });
  for (const ws of clients) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(msg);
    }
  }
  for (const handler of subscribers) {
    try {
      handler(event, data);
    } catch {
      // ignore handler errors
    }
  }
}
