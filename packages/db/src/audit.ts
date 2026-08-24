// SAFEGUARDING INVARIANT 3 (AUDIT): append-only, hash-chained audit log.
// This service exposes append + verify ONLY. There is deliberately no
// update, delete, or upsert — test/safeguarding/audit-append-only.test.ts
// fails the build if one appears.

import type { Prisma, PrismaClient } from '@prisma/client';
import { canonicalJson, hashEntity, sha256Hex } from './canonical.js';

export const GENESIS_HASH = 'GENESIS';

/// Postgres advisory lock key serializing chain appends across connections.
const AUDIT_CHAIN_LOCK_KEY = 424242;

export interface AuditEntryInput {
  actorId: string | null;
  /// 'staff' | 'anonymous' | 'system'
  actorType: string;
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
}

export type TxClient = Prisma.TransactionClient;

function computeEntryHash(prevHash: string, entry: {
  actorId: string | null;
  actorType: string;
  action: string;
  entityType: string;
  entityId: string;
  beforeHash: string | null;
  afterHash: string | null;
}): string {
  return sha256Hex(`${prevHash}\n${canonicalJson(entry)}`);
}

/// Appends a hash-chained AuditLog row INSIDE the caller's transaction, so a
/// mutation and its audit entry commit or roll back together.
export async function appendAudit(tx: TxClient, input: AuditEntryInput): Promise<void> {
  // Serialize appenders so the chain never forks under concurrency.
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${AUDIT_CHAIN_LOCK_KEY})`;

  const head = await tx.auditLog.findFirst({
    orderBy: { seq: 'desc' },
    select: { entryHash: true },
  });
  const prevHash = head?.entryHash ?? GENESIS_HASH;

  const beforeHash = input.before === undefined ? null : hashEntity(input.before);
  const afterHash = input.after === undefined ? null : hashEntity(input.after);

  const record = {
    actorId: input.actorId,
    actorType: input.actorType,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    beforeHash,
    afterHash,
  };

  await tx.auditLog.create({
    data: {
      ...record,
      prevHash,
      entryHash: computeEntryHash(prevHash, record),
    },
  });
}

export interface ChainVerification {
  valid: boolean;
  checked: number;
  /// seq of the first row whose hash linkage fails, if any.
  brokenSeq?: number;
  reason?: string;
}

/// Re-walks the whole chain recomputing every entryHash. Any tampered,
/// deleted, or reordered row breaks verification.
export async function verifyChain(prisma: PrismaClient | TxClient): Promise<ChainVerification> {
  const rows = await prisma.auditLog.findMany({ orderBy: { seq: 'asc' } });
  let prevHash = GENESIS_HASH;
  let checked = 0;

  for (const row of rows) {
    if (row.prevHash !== prevHash) {
      return {
        valid: false,
        checked,
        brokenSeq: row.seq,
        reason: `prevHash mismatch at seq ${row.seq}`,
      };
    }
    const expected = computeEntryHash(prevHash, {
      actorId: row.actorId,
      actorType: row.actorType,
      action: row.action,
      entityType: row.entityType,
      entityId: row.entityId,
      beforeHash: row.beforeHash,
      afterHash: row.afterHash,
    });
    if (row.entryHash !== expected) {
      return {
        valid: false,
        checked,
        brokenSeq: row.seq,
        reason: `entryHash mismatch at seq ${row.seq} (row contents were altered)`,
      };
    }
    prevHash = row.entryHash;
    checked += 1;
  }

  return { valid: true, checked };
}
