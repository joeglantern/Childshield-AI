// SAFEGUARDING INVARIANT 5 (ANONYMITY): the override module is the ONLY
// sanctioned de-anonymization path, and every use must be attributable to a
// named supervisor and permanently recorded.
//
// This file pins that contract from two directions: an architectural grep
// (nothing outside the module may write OverrideEvent rows, and the rows are
// append-only) and behavioural tests through the real HTTP surface.
// Never weaken or skip this file.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  createTestContext,
  destroyTestContext,
  resetDb,
  seedConsentVersion,
  seedStaff,
  staffToken,
  type TestContext,
} from '../helpers.js';

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const BACKEND_DIRS = [
  resolve(import.meta.dirname, '../../src'),
  resolve(import.meta.dirname, '../../../worker/src'),
  resolve(import.meta.dirname, '../../../../packages/db/src'),
];

const OVERRIDE_SERVICE = ['modules', 'override', 'service.ts'].join(sep);

describe('override module is the only de-anonymization path', () => {
  it('only override/service.ts writes OverrideEvent rows', () => {
    const offenders: string[] = [];
    for (const dir of BACKEND_DIRS) {
      for (const file of walk(dir)) {
        const content = readFileSync(file, 'utf8');
        if (/\boverrideEvent\s*\.\s*(create|createMany|update|updateMany|delete|deleteMany|upsert)\s*\(/.test(content)) {
          if (!file.endsWith(OVERRIDE_SERVICE)) offenders.push(relative(process.cwd(), file));
        }
      }
    }
    expect(
      offenders,
      `files writing OverrideEvent outside override/service.ts: ${offenders.join(', ')}`,
    ).toEqual([]);
  });

  it('OverrideEvent rows are append-only (never updated or deleted anywhere)', () => {
    const banned = /\boverrideEvent\s*\.\s*(update|updateMany|delete|deleteMany|upsert)\s*\(/;
    for (const dir of BACKEND_DIRS) {
      for (const file of walk(dir)) {
        const content = readFileSync(file, 'utf8');
        expect(banned.test(content), `${file} mutates or deletes OverrideEvent rows`).toBe(false);
      }
    }
  });

  it('the override service never writes Case.status (invariant 4)', () => {
    const content = readFileSync(resolve(import.meta.dirname, '../../src', OVERRIDE_SERVICE), 'utf8');
    expect(/\bcase\s*\.\s*update(Many)?\s*\(/.test(content)).toBe(false);
    expect(content).not.toContain('status:');
  });

  it('the override service writes an audit row', () => {
    const content = readFileSync(resolve(import.meta.dirname, '../../src', OVERRIDE_SERVICE), 'utf8');
    expect(content).toContain('appendAudit');
  });
});

describe('override HTTP contract', () => {
  let ctx: TestContext;

  const goodReason =
    'Child disclosed that the person contacting them lives in the same compound and has threatened them.';

  beforeAll(async () => {
    ctx = await createTestContext();
  });

  afterAll(async () => {
    await destroyTestContext(ctx);
  });

  beforeEach(async () => {
    await resetDb(ctx.prisma);
    await seedConsentVersion(ctx.prisma);
    ctx.publisher.published.length = 0;
  });

  async function makeCase(): Promise<string> {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/cases',
      payload: {
        reporterType: 'CHILD_SELF',
        ageBand: 'AGE_13_15',
        channel: 'WEB',
        incidentType: 'SEXTORTION',
        description: 'Test report',
        consentVersion: 'v1-en',
      },
    });
    expect(res.statusCode).toBe(201);
    const created = await ctx.prisma.case.findUnique({
      where: { caseCode: res.json().caseCode },
      select: { id: true },
    });
    return created!.id;
  }

  it('a triage officer cannot trigger an override (invariant 2: supervisors only)', async () => {
    const caseId = await makeCase();
    const officer = await seedStaff(ctx.prisma, 'TRIAGE_OFFICER');
    const res = await ctx.app.inject({
      method: 'POST',
      url: `/cases/${caseId}/override`,
      headers: { authorization: `Bearer ${staffToken(ctx.app, officer)}` },
      payload: {
        ground: 'IMMINENT_HARM',
        reason: goodReason,
        childPreNotified: true,
        imminentHarm: true,
      },
    });
    expect(res.statusCode).toBe(403);
    expect(await ctx.prisma.overrideEvent.count()).toBe(0);
  });

  it('an anonymous caller cannot trigger an override', async () => {
    const caseId = await makeCase();
    const res = await ctx.app.inject({
      method: 'POST',
      url: `/cases/${caseId}/override`,
      payload: {
        ground: 'IMMINENT_HARM',
        reason: goodReason,
        childPreNotified: true,
        imminentHarm: true,
      },
    });
    expect(res.statusCode).toBe(401);
    expect(await ctx.prisma.overrideEvent.count()).toBe(0);
  });

  it('a supervisor override records the event, timeline entry and audit row', async () => {
    const caseId = await makeCase();
    const supervisor = await seedStaff(ctx.prisma, 'SUPERVISOR');
    const res = await ctx.app.inject({
      method: 'POST',
      url: `/cases/${caseId}/override`,
      headers: { authorization: `Bearer ${staffToken(ctx.app, supervisor)}` },
      payload: {
        ground: 'IMMINENT_HARM',
        reason: goodReason,
        childPreNotified: false,
        imminentHarm: true,
      },
    });

    expect(res.statusCode).toBe(201);
    const dto = res.json();
    expect(dto.supervisorId).toBe(supervisor.id);
    expect(dto.ground).toBe('IMMINENT_HARM');
    expect(dto.imminentHarm).toBe(true);
    expect(dto.childPreNotified).toBe(false);

    const events = await ctx.prisma.caseEvent.findMany({ where: { caseId, kind: 'OVERRIDE_TRIGGERED' } });
    expect(events).toHaveLength(1);

    const audits = await ctx.prisma.auditLog.findMany({ where: { action: 'override.trigger' } });
    expect(audits).toHaveLength(1);
    expect(audits[0]!.entityType).toBe('OverrideEvent');
    expect(audits[0]!.actorId).toBe(supervisor.id);
  });

  it('an override never changes case status (invariant 4)', async () => {
    const caseId = await makeCase();
    const before = await ctx.prisma.case.findUnique({ where: { id: caseId } });
    const supervisor = await seedStaff(ctx.prisma, 'SUPERVISOR');

    await ctx.app.inject({
      method: 'POST',
      url: `/cases/${caseId}/override`,
      headers: { authorization: `Bearer ${staffToken(ctx.app, supervisor)}` },
      payload: {
        ground: 'ONGOING_ABUSE',
        reason: goodReason,
        childPreNotified: true,
        imminentHarm: false,
      },
    });

    const after = await ctx.prisma.case.findUnique({ where: { id: caseId } });
    expect(after!.status).toBe(before!.status);
  });

  it('rejects a justification that is too short, or only whitespace padding', async () => {
    const caseId = await makeCase();
    const supervisor = await seedStaff(ctx.prisma, 'SUPERVISOR');
    const token = staffToken(ctx.app, supervisor);

    const short = await ctx.app.inject({
      method: 'POST',
      url: `/cases/${caseId}/override`,
      headers: { authorization: `Bearer ${token}` },
      payload: { ground: 'IMMINENT_HARM', reason: 'urgent', childPreNotified: true, imminentHarm: true },
    });
    expect(short.statusCode).toBe(400);

    const padded = await ctx.app.inject({
      method: 'POST',
      url: `/cases/${caseId}/override`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        ground: 'IMMINENT_HARM',
        reason: `urgent${' '.repeat(80)}`,
        childPreNotified: true,
        imminentHarm: true,
      },
    });
    expect(padded.statusCode).toBe(400);

    expect(await ctx.prisma.overrideEvent.count()).toBe(0);
  });

  it('alerts the supervisor channel without leaking the justification (invariants 6+7)', async () => {
    const caseId = await makeCase();
    const supervisor = await seedStaff(ctx.prisma, 'SUPERVISOR');
    ctx.publisher.published.length = 0;

    await ctx.app.inject({
      method: 'POST',
      url: `/cases/${caseId}/override`,
      headers: { authorization: `Bearer ${staffToken(ctx.app, supervisor)}` },
      payload: {
        ground: 'LEGAL_ORDER',
        reason: goodReason,
        childPreNotified: true,
        imminentHarm: false,
      },
    });

    const published = ctx.publisher.published.filter((p) => p.envelope.event === 'override.triggered');
    expect(published).toHaveLength(1);
    expect(published[0]!.rooms).toContain('supervisor');

    const serialized = JSON.stringify(published[0]!.envelope);
    expect(serialized).not.toContain(goodReason);
    expect(serialized).not.toContain('compound');
  });

  it('the review export summarises the window and is bounded', async () => {
    const caseId = await makeCase();
    const supervisor = await seedStaff(ctx.prisma, 'SUPERVISOR');
    const token = staffToken(ctx.app, supervisor);

    for (const ground of ['IMMINENT_HARM', 'ONGOING_ABUSE', 'IMMINENT_HARM'] as const) {
      await ctx.app.inject({
        method: 'POST',
        url: `/cases/${caseId}/override`,
        headers: { authorization: `Bearer ${token}` },
        payload: {
          ground,
          reason: goodReason,
          childPreNotified: ground === 'ONGOING_ABUSE',
          imminentHarm: ground === 'IMMINENT_HARM',
        },
      });
    }

    const res = await ctx.app.inject({
      method: 'GET',
      url: '/overrides/review',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.total).toBe(3);
    expect(body.byGround.IMMINENT_HARM).toBe(2);
    expect(body.byGround.ONGOING_ABUSE).toBe(1);
    expect(body.imminentHarmCount).toBe(2);
    expect(body.childPreNotifiedCount).toBe(1);
    expect(body.entries).toHaveLength(3);

    // A review export must never become a full-history dump.
    const tooWide = await ctx.app.inject({
      method: 'GET',
      url: '/overrides/review?from=2000-01-01T00:00:00.000Z&to=2030-01-01T00:00:00.000Z',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(tooWide.statusCode).toBe(400);
  });
});
