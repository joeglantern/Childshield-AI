// Live queue socket — WS is a delivery optimization; every event invalidates
// the query cache so REST (server state) wins.
import { WS_ROOM_QUEUE } from '@childshield/shared';
import { api, BASE } from './api';
import { sessionStore } from './session';

export type WsState = 'connecting' | 'live' | 'offline';

export function connectQueueSocket(handlers: {
  onState: (s: WsState) => void;
  onEvent: (event: string) => void;
}): () => void {
  let ws: WebSocket | null = null;
  let closed = false;
  let retryMs = 1000;

  const open = async () => {
    if (closed) return;
    handlers.onState('connecting');
    try {
      const { ticket } = await sessionStore.call((t) => api.wsTicket(t));
      ws = new WebSocket(`${BASE.replace(/^http/, 'ws')}/ws?ticket=${ticket}`);
      ws.onopen = () => {
        retryMs = 1000;
        ws?.send(JSON.stringify({ type: 'subscribe', room: WS_ROOM_QUEUE }));
        handlers.onState('live');
      };
      ws.onmessage = (evt) => {
        try {
          const frame = JSON.parse(String(evt.data)) as { event?: string };
          if (frame.event?.includes('.')) handlers.onEvent(frame.event);
        } catch {
          /* ignore malformed frames */
        }
      };
      ws.onclose = () => {
        if (closed) return;
        handlers.onState('offline');
        setTimeout(() => void open(), retryMs);
        retryMs = Math.min(retryMs * 2, 15000);
      };
      ws.onerror = () => ws?.close();
    } catch {
      if (closed) return;
      handlers.onState('offline');
      setTimeout(() => void open(), retryMs);
      retryMs = Math.min(retryMs * 2, 15000);
    }
  };

  void open();
  return () => {
    closed = true;
    ws?.close();
  };
}
