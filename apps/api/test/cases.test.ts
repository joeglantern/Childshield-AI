import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { IntakeDto } from '@childshield/shared';
import { CasesService } from '../src/modules/cases/index.js';
import { InvalidTransitionError } from '../src/lib/errors.js';
import {
  CapturingPublisher,
  CapturingSla,
  CapturingTriage,
  createTestContext,
  destroyTestContext,
  resetDb,
  seedConsentVersion,
  seedStaff,
  staffToken,
  type TestContext,
} from './helpers.js';

const intake: IntakeDto = {
  reporterType: 'CHILD_SELF',
  ageBand: 'AGE_13_15',
  channel: 'WEB',
  incidentType: 'SEXTORTION',
  description: 'Someone is threatening to share my photos unless I pay.',
  county: 'Nairobi',
  consentVersion: 'v1-en',
};

describe('cases module', () => {
  let ctx: TestContext;
  let service: CasesService;
  let publisher: CapturingPublisher;
  let sla: CapturingSla;
  let triage: CapturingTriage;

  beforeAll(async () => {
    ctx = await createTestContext();
  });

  afterAll(async () => {
    await destroyTestContext(ctx);
  });

  beforeEach(async () => {
    await resetDb(ctx.prisma);
    await seedConsentVersion(ctx.prisma);
    publisher = new CapturingPublisher();
    sla = new CapturingSla();
    triage = new CapturingTriage();
    service = new CasesService({ prisma: ctx.prisma, publisher, sla, triage, slaDefaultMinutes: 60 });
  });

  describe('createCase', () => {
    it('creates an anonymous case with zero PII', async () => {
      const created = await service.createCase(intake);

      expect(created.status).toBe('RECEIVED');
      expect(created.caseCode).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
      expect(created.severity).toBeNull();

      // The Case row holds no PII columns at all — verify the shape.
      const columns = Object.keys(created);
      for (const pii of ['name', 'phone', 'email', 'address', 'school', 'guardian']) {
        expect(columns.some((c) => c.toLowerCase().includes(pii))).toBe(false);
      }
    });

    it('writes CASE_CREATED event, consent record, and audit row in one transaction', async () => {
      const created = await service.createCase(intake);

      const events = await ctx.prisma.caseEvent.findMany({ where: { caseId: created.id } });
      expect(events.map((e) => e.kind)).toEqual(['CASE_CREATED']);

      const consents = await ctx.prisma.consentRecord.findMany({ where: { caseId: created.id } });
      expect(consents).toHaveLength(1);

      const audits = await ctx.prisma.auditLog.findMany({ where: { entityId: created.id } });
      expect(audits).toHaveLength(1);
      expect(audits[0]?.action).toBe('case.create');
      expect(audits[0]?.actorType).toBe('anonymous');
      expect(audits[0]?.actorId).toBeNull();
    });

    it('publishes case.created to the queue room and schedules the SLA clock', async () => {
      const created = await service.createCase(intake);

      expect(publisher.published).toHaveLength(1);
      const p = publisher.published[0];
      expect(p?.rooms).toEqual(['queue']);
      expect(p?.envelope.event).toBe('case.created');
      expect(p?.envelope.payload).toMatchObject({ caseId: created.id, status: 'RECEIVED' });
      // No report content in WS frames — ever.
      expect(JSON.stringify(p?.envelope)).not.toContain(intake.description.slice(0, 20));

      expect(sla.scheduled).toEqual([{ caseId: created.id, delayMs: 60 * 60_000 }]);
      // Advisory ML assessment is enqueued — never anything more (invariant 2).
      expect(triage.enqueued).toEqual([created.id]);
    });

    it('stores media hashes (hash + algorithm + metadata only)', async () => {
      const created = await service.createCase({
        ...intake,
        mediaHashes: [{ hash: 'a'.repeat(64), algorithm: 'SHA256', metadata: { platform: 'whatsapp' } }],
      });

      const hashes = await ctx.prisma.mediaHash.findMany({ where: { caseId: created.id } });
      expect(hashes).toHaveLength(1);
      expect(hashes[0]?.algorithm).toBe('SHA256');
      // Model shape check: no storage-reference columns exist.
      const columns = Object.keys(hashes[0] ?? {});
      // 'metadata' is the one allowed non-content column; storage-reference
      // and payload column names are banned.
      for (const banned of ['url', 'path', 'bucket', 'storage', 'content', 'blob', 'binary', 'file']) {
        expect(columns.some((c) => c.toLowerCase().includes(banned))).toBe(false);
      }
    });

    it('rejects an unknown consent version', async () => {
      await expect(service.createCase({ ...intake, consentVersion: 'nope' })).rejects.toThrow(
        /consent version/i,
      );
    });
  });

  describe('transitionCase', () => {
    it('walks the full legal lifecycle', async () => {
      const officer = await seedStaff(ctx.prisma);
      const created = await service.createCase(intake);

      const path = [
        'TRIAGED',
        'UNDER_REVIEW',
        'REFERRED',
        'IN_PROGRESS',
        'CLOSED',
        'REOPENED',
        'UNDER_REVIEW',
      ] as const;

      for (const to of path) {
        const updated = await service.transitionCase(created.id, to, officer, 'test note');
        expect(updated.status).toBe(to);
      }
    });

    it('rejects every illegal transition from every status', async () => {
      const officer = await seedStaff(ctx.prisma);
      const { ALLOWED_TRANSITIONS, CASE_STATUSES } = await import('@childshield/shared');

      for (const from of CASE_STATUSES) {
        for (const to of CASE_STATUSES) {
          if (ALLOWED_TRANSITIONS[from].includes(to)) continue;
          const created = await service.createCase(intake);
          // Force the starting status directly for test setup only.
          await ctx.prisma.$executeRawUnsafe(
            `UPDATE "Case" SET "status" = '${from}' WHERE "id" = '${created.id}'`,
          );
          await expect(service.transitionCase(created.id, to, officer)).rejects.toThrow(
            InvalidTransitionError,
          );
          const after = await ctx.prisma.case.findUnique({ where: { id: created.id } });
          expect(after?.status).toBe(from);
        }
      }
    });

    it('writes STATUS_CHANGED event and audit row with before/after', async () => {
      const officer = await seedStaff(ctx.prisma);
      const created = await service.createCase(intake);
      await service.transitionCase(created.id, 'TRIAGED', officer, 'looks like sextortion');

      const events = await ctx.prisma.caseEvent.findMany({
        where: { caseId: created.id, kind: 'STATUS_CHANGED' },
      });
      expect(events).toHaveLength(1);
      expect(events[0]?.actorId).toBe(officer.id);
      expect(events[0]?.payload).toMatchObject({ from: 'RECEIVED', to: 'TRIAGED' });

      const audits = await ctx.prisma.auditLog.findMany({
        where: { entityId: created.id, action: 'case.transition' },
      });
      expect(audits).toHaveLength(1);
      expect(audits[0]?.actorId).toBe(officer.id);
      expect(audits[0]?.beforeHash).toBeTruthy();
      expect(audits[0]?.afterHash).toBeTruthy();
    });

    it('publishes case.transitioned to queue + case room', async () => {
      const officer = await seedStaff(ctx.prisma);
      const created = await service.createCase(intake);
      publisher.published.length = 0;

      await service.transitionCase(created.id, 'TRIAGED', officer);

      expect(publisher.published).toHaveLength(1);
      const p = publisher.published[0];
      expect(p?.rooms).toEqual(['queue', `case:${created.id}`]);
      expect(p?.envelope.event).toBe('case.transitioned');
      expect(p?.envelope.payload).toMatchObject({ from: 'RECEIVED', to: 'TRIAGED', actorId: officer.id });
    });

    it('failed transition leaves no audit row behind (transactional)', async () => {
      const officer = await seedStaff(ctx.prisma);
      const created = await service.createCase(intake);
      const before = await ctx.prisma.auditLog.count();

      await expect(service.transitionCase(created.id, 'CLOSED', officer)).rejects.toThrow(
        InvalidTransitionError,
      );

      expect(await ctx.prisma.auditLog.count()).toBe(before);
    });
  });

  describe('addNote', () => {
    it('writes NOTE_ADDED event and an audit row transactionally', async () => {
      const officer = await seedStaff(ctx.prisma);
      const created = await service.createCase(intake);

      const event = await service.addNote(created.id, officer, 'Nimewasiliana na Childline.', 'Uchunguzi');
      expect(event.kind).toBe('NOTE_ADDED');
      expect(event.payload).toMatchObject({ tag: 'Uchunguzi', text: 'Nimewasiliana na Childline.' });

      const audits = await ctx.prisma.auditLog.findMany({
        where: { entityId: created.id, action: 'case.note_add' },
      });
      expect(audits).toHaveLength(1);
      expect(audits[0]?.actorId).toBe(officer.id);
    });

    it('rejects notes on unknown cases', async () => {
      const officer = await seedStaff(ctx.prisma);
      await expect(service.addNote('nope', officer, 'x')).rejects.toThrow(/not found/i);
    });
  });

  describe('routes', () => {
    it('POST /cases accepts an anonymous report and returns the case code', async () => {
      const res = await ctx.app.inject({ method: 'POST', url: '/cases', payload: intake });
      expect(res.statusCode).toBe(201);
      const body = res.json() as Record<string, unknown>;
      expect(body.caseCode).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
      expect(body.status).toBe('RECEIVED');
    });

    it('GET /case-status/:caseCode returns status + createdAt only', async () => {
      const created = await service.createCase(intake);
      const res = await ctx.app.inject({ method: 'GET', url: `/case-status/${created.caseCode}` });
      expect(res.statusCode).toBe(200);
      const body = res.json() as Record<string, unknown>;
      expect(Object.keys(body).sort()).toEqual(['caseCode', 'createdAt', 'status']);
    });

    it('staff routes reject unauthenticated requests', async () => {
      for (const [method, url] of [
        ['GET', '/cases'],
        ['GET', '/cases/some-id'],
        ['POST', '/cases/some-id/transition'],
        ['POST', '/cases/some-id/notes'],
        ['POST', '/ws/ticket'],
      ] as const) {
        const res = await ctx.app.inject({
          method,
          url,
          ...(method === 'POST'
            ? { payload: url.endsWith('/notes') ? { text: 'x' } : { toStatus: 'TRIAGED' } }
            : {}),
        });
        expect(res.statusCode, `${method} ${url}`).toBe(401);
      }
    });

    it('POST /cases/:id/transition works with an officer token and rejects AUDITOR', async () => {
      const officer = await seedStaff(ctx.prisma, 'TRIAGE_OFFICER');
      const auditor = await seedStaff(ctx.prisma, 'AUDITOR', 'auditor@test.local');
      const created = await service.createCase(intake);

      const ok = await ctx.app.inject({
        method: 'POST',
        url: `/cases/${created.id}/transition`,
        headers: { authorization: `Bearer ${staffToken(ctx.app, officer)}` },
        payload: { toStatus: 'TRIAGED', note: 'picking this up' },
      });
      expect(ok.statusCode).toBe(200);
      expect((ok.json() as Record<string, unknown>).status).toBe('TRIAGED');

      const denied = await ctx.app.inject({
        method: 'POST',
        url: `/cases/${created.id}/transition`,
        headers: { authorization: `Bearer ${staffToken(ctx.app, auditor)}` },
        payload: { toStatus: 'UNDER_REVIEW' },
      });
      expect(denied.statusCode).toBe(403);
    });

    it('invalid transitions surface as 409 with a typed code', async () => {
      const officer = await seedStaff(ctx.prisma);
      const created = await service.createCase(intake);

      const res = await ctx.app.inject({
        method: 'POST',
        url: `/cases/${created.id}/transition`,
        headers: { authorization: `Bearer ${staffToken(ctx.app, officer)}` },
        payload: { toStatus: 'CLOSED' },
      });
      expect(res.statusCode).toBe(409);
      expect((res.json() as Record<string, unknown>).code).toBe('INVALID_TRANSITION');
    });
  });
});
