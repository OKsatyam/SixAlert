"use client";
// WebSocket hook — auto-reconnects with exponential backoff, max 5 attempts
import { useEffect, useRef, useCallback, useState } from "react";
import type { WsMessage } from "@/types";

const WS_BASE = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:4000";
// 3s base backoff, doubles each retry until max 5 attempts
const RECONNECT_BASE_MS = 3000;
const MAX_RETRIES = 5;

interface UseWebSocketOptions {
  matchId: string | null;
  onMessage: (msg: WsMessage) => void;
  enabled?: boolean;
}

export function useWebSocket({ matchId, onMessage, enabled = true }: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const retriesRef = useRef(0);
  const onMessageRef = useRef(onMessage);
  const [connected, setConnected] = useState(false);

  onMessageRef.current = onMessage;

  const connect = useCallback(() => {
    if (!matchId || !enabled) return;
    wsRef.current?.close();

    const url = `${WS_BASE}?matchId=${matchId}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      retriesRef.current = 0;
      setConnected(true);
    };

    ws.onmessage = (e) => {
      try {
        const msg: WsMessage = JSON.parse(e.data);
        if (msg.type === "PING") return;
        onMessageRef.current(msg);
      } catch {
        // malformed frame — ignore
      }
    };

    ws.onclose = () => {
      setConnected(false);
      if (retriesRef.current < MAX_RETRIES) {
        const delay = RECONNECT_BASE_MS * Math.pow(2, retriesRef.current);
        retriesRef.current++;
        setTimeout(connect, delay);
      }
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [matchId, enabled]);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connect]);

  return { connected };
}
