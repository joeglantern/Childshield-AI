/// Resolves the Postgres URL tests run against. Only ever a *_test database —
/// if DATABASE_URL points anywhere else it is ignored, so `pnpm test` can
/// never truncate a dev/prod database.
export function testDatabaseUrl(): string {
  const fromEnv = process.env.DATABASE_URL;
  if (fromEnv && /_test(\?|$)/.test(fromEnv)) return fromEnv;
  return 'postgresql://childshield:childshield@localhost:5433/childshield_test?schema=public';
}
