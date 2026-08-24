// SAFEGUARDING INVARIANT 4 (STATE MACHINE): transitionCase() is the ONLY
// writer of Case.status. This architectural grep test fails if any other
// file updates Case rows with a status field, or if anything calls
// case.updateMany at all.
// Never weaken or skip this file.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const REPO_BACKEND_DIRS = [
  resolve(import.meta.dirname, '../../src'),
  resolve(import.meta.dirname, '../../../worker/src'),
  resolve(import.meta.dirname, '../../../../packages/db/src'),
];

const ALLOWED_STATUS_WRITER = ['modules', 'cases', 'service.ts'].join(sep);

describe('transitionCase is the only status writer', () => {
  it('only cases/service.ts calls case.update, and only via transitionCase', () => {
    const offenders: string[] = [];
    for (const dir of REPO_BACKEND_DIRS) {
      for (const file of walk(dir)) {
        const content = readFileSync(file, 'utf8');
        if (/\bcase\s*\.\s*update(Many)?\s*\(/.test(content)) {
          if (!file.endsWith(ALLOWED_STATUS_WRITER)) offenders.push(relative(process.cwd(), file));
        }
        // updateMany bypasses per-row guards — banned everywhere.
        expect(/\bcase\s*\.\s*updateMany\s*\(/.test(content), `${file} uses case.updateMany`).toBe(false);
      }
    }
    expect(offenders, `files writing Case outside cases/service.ts: ${offenders.join(', ')}`).toEqual([]);
  });

  it('cases/service.ts guards every status write with the transition map', () => {
    const serviceFile = resolve(import.meta.dirname, '../../src/modules/cases/service.ts');
    const content = readFileSync(serviceFile, 'utf8');
    expect(content).toContain('isTransitionAllowed');
    expect(content).toContain('InvalidTransitionError');
    // Exactly one update call writes status, inside transitionCase.
    const statusWrites = content.match(/data:\s*\{\s*status:/g) ?? [];
    expect(statusWrites).toHaveLength(1);
  });

  it('no raw SQL updates Case.status in backend source', () => {
    const banned = /UPDATE\s+"?Case"?\s+SET\s+"?status/i;
    for (const dir of REPO_BACKEND_DIRS) {
      for (const file of walk(dir)) {
        const content = readFileSync(file, 'utf8');
        expect(banned.test(content), `${file} sets Case.status via raw SQL`).toBe(false);
      }
    }
  });
});
