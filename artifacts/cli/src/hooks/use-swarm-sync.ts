import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

const RECONNECT_DELAY = 3000;

export function useSwarmSync() {
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    function connect() {
      if (!mountedRef.current) return;

      const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
      const ws = new WebSocket(`${proto}//${window.location.host}/api/ws`);
      wsRef.current = ws;

      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data as string) as { event: string };
          if (msg.event !== "run:log") {
            queryClient.invalidateQueries();
          }
        } catch {
          // ignore
        }
      };

      ws.onclose = () => {
        if (mountedRef.current) {
          timerRef.current = setTimeout(connect, RECONNECT_DELAY);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connect();

    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      wsRef.current?.close();
    };
  }, [queryClient]);
}
