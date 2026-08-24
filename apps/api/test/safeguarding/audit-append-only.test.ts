// SAFEGUARDING INVARIANT 3 (AUDIT): the audit log is append-only. No service
// method may update, delete, or upsert AuditLog rows, and no code anywhere in
// the backend may call prisma.auditLog.update/delete/upsert.
// Never weaken or skip this file.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import * as auditModule from '../../src/modules/audit/index.js';

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const BACKEND_SRC_DIRS = [
  resolve(import.meta.dirname, '../../src'),
  resolve(import.meta.dirname, '../../../worker/src'),
  resolve(import.meta.dirname, '../../../../packages/db/src'),
];

describe('audit log is append-only', () => {
  it('the audit module exports no mutating method besides append', () => {
    const exportNames = Object.keys(auditModule);
    expect(exportNames.sort()).toEqual(['GENESIS_HASH', 'appendAudit', 'verifyChain']);
    for (const name of exportNames) {
      expect(/update|delete|upsert|remove|edit/i.test(name)).toBe(false);
    }
  });

  it('no backend source calls auditLog.update/delete/upsert/deleteMany/updateMany', () => {
    const banned = /auditLog\s*\.\s*(update|delete|upsert|updateMany|deleteMany)/;
    for (const dir of BACKEND_SRC_DIRS) {
      for (const file of walk(dir)) {
        const content = readFileSync(file, 'utf8');
        expect(banned.test(content), `${file} mutates AuditLog`).toBe(false);
      }
    }
  });

  it('no raw SQL in backend source touches AuditLog destructively', () => {
    const banned = /(UPDATE|DELETE FROM|TRUNCATE)\s+"?AuditLog/i;
    for (const dir of BACKEND_SRC_DIRS) {
      for (const file of walk(dir)) {
        const content = readFileSync(file, 'utf8');
        expect(banned.test(content), `${file} contains destructive AuditLog SQL`).toBe(false);
      }
    }
  });
});
