import { randomUUID } from 'node:crypto';
import Fastify, { type FastifyInstance } from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import fastifyWebsocket from '@fastify/websocket';
import * as Sentry from '@sentry/node';
import { Redis } from 'ioredis';
import { createPrismaClient, type PrismaClient } from '@childshield/db';
import { loadEnv, type Env } from './env.js';
import { AppError } from './lib/errors.js';
import { BullSlaScheduler, BullTriageQueue } from './lib/sla-scheduler.js';
import { authPlugin } from './plugins/auth.js';
import { registerAuthRoutes } from './modules/auth/routes.js';
import { AuthService } from './modules/auth/service.js';
import {
  CasesService,
  registerCaseRoutes,
  type EventPublisher,
  type SlaScheduler,
  type TriageScheduler,
} from './modules/cases/index.js';
import { registerAuditRoutes } from './modules/audit/routes.js';
import { registerHealthRoutes } from './modules/health/routes.js';
import { RedisEventPublisher, WsHub } from './modules/ws/hub.js';
import { registerWsRoutes } from './modules/ws/routes.js';

export interface BuildAppOptions {
  env?: Env;
  prisma?: PrismaClient;
  publisher?: EventPublisher;
  sla?: SlaScheduler;
  triage?: TriageScheduler;
  /// Subscribe the WS hub to Redis pub/sub on ready. Off for tests/codegen
  /// so building the app never needs a live Redis.
  enableRealtime?: boolean;
}

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const env = options.env ?? loadEnv();

  const sentryEnabled = env.SENTRY_DSN !== '';
  if (sentryEnabled) {
    Sentry.init({
      dsn: env.SENTRY_DSN,
      environment: env.NODE_ENV,
      // SAFEGUARDING INVARIANT 7: scrub request bodies and PII before send.
      beforeSend(event) {
        if (event.request) {
          delete event.request.data;
          delete event.request.cookies;
          if (event.request.headers) {
            delete event.request.headers['authorization'];
            delete event.request.headers['cookie'];
          }
        }
        delete event.user;
        return event;
      },
    });
  }

  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      // SAFEGUARDING INVARIANT 7 (NO PII IN LOGS): bodies are never logged
      // (fastify default) and sensitive headers/fields are redacted.
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers.cookie',
          '*.password',
          '*.totpCode',
          '*.description',
          '*.email',
        ],
        censor: '[REDACTED]',
      },
    },
    genReqId: () => randomUUID(),
    ajv: { customOptions: { coerceTypes: true, removeAdditional: false } },
  });

  const prisma = options.prisma ?? createPrismaClient(env.DATABASE_URL);
  const redis = new Redis(env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1 });
  const subRedis = new Redis(env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1 });

  const publisher = options.publisher ?? new RedisEventPublisher(redis);
  const sla = options.sla ?? new BullSlaScheduler(env.REDIS_URL);
  const triage = options.triage ?? new BullTriageQueue(env.REDIS_URL);

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      void reply.code(error.statusCode).send({ code: error.code, message: error.message });
      return;
    }
    const fastifyError = error as {
      validation?: unknown;
      message?: string;
      statusCode?: number;
      code?: string;
    };
    if (fastifyError.validation) {
      void reply
        .code(400)
        .send({ code: 'VALIDATION_FAILED', message: fastifyError.message ?? 'Invalid request' });
      return;
    }
    // Framework 4xx errors (unsupported media type, payload too large, ...)
    // keep their status; only true 5xx collapse to a generic internal error.
    if (fastifyError.statusCode && fastifyError.statusCode < 500) {
      void reply
        .code(fastifyError.statusCode)
        .send({ code: fastifyError.code ?? 'BAD_REQUEST', message: fastifyError.message ?? 'Bad request' });
      return;
    }
    request.log.error({ err: error, reqId: request.id }, 'unhandled error');
    if (sentryEnabled) Sentry.captureException(error);
    // Never leak internals to clients.
    void reply.code(500).send({ code: 'INTERNAL', message: 'Internal server error' });
  });

  await app.register(fastifyCors, { origin: true });

  await app.register(fastifySwagger, {
    openapi: {
      openapi: '3.0.3',
      info: {
        title: 'ChildShield AI API',
        description:
          'Child online-protection intake and triage API (Kenya, Phase 1). ' +
          'Zero-content by design: no media upload endpoints exist anywhere — hashes and metadata only.',
        version: '0.1.0',
      },
      servers: [{ url: env.API_BASE_URL }],
      components: {
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        },
      },
    },
  });

  if (env.NODE_ENV !== 'production') {
    await app.register(fastifySwaggerUi, { routePrefix: '/docs' });
  }

  await app.register(fastifyWebsocket);
  await app.register(authPlugin, { env });

  const authService = new AuthService(prisma);
  const casesService = new CasesService({
    prisma,
    publisher,
    sla,
    // Untriaged cases have no severity yet — use the HIGH tier so a fresh
    // report is never left waiting on the most lenient clock.
    slaDefaultMinutes: env.SLA_MINUTES_HIGH,
    triage,
    logger: app.log,
  });
  const hub = new WsHub(subRedis, redis, app.log);

  registerHealthRoutes(app, { prisma, redis });
  registerAuthRoutes(app, authService);
  registerCaseRoutes(app, casesService);
  registerAuditRoutes(app, prisma);
  registerWsRoutes(app, { redis, hub, ticketTtlSeconds: env.WS_TICKET_TTL });

  if (options.enableRealtime) {
    app.addHook('onReady', async () => {
      await hub.start();
    });
  }

  app.addHook('onClose', async () => {
    if (!options.prisma) await prisma.$disconnect().catch(() => undefined);
    redis.disconnect();
    subRedis.disconnect();
    if (sla instanceof BullSlaScheduler) await sla.close().catch(() => undefined);
    if (triage instanceof BullTriageQueue) await triage.close().catch(() => undefined);
  });

  return app;
}
