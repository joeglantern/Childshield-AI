// Generates docs/openapi/openapi.json from the real route table.
// Builds the app without connecting to Postgres/Redis.

import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildApp } from '../src/app.js';
import { loadEnv } from '../src/env.js';

const env = loadEnv({ ...process.env, NODE_ENV: 'test' });
const app = await buildApp({ env, enableRealtime: false });
await app.ready();

const spec = app.swagger();
const outDir = resolve(import.meta.dirname, '../../../docs/openapi');
mkdirSync(outDir, { recursive: true });
const outFile = resolve(outDir, 'openapi.json');
writeFileSync(outFile, JSON.stringify(spec, null, 2), 'utf8');

app.log.info(`OpenAPI spec written to ${outFile}`);
await app.close();
