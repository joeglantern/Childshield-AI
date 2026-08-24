// Live queue socket. WS is a delivery optimization, never the source of
// truth: on every (re)connect the caller refetches via REST and reconciles.
// Runtime values come from the TypeBox-free constants entry (Hermes-safe);
// types are erased at compile time so the main entry is fine for them.
import { WS_ROOM_QUEUE } from '@childshield/shared/constants';
import type { WsEnvelope } from '@childshield/shared';
import { api } from './api';

export type WsState = 'connecting' | 'live' | 'offline';

export interface QueueSocketHandlers {
  onState: (state: WsState) => void;
  onEvent: (envelope: WsEnvelope) => void;
}

/// getTicket goes through the officer session's refresh-aware call(), so
/// reconnects keep working after the access token rotates.
export function connectQueueSocket(
  getTicket: () => Promise<string>,
  handlers: QueueSocketHandlers,
): () => void {
  let ws: WebSocket | null = null;
  let closed = false;
  let retryMs = 1000;

  const open = async () => {
    if (closed) return;
    handlers.onState('connecting');
    try {
      const ticket = await getTicket();
      const wsBase = api.baseUrl.replace(/^http/, 'ws');
      ws = new WebSocket(`${wsBase}/ws?ticket=${ticket}`);

      ws.onopen = () => {
        retryMs = 1000;
        ws?.send(JSON.stringify({ type: 'subscribe', room: WS_ROOM_QUEUE }));
        handlers.onState('live');
      };
      ws.onmessage = (evt) => {
        try {
          const frame = JSON.parse(String(evt.data)) as { event?: string };
          if (frame.event && frame.event.includes('.')) {
            handlers.onEvent(frame as unknown as WsEnvelope);
          }
        } catch {
          // ignore malformed frames
        }
      };
      ws.onclose = () => {
        if (closed) return;
        handlers.onState('offline');
        setTimeout(() => void open(), retryMs);
        retryMs = Math.min(retryMs * 2, 15000);
      };
      ws.onerror = () => {
        ws?.close();
      };
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
