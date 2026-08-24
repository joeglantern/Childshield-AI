// Realtime hub (§5). Redis pub/sub fans events out across api + worker
// containers; each api instance broadcasts to its local sockets by room.
// Every event mirrors a persisted CaseEvent — REST stays the source of
// truth and clients reconcile via the `cursor` field on reconnect.
//
// SAFEGUARDING: frames carry ids/statuses/names only — never report content.

import type { WebSocket } from 'ws';
import type { Redis } from 'ioredis';
import type { FastifyBaseLogger } from 'fastify';
import {
  WS_REDIS_CHANNEL,
  WS_ROOM_QUEUE,
  WS_ROOM_SUPERVISOR,
  type Role,
  type WsEnvelope,
} from '@childshield/shared';
import type { EventPublisher } from '../cases/service.js';

interface WireMessage {
  rooms: string[];
  envelope: WsEnvelope;
}

interface PresenceWire {
  presenceRoom: string;
}

export interface Connection {
  userId: string;
  role: Role;
  displayName: string;
  rooms: Set<string>;
}

function canJoin(role: Role, room: string): boolean {
  if (room === WS_ROOM_SUPERVISOR) return role === 'SUPERVISOR' || role === 'ADMIN';
  if (room === WS_ROOM_QUEUE || room.startsWith('case:')) return true;
  return false;
}

export class RedisEventPublisher implements EventPublisher {
  constructor(private readonly redis: Redis) {}

  async publish(rooms: string[], envelope: WsEnvelope): Promise<void> {
    const message: WireMessage = { rooms, envelope };
    await this.redis.publish(WS_REDIS_CHANNEL, JSON.stringify(message));
  }
}

export class WsHub {
  private readonly connections = new Map<WebSocket, Connection>();

  constructor(
    /// Dedicated subscriber connection (Redis subscribers can't run commands).
    private readonly sub: Redis,
    /// Regular connection for presence bookkeeping + presence publish.
    private readonly redis: Redis,
    private readonly log: FastifyBaseLogger,
  ) {}

  async start(): Promise<void> {
    await this.sub.subscribe(WS_REDIS_CHANNEL);
    this.sub.on('message', (_channel: string, raw: string) => {
      try {
        const parsed = JSON.parse(raw) as WireMessage | PresenceWire;
        if ('presenceRoom' in parsed) {
          void this.broadcastPresence(parsed.presenceRoom);
        } else {
          this.broadcastLocal(parsed.rooms, JSON.stringify(parsed.envelope));
        }
      } catch (err) {
        this.log.warn({ err }, 'ws hub: failed to handle pubsub message');
      }
    });
  }

  register(socket: WebSocket, info: Omit<Connection, 'rooms'>): void {
    this.connections.set(socket, { ...info, rooms: new Set() });
  }

  async join(socket: WebSocket, room: string): Promise<boolean> {
    const conn = this.connections.get(socket);
    if (!conn || !canJoin(conn.role, room)) return false;
    conn.rooms.add(room);
    if (room.startsWith('case:')) {
      await this.redis.sadd(this.presenceKey(room), conn.displayName);
      await this.redis.publish(WS_REDIS_CHANNEL, JSON.stringify({ presenceRoom: room }));
    }
    return true;
  }

  async leave(socket: WebSocket, room: string): Promise<void> {
    const conn = this.connections.get(socket);
    if (!conn) return;
    conn.rooms.delete(room);
    if (room.startsWith('case:')) {
      await this.removePresenceIfLastLocal(room, conn.displayName);
    }
  }

  async disconnect(socket: WebSocket): Promise<void> {
    const conn = this.connections.get(socket);
    this.connections.delete(socket);
    if (!conn) return;
    for (const room of conn.rooms) {
      if (room.startsWith('case:')) {
        await this.removePresenceIfLastLocal(room, conn.displayName);
      }
    }
  }

  private async removePresenceIfLastLocal(room: string, displayName: string): Promise<void> {
    // Only clear the presence entry when no other local socket for the same
    // display name remains in the room (multi-tab support).
    const stillHere = [...this.connections.values()].some(
      (c) => c.displayName === displayName && c.rooms.has(room),
    );
    if (!stillHere) {
      await this.redis.srem(this.presenceKey(room), displayName);
      await this.redis.publish(WS_REDIS_CHANNEL, JSON.stringify({ presenceRoom: room }));
    }
  }

  private presenceKey(room: string): string {
    return `presence:${room}`;
  }

  private async broadcastPresence(room: string): Promise<void> {
    const viewers = await this.redis.smembers(this.presenceKey(room));
    const frame = JSON.stringify({ event: 'presence', room, viewers });
    this.broadcastLocal([room], frame);
  }

  private broadcastLocal(rooms: string[], frame: string): void {
    for (const [socket, conn] of this.connections) {
      if (rooms.some((r) => conn.rooms.has(r)) && socket.readyState === socket.OPEN) {
        socket.send(frame);
      }
    }
  }
}
