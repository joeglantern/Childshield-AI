// Read-only audit log listing. Deliberately does NOT live in this module's
// index.ts — that file's export surface is pinned by
// test/safeguarding/audit-append-only.test.ts (append + verify ONLY). This
// route only ever SELECTs; it registers directly against the app.
import type { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';
import type { PrismaClient } from '@childshield/db';
import { AuditListResponseSchema } from '@childshield/shared';
import { verifyChain } from './index.js';

export function registerAuditRoutes(app: FastifyInstance, prisma: PrismaClient): void {
  app.get<{ Querystring: { limit?: number; before?: string } }>(
    '/audit',
    {
      preHandler: app.requireStaff(['AUDITOR', 'SUPERVISOR', 'ADMIN']),
      schema: {
        tags: ['audit'],
        summary:
          'Read-only audit log listing with hash-chain verification. ' +
          'AUDITOR, SUPERVISOR, ADMIN only. No mutating endpoint exists for this resource, ever.',
        security: [{ bearerAuth: [] }],
        querystring: Type.Object({
          limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 200 })),
          before: Type.Optional(Type.String()),
        }),
        response: { 200: AuditListResponseSchema },
      },
    },
    async (request) => {
      const limit = request.query.limit ?? 50;

      let beforeSeq: number | undefined;
      if (request.query.before) {
        const cursor = await prisma.auditLog.findUnique({
          where: { id: request.query.before },
          select: { seq: true },
        });
        beforeSeq = cursor?.seq;
      }

      const rows = await prisma.auditLog.findMany({
        where: beforeSeq !== undefined ? { seq: { lt: beforeSeq } } : undefined,
        orderBy: { seq: 'desc' },
        take: limit,
      });

      const actorIds = [...new Set(rows.map((r) => r.actorId).filter((v): v is string => v !== null))];
      const caseEntityIds = [
        ...new Set(rows.filter((r) => r.entityType === 'Case').map((r) => r.entityId)),
      ];

      const [users, caseRows] = await Promise.all([
        actorIds.length
          ? prisma.user.findMany({
              where: { id: { in: actorIds } },
              select: { id: true, displayName: true },
            })
          : Promise.resolve([]),
        caseEntityIds.length
          ? prisma.case.findMany({
              where: { id: { in: caseEntityIds } },
              select: { id: true, caseCode: true },
            })
          : Promise.resolve([]),
      ]);
      const userMap = new Map(users.map((u) => [u.id, u.displayName]));
      const caseMap = new Map(caseRows.map((c) => [c.id, c.caseCode]));

      // Re-walks the whole chain at request time — fine at pilot scale;
      // becomes a scheduled background check (B5) if audit volume grows.
      const verification = await verifyChain(prisma);

      return {
        entries: rows.map((r) => ({
          id: r.id,
          actorId: r.actorId,
          actorType: r.actorType,
          actorDisplayName: r.actorId ? (userMap.get(r.actorId) ?? null) : null,
          action: r.action,
          entityType: r.entityType,
          entityId: r.entityId,
          entityLabel: r.entityType === 'Case' ? (caseMap.get(r.entityId) ?? null) : null,
          entryHash: r.entryHash,
          createdAt: r.createdAt.toISOString(),
        })),
        chainValid: verification.valid,
      };
    },
  );
}
