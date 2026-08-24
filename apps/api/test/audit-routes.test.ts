import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { IntakeDto } from '@childshield/shared';
import {
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
  incidentType: 'BULLYING',
  description: 'Someone is bothering me online.',
  consentVersion: 'v1-en',
};

describe('GET /audit', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestContext();
  });

  afterAll(async () => {
    await destroyTestContext(ctx);
  });

  beforeEach(async () => {
    await resetDb(ctx.prisma);
    await seedConsentVersion(ctx.prisma);
  });

  it('rejects unauthenticated requests', async () => {
    const res = await ctx.app.inject({ method: 'GET', url: '/audit' });
    expect(res.statusCode).toBe(401);
  });

  it('rejects officers (least-privilege — only AUDITOR/SUPERVISOR/ADMIN)', async () => {
    const officer = await seedStaff(ctx.prisma, 'TRIAGE_OFFICER');
    const res = await ctx.app.inject({
      method: 'GET',
      url: '/audit',
      headers: { authorization: `Bearer ${staffToken(ctx.app, officer)}` },
    });
    expect(res.statusCode).toBe(403);
  });

  it('lists entries with resolved actor/entity labels and a valid chain', async () => {
    const auditor = await seedStaff(ctx.prisma, 'AUDITOR');
    const officer = await seedStaff(ctx.prisma, 'TRIAGE_OFFICER');

    const created = await ctx.app.inject({ method: 'POST', url: '/cases', payload: intake });
    const caseCode = (created.json() as { caseCode: string }).caseCode;

    const res = await ctx.app.inject({
      method: 'GET',
      url: '/audit',
      headers: { authorization: `Bearer ${staffToken(ctx.app, auditor)}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { entries: Array<Record<string, unknown>>; chainValid: boolean };

    expect(body.chainValid).toBe(true);
    expect(body.entries.length).toBeGreaterThan(0);
    const caseCreateEntry = body.entries.find((e) => e.action === 'case.create');
    expect(caseCreateEntry).toBeDefined();
    expect(caseCreateEntry?.entityLabel).toBe(caseCode);
    // Anonymous intake never resolves an actor name.
    expect(caseCreateEntry?.actorDisplayName).toBeNull();

    // Response never leaks the internal seq ordering column.
    for (const entry of body.entries) {
      expect(Object.keys(entry)).not.toContain('seq');
    }

    void officer;
  });

  it('flags the chain as invalid after tampering', async () => {
    const auditor = await seedStaff(ctx.prisma, 'AUDITOR');
    await ctx.app.inject({ method: 'POST', url: '/cases', payload: intake });

    const row = await ctx.prisma.auditLog.findFirst({ orderBy: { seq: 'asc' } });
    await ctx.prisma.$executeRawUnsafe(
      `UPDATE "AuditLog" SET "action" = 'tampered' WHERE "seq" = ${row?.seq}`,
    );

    const res = await ctx.app.inject({
      method: 'GET',
      url: '/audit',
      headers: { authorization: `Bearer ${staffToken(ctx.app, auditor)}` },
    });
    expect((res.json() as { chainValid: boolean }).chainValid).toBe(false);
  });

  it('paginates with the before cursor', async () => {
    const auditor = await seedStaff(ctx.prisma, 'AUDITOR');
    for (let i = 0; i < 3; i += 1) {
      await ctx.app.inject({ method: 'POST', url: '/cases', payload: intake });
    }

    const first = await ctx.app.inject({
      method: 'GET',
      url: '/audit?limit=2',
      headers: { authorization: `Bearer ${staffToken(ctx.app, auditor)}` },
    });
    const firstBody = first.json() as { entries: Array<{ id: string }> };
    expect(firstBody.entries).toHaveLength(2);

    const second = await ctx.app.inject({
      method: 'GET',
      url: `/audit?limit=2&before=${firstBody.entries[1]?.id}`,
      headers: { authorization: `Bearer ${staffToken(ctx.app, auditor)}` },
    });
    const secondBody = second.json() as { entries: Array<{ id: string }> };
    const firstIds = new Set(firstBody.entries.map((e) => e.id));
    for (const entry of secondBody.entries) {
      expect(firstIds.has(entry.id)).toBe(false);
    }
  });
});
