import { randomBytes } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';
import type { Redis } from 'ioredis';
import { Value } from '@sinclair/typebox/value';
import {
  WsClientMessageSchema,
  WsTicketResponseSchema,
  type Role,
  type WsClientMessage,
} from '@childshield/shared';
import type { WsHub } from './hub.js';

const TICKET_PREFIX = 'wsticket:';

interface TicketData {
  userId: string;
  role: Role;
  displayName: string;
}

export function registerWsRoutes(
  app: FastifyInstance,
  deps: { redis: Redis; hub: WsHub; ticketTtlSeconds: number },
): void {
  const { redis, hub, ticketTtlSeconds } = deps;

  app.post(
    '/ws/ticket',
    {
      preHandler: app.requireStaff(),
      schema: {
        tags: ['realtime'],
        summary: 'Issue a short-lived single-use WebSocket ticket (staff only)',
        security: [{ bearerAuth: [] }],
        response: { 200: WsTicketResponseSchema },
      },
    },
    async (request) => {
      const staff = request.staff;
      if (!staff) throw new Error('unreachable: requireStaff guarantees staff');
      const ticket = randomBytes(24).toString('base64url');
      const data: TicketData = {
        userId: staff.id,
        role: staff.role,
        displayName: staff.displayName,
      };
      await redis.set(`${TICKET_PREFIX}${ticket}`, JSON.stringify(data), 'EX', ticketTtlSeconds);
      return { ticket, expiresInSeconds: ticketTtlSeconds };
    },
  );

  app.get<{ Querystring: { ticket: string } }>(
    '/ws',
    {
      websocket: true,
      schema: {
        tags: ['realtime'],
        summary:
          'WebSocket endpoint. Connect with ?ticket= from POST /ws/ticket. ' +
          'Rooms: "queue" (all staff), "supervisor" (supervisors/admins), "case:{caseId}" (presence-tracked). ' +
          'Client messages: {type:"subscribe"|"unsubscribe", room} | {type:"ping"}. ' +
          'Server frames: {event, payload} envelopes plus {event:"presence", room, viewers}.',
        querystring: Type.Object({ ticket: Type.String() }),
      },
    },
    async (socket, request) => {
      const raw = await redis.getdel(`${TICKET_PREFIX}${request.query.ticket}`);
      if (!raw) {
        socket.close(4001, 'invalid or expired ticket');
        return;
      }
      const info = JSON.parse(raw) as TicketData;
      hub.register(socket, info);

      socket.on('message', (buf: Buffer) => {
        void (async () => {
          let msg: WsClientMessage;
          try {
            const parsed: unknown = JSON.parse(buf.toString());
            if (!Value.Check(WsClientMessageSchema, parsed)) return;
            msg = parsed;
          } catch {
            return;
          }
          if (msg.type === 'ping') {
            socket.send(JSON.stringify({ event: 'pong' }));
          } else if (msg.type === 'subscribe') {
            const ok = await hub.join(socket, msg.room);
            socket.send(JSON.stringify({ event: ok ? 'subscribed' : 'subscribe_denied', room: msg.room }));
          } else {
            await hub.leave(socket, msg.room);
            socket.send(JSON.stringify({ event: 'unsubscribed', room: msg.room }));
          }
        })();
      });

      socket.on('close', () => {
        void hub.disconnect(socket);
      });
    },
  );
}
