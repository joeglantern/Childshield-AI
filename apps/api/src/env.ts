import { Type, type Static } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';

const EnvSchema = Type.Object({
  NODE_ENV: Type.Union(
    [Type.Literal('development'), Type.Literal('test'), Type.Literal('production')],
    { default: 'development' },
  ),
  PORT: Type.Number({ default: 3000 }),
  API_BASE_URL: Type.String({ default: 'http://localhost:3000' }),
  DATABASE_URL: Type.String({
    default: 'postgresql://childshield:childshield@localhost:5433/childshield?schema=public',
  }),
  REDIS_URL: Type.String({ default: 'redis://localhost:6379' }),
  JWT_ACCESS_SECRET: Type.String({ default: 'dev-only-access-secret-change-me!!' }),
  JWT_REFRESH_SECRET: Type.String({ default: 'dev-only-refresh-secret-change-me!' }),
  JWT_ACCESS_TTL: Type.String({ default: '15m' }),
  JWT_REFRESH_TTL: Type.String({ default: '7d' }),
  WS_TICKET_TTL: Type.Number({ default: 30 }),
  SLA_MINUTES_LOW: Type.Number({ default: 1440 }),
  SLA_MINUTES_MEDIUM: Type.Number({ default: 240 }),
  SLA_MINUTES_HIGH: Type.Number({ default: 60 }),
  SLA_MINUTES_CRITICAL: Type.Number({ default: 15 }),
  SENTRY_DSN: Type.String({ default: '' }),
  LOG_LEVEL: Type.String({ default: 'info' }),
  ML_SERVICE_URL: Type.String({ default: 'http://localhost:8000' }),
  ML_SERVICE_API_KEY: Type.String({ default: '' }),
});

export type Env = Static<typeof EnvSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const candidate: Record<string, unknown> = {};
  for (const key of Object.keys(EnvSchema.properties)) {
    if (source[key] !== undefined && source[key] !== '') candidate[key] = source[key];
  }
  const converted = Value.Convert(EnvSchema, Value.Default(EnvSchema, candidate));
  if (!Value.Check(EnvSchema, converted)) {
    const first = Value.Errors(EnvSchema, converted).First();
    throw new Error(`Invalid environment: ${first?.path ?? ''} ${first?.message ?? ''}`);
  }
  if (converted.NODE_ENV === 'production') {
    if (converted.JWT_ACCESS_SECRET.startsWith('dev-only') || converted.JWT_REFRESH_SECRET.startsWith('dev-only')) {
      throw new Error('Refusing to start in production with default JWT secrets');
    }
  }
  return converted;
}
