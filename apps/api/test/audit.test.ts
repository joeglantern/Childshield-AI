import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { appendAudit, verifyChain, GENESIS_HASH } from '../src/modules/audit/index.js';
import {
  createTestContext,
  destroyTestContext,
  resetDb,
  type TestContext,
} from './helpers.js';

describe('audit chain', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestContext();
  });

  afterAll(async () => {
    await destroyTestContext(ctx);
  });

  beforeEach(async () => {
    await resetDb(ctx.prisma);
  });

  async function appendN(n: number): Promise<void> {
    for (let i = 0; i < n; i += 1) {
      await ctx.prisma.$transaction(async (tx) => {
        await appendAudit(tx, {
          actorId: null,
          actorType: 'system',
          action: `test.action.${i}`,
          entityType: 'Test',
          entityId: `entity-${i}`,
          after: { i },
        });
      });
    }
  }

  it('links each entry to the previous one', async () => {
    await appendN(3);
    const rows = await ctx.prisma.auditLog.findMany({ orderBy: { seq: 'asc' } });
    expect(rows).toHaveLength(3);
    expect(rows[0]?.prevHash).toBe(GENESIS_HASH);
    expect(rows[1]?.prevHash).toBe(rows[0]?.entryHash);
    expect(rows[2]?.prevHash).toBe(rows[1]?.entryHash);
  });

  it('verifyChain passes on an untampered chain', async () => {
    await appendN(5);
    const result = await verifyChain(ctx.prisma);
    expect(result.valid).toBe(true);
    expect(result.checked).toBe(5);
  });

  it('verifyChain passes on an empty chain', async () => {
    const result = await verifyChain(ctx.prisma);
    expect(result.valid).toBe(true);
    expect(result.checked).toBe(0);
  });

  it('detects tampering with a row payload (simulated attacker UPDATE)', async () => {
    await appendN(4);
    const rows = await ctx.prisma.auditLog.findMany({ orderBy: { seq: 'asc' } });
    const victim = rows[1];
    expect(victim).toBeDefined();

    // Tamper directly via SQL — no service method allows this.
    await ctx.prisma.$executeRawUnsafe(
      `UPDATE "AuditLog" SET "action" = 'tampered.action' WHERE "seq" = ${victim?.seq}`,
    );

    const result = await verifyChain(ctx.prisma);
    expect(result.valid).toBe(false);
    expect(result.brokenSeq).toBe(victim?.seq);
    expect(result.reason).toContain('altered');
  });

  it('detects deletion of a middle row', async () => {
    await appendN(4);
    const rows = await ctx.prisma.auditLog.findMany({ orderBy: { seq: 'asc' } });
    await ctx.prisma.$executeRawUnsafe(
      `DELETE FROM "AuditLog" WHERE "seq" = ${rows[1]?.seq}`,
    );

    const result = await verifyChain(ctx.prisma);
    expect(result.valid).toBe(false);
  });

  it('detects a rewritten hash even when contents look consistent', async () => {
    await appendN(3);
    const rows = await ctx.prisma.auditLog.findMany({ orderBy: { seq: 'asc' } });
    await ctx.prisma.$executeRawUnsafe(
      `UPDATE "AuditLog" SET "entryHash" = 'deadbeef' WHERE "seq" = ${rows[2]?.seq}`,
    );

    const result = await verifyChain(ctx.prisma);
    expect(result.valid).toBe(false);
    expect(result.brokenSeq).toBe(rows[2]?.seq);
  });
});
