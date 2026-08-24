import { execSync } from 'node:child_process';
import { resolve } from 'node:path';
import { testDatabaseUrl } from './test-db.js';

/// Pushes the Prisma schema into the dedicated *_test database before the
/// suite runs. Requires Postgres (docker compose -f docker-compose.dev.yml
/// up -d postgres).
export default function globalSetup(): void {
  const dbPackageDir = resolve(import.meta.dirname, '../../../packages/db');
  execSync('pnpm exec prisma db push --skip-generate --accept-data-loss', {
    cwd: dbPackageDir,
    env: { ...process.env, DATABASE_URL: testDatabaseUrl() },
    stdio: 'inherit',
  });
}
