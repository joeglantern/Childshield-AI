import type { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';
import {
  OverrideEventDtoSchema,
  OverrideRequestSchema,
  OverrideReviewExportSchema,
  type OverrideRequest,
} from '@childshield/shared';
import { ValidationFailedError } from '../../lib/errors.js';
import { OverrideService, OVERRIDE_ROLES } from './service.js';

const ErrorSchema = Type.Object({ code: Type.String(), message: Type.String() });

/// Default review window for the Ops Committee export: the last 7 days.
const DEFAULT_WINDOW_DAYS = 7;
const MAX_WINDOW_DAYS = 92;

export function registerOverrideRoutes(app: FastifyInstance, overrides: OverrideService): void {
  app.post<{ Params: { id: string }; Body: OverrideRequest }>(
    '/cases/:id/override',
    {
      // SAFEGUARDING: supervisors only. This is the sole sanctioned route to
      // break a child's anonymity, and the service re-checks the role.
      preHandler: app.requireStaff(OVERRIDE_ROLES),
      schema: {
        tags: ['override'],
        summary:
          'Record a safeguarding override (supervisor only). The only sanctioned de-anonymization path; always writes an OverrideEvent and an audit row.',
        security: [{ bearerAuth: [] }],
        params: Type.Object({ id: Type.String() }),
        body: OverrideRequestSchema,
        response: {
          201: OverrideEventDtoSchema,
          400: ErrorSchema,
          403: ErrorSchema,
          404: ErrorSchema,
        },
      },
    },
    async (request, reply) => {
      const staff = request.staff;
      if (!staff) throw new Error('unreachable: requireStaff guarantees staff');
      const created = await overrides.triggerOverride(request.params.id, staff, request.body);
      reply.code(201);
      return OverrideService.toDto(created);
    },
  );

  app.get<{ Params: { id: string } }>(
    '/cases/:id/overrides',
    {
      preHandler: app.requireStaff(['SUPERVISOR', 'ADMIN', 'AUDITOR']),
      schema: {
        tags: ['override'],
        summary: 'Overrides recorded against a case (supervisor, admin or auditor)',
        security: [{ bearerAuth: [] }],
        params: Type.Object({ id: Type.String() }),
        response: { 200: Type.Array(OverrideEventDtoSchema) },
      },
    },
    async (request) => {
      const rows = await overrides.listForCase(request.params.id);
      return rows.map(OverrideService.toDto);
    },
  );

  app.get<{ Querystring: { from?: string; to?: string } }>(
    '/overrides/review',
    {
      preHandler: app.requireStaff(['SUPERVISOR', 'ADMIN', 'AUDITOR']),
      schema: {
        tags: ['override'],
        summary:
          'Weekly override review export for the Safeguarding Ops Committee: counts by ground plus every entry in the window.',
        security: [{ bearerAuth: [] }],
        querystring: Type.Object({
          from: Type.Optional(Type.String({ format: 'date-time' })),
          to: Type.Optional(Type.String({ format: 'date-time' })),
        }),
        response: { 200: OverrideReviewExportSchema, 400: ErrorSchema },
      },
    },
    async (request) => {
      const to = request.query.to ? new Date(request.query.to) : new Date();
      const from = request.query.from
        ? new Date(request.query.from)
        : new Date(to.getTime() - DEFAULT_WINDOW_DAYS * 86_400_000);

      if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
        throw new ValidationFailedError('from/to must be valid ISO date-times');
      }
      if (from > to) {
        throw new ValidationFailedError('from must not be after to');
      }
      // Bounded so a review export can never become a full-history dump.
      if (to.getTime() - from.getTime() > MAX_WINDOW_DAYS * 86_400_000) {
        throw new ValidationFailedError(`Review window must not exceed ${MAX_WINDOW_DAYS} days`);
      }

      const rows = await overrides.listBetween(from, to);
      return {
        from: from.toISOString(),
        to: to.toISOString(),
        ...overrides.summarise(rows),
        entries: rows.map(OverrideService.toDto),
      };
    },
  );
}
