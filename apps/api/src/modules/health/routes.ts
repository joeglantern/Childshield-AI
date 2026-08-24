import type { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';
import type { PrismaClient } from '@childshield/db';
import type { Redis } from 'ioredis';

export function registerHealthRoutes(
  app: FastifyInstance,
  deps: { prisma: PrismaClient; redis: Redis },
): void {
  app.get(
    '/health',
    {
      schema: {
        tags: ['system'],
        summary: 'Liveness probe',
        response: { 200: Type.Object({ status: Type.Literal('ok') }) },
      },
    },
    async () => ({ status: 'ok' as const }),
  );

  app.get(
    '/ready',
    {
      schema: {
        tags: ['system'],
        summary: 'Readiness probe (checks PostgreSQL and Redis)',
        response: {
          200: Type.Object({ status: Type.Literal('ready') }),
          503: Type.Object({ status: Type.Literal('unavailable'), failing: Type.Array(Type.String()) }),
        },
      },
    },
    async (_request, reply) => {
      const failing: string[] = [];
      await deps.prisma.$queryRaw`SELECT 1`.catch(() => failing.push('postgres'));
      await deps.redis.ping().catch(() => failing.push('redis'));
      if (failing.length > 0) {
        reply.code(503);
        return { status: 'unavailable' as const, failing };
      }
      return { status: 'ready' as const };
    },
  );
}
