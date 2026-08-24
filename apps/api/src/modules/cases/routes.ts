import type { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';
import type { Case, CaseEvent } from '@childshield/db';
import {
  CaseDetailDtoSchema,
  CaseEventDtoSchema,
  CasePublicStatusDtoSchema,
  CaseStatusSchema,
  CaseSummaryDtoSchema,
  CreateCaseResponseSchema,
  IntakeDtoSchema,
  NoteRequestSchema,
  SeveritySchema,
  TransitionRequestSchema,
  type CaseDetailDto,
  type CaseStatus,
  type CaseSummaryDto,
  type IntakeDto,
  type NoteRequest,
  type Severity,
  type TransitionRequest,
} from '@childshield/shared';
import { NotFoundError } from '../../lib/errors.js';
import type { CasesService } from './service.js';

const ErrorSchema = Type.Object({ code: Type.String(), message: Type.String() });

function toSummary(c: Case): CaseSummaryDto {
  return {
    id: c.id,
    caseCode: c.caseCode,
    status: c.status as CaseStatus,
    severity: (c.severity as Severity | null) ?? null,
    channel: c.channel,
    incidentType: c.incidentType,
    county: c.county,
    ageBand: c.ageBand,
    reporterType: c.reporterType,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

function toDetail(c: Case & { events: CaseEvent[] }): CaseDetailDto {
  return {
    ...toSummary(c),
    description: c.description,
    consentVersion: c.consentVersion,
    events: c.events.map((e) => ({
      id: e.id,
      kind: e.kind,
      payload: e.payload,
      actorId: e.actorId,
      createdAt: e.createdAt.toISOString(),
    })),
  };
}

export function registerCaseRoutes(app: FastifyInstance, cases: CasesService): void {
  app.post<{ Body: IntakeDto }>(
    '/cases',
    {
      schema: {
        tags: ['cases'],
        summary: 'Anonymous case intake (zero PII required). Returns the public case code.',
        body: IntakeDtoSchema,
        response: { 201: CreateCaseResponseSchema, 400: ErrorSchema },
      },
    },
    async (request, reply) => {
      const created = await cases.createCase(request.body);
      reply.code(201);
      return {
        caseCode: created.caseCode,
        status: created.status as CaseStatus,
        createdAt: created.createdAt.toISOString(),
      };
    },
  );

  app.get<{ Querystring: { status?: CaseStatus; severity?: Severity } }>(
    '/cases',
    {
      preHandler: app.requireStaff(),
      schema: {
        tags: ['cases'],
        summary: 'Triage queue listing (staff only), severity-sorted',
        security: [{ bearerAuth: [] }],
        querystring: Type.Object({
          status: Type.Optional(CaseStatusSchema),
          severity: Type.Optional(SeveritySchema),
        }),
        response: { 200: Type.Array(CaseSummaryDtoSchema) },
      },
    },
    async (request) => {
      const rows = await cases.listCases(request.query);
      return rows.map(toSummary);
    },
  );

  app.get<{ Params: { id: string } }>(
    '/cases/:id',
    {
      preHandler: app.requireStaff(),
      schema: {
        tags: ['cases'],
        summary: 'Case detail with full event timeline (staff only)',
        security: [{ bearerAuth: [] }],
        params: Type.Object({ id: Type.String() }),
        response: { 200: CaseDetailDtoSchema, 404: ErrorSchema },
      },
    },
    async (request) => {
      const row = await cases.getCase(request.params.id);
      if (!row) throw new NotFoundError('Case not found');
      return toDetail(row);
    },
  );

  app.post<{ Params: { id: string }; Body: TransitionRequest }>(
    '/cases/:id/transition',
    {
      preHandler: app.requireStaff(['TRIAGE_OFFICER', 'SUPERVISOR', 'DCS_LIAISON', 'ADMIN']),
      schema: {
        tags: ['cases'],
        summary: 'Transition a case through the guarded state machine (the only status writer)',
        security: [{ bearerAuth: [] }],
        params: Type.Object({ id: Type.String() }),
        body: TransitionRequestSchema,
        response: { 200: CaseSummaryDtoSchema, 404: ErrorSchema, 409: ErrorSchema },
      },
    },
    async (request) => {
      const staff = request.staff;
      if (!staff) throw new Error('unreachable: requireStaff guarantees staff');
      const updated = await cases.transitionCase(
        request.params.id,
        request.body.toStatus,
        staff,
        request.body.note,
      );
      return toSummary(updated);
    },
  );

  app.post<{ Params: { id: string }; Body: NoteRequest }>(
    '/cases/:id/notes',
    {
      preHandler: app.requireStaff(['TRIAGE_OFFICER', 'SUPERVISOR', 'DCS_LIAISON', 'ADMIN']),
      schema: {
        tags: ['cases'],
        summary: 'Add an officer note to a case (text only, audited, appears on the timeline)',
        security: [{ bearerAuth: [] }],
        params: Type.Object({ id: Type.String() }),
        body: NoteRequestSchema,
        response: { 201: CaseEventDtoSchema, 404: ErrorSchema },
      },
    },
    async (request, reply) => {
      const staff = request.staff;
      if (!staff) throw new Error('unreachable: requireStaff guarantees staff');
      const event = await cases.addNote(
        request.params.id,
        staff,
        request.body.text,
        request.body.tag,
      );
      reply.code(201);
      return {
        id: event.id,
        kind: event.kind,
        payload: event.payload,
        actorId: event.actorId,
        createdAt: event.createdAt.toISOString(),
      };
    },
  );

  app.get<{ Params: { caseCode: string } }>(
    '/case-status/:caseCode',
    {
      schema: {
        tags: ['cases'],
        summary:
          'Public status check by case code (child-facing). Returns status + createdAt only — no content.',
        params: Type.Object({ caseCode: Type.String({ maxLength: 20 }) }),
        response: { 200: CasePublicStatusDtoSchema, 404: ErrorSchema },
      },
    },
    async (request) => {
      const row = await cases.getByCaseCode(request.params.caseCode.toUpperCase());
      if (!row) throw new NotFoundError('No case with that code');
      return {
        caseCode: row.caseCode,
        status: row.status as CaseStatus,
        createdAt: row.createdAt.toISOString(),
      };
    },
  );
}
