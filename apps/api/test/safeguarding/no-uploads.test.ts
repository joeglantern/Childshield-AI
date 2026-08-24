// SAFEGUARDING INVARIANT 1 (ZERO-CONTENT): the system never accepts media.
// No multipart/upload capability may exist anywhere in the API.
// Never weaken or skip this file.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { testEnv } from '../helpers.js';

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

describe('zero-content: no upload capability', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp({ env: testEnv(), enableRealtime: false });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('the server has no multipart content-type parser', () => {
    expect(app.hasContentTypeParser('multipart/form-data')).toBe(false);
    expect(app.hasContentTypeParser('multipart')).toBe(false);
  });

  it('no upload/multipart dependency is installed in the api', () => {
    const pkg = JSON.parse(
      readFileSync(resolve(import.meta.dirname, '../../package.json'), 'utf8'),
    ) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
    const allDeps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
    for (const dep of allDeps) {
      expect(dep.includes('multipart'), `dependency ${dep} suggests upload capability`).toBe(false);
      expect(dep.includes('busboy'), `dependency ${dep} suggests upload capability`).toBe(false);
      expect(dep.includes('formidable'), `dependency ${dep} suggests upload capability`).toBe(false);
    }
  });

  it('no source file registers multipart handling or media download paths', () => {
    const srcDir = resolve(import.meta.dirname, '../../src');
    for (const file of walk(srcDir)) {
      const content = readFileSync(file, 'utf8').toLowerCase();
      expect(content.includes('multipart'), `${file} references multipart`).toBe(false);
      expect(content.includes('octet-stream'), `${file} references binary bodies`).toBe(false);
    }
  });
});
