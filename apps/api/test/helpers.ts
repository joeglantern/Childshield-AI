import type { FastifyInstance } from 'fastify';
import { createPrismaClient, type PrismaClient } from '@childshield/db';
import type { WsEnvelope, Role } from '@childshield/shared';
import { buildApp } from '../src/app.js';
import { loadEnv, type Env } from '../src/env.js';
import type { EventPublisher, SlaScheduler, TriageScheduler } from '../src/modules/cases/index.js';
import { testDatabaseUrl } from './test-db.js';

export interface CapturedPublish {
  rooms: string[];
  envelope: WsEnvelope;
}

export class CapturingPublisher implements EventPublisher {
  readonly published: CapturedPublish[] = [];
  async publish(rooms: string[], envelope: WsEnvelope): Promise<void> {
    this.published.push({ rooms, envelope });
  }
}

export class CapturingSla implements SlaScheduler {
  readonly scheduled: Array<{ caseId: string; delayMs: number }> = [];
  async schedule(caseId: string, delayMs: number): Promise<void> {
    this.scheduled.push({ caseId, delayMs });
  }
}

export class CapturingTriage implements TriageScheduler {
  readonly enqueued: string[] = [];
  async enqueue(caseId: string): Promise<void> {
    this.enqueued.push(caseId);
  }
}

export function testEnv(): Env {
  return loadEnv({
    ...process.env,
    NODE_ENV: 'test',
    DATABASE_URL: testDatabaseUrl(),
    LOG_LEVEL: 'silent',
  });
}

export interface TestContext {
  app: FastifyInstance;
  prisma: PrismaClient;
  publisher: CapturingPublisher;
  sla: CapturingSla;
  triage: CapturingTriage;
}

export async function createTestContext(): Promise<TestContext> {
  const env = testEnv();
  const prisma = createPrismaClient(env.DATABASE_URL);
  const publisher = new CapturingPublisher();
  const sla = new CapturingSla();
  const triage = new CapturingTriage();
  const app = await buildApp({ env, prisma, publisher, sla, triage, enableRealtime: false });
  await app.ready();
  return { app, prisma, publisher, sla, triage };
}

export async function destroyTestContext(ctx: TestContext): Promise<void> {
  await ctx.app.close();
  await ctx.prisma.$disconnect();
}

export async function resetDb(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "AuditLog", "CaseEvent", "ConsentRecord", "MediaHash", "Referral",
      "OverrideEvent", "NotificationLog", "Case", "ConsentVersion", "User"
    RESTART IDENTITY CASCADE
  `);
}

export async function seedConsentVersion(prisma: PrismaClient, version = 'v1-en'): Promise<void> {
  await prisma.consentVersion.upsert({
    where: { version },
    update: {},
    create: { version, locale: 'en', text: 'Test consent text', active: true },
  });
}

export async function seedStaff(
  prisma: PrismaClient,
  role: Role = 'TRIAGE_OFFICER',
  email = `${role.toLowerCase()}@test.local`,
): Promise<{ id: string; role: Role; displayName: string }> {
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      role,
      displayName: `Test ${role}`,
      // Not a real hash — credential tests are out of scope here and the
      // service never bypasses argon2.verify.
      passwordHash: 'x',
    },
  });
  return { id: user.id, role, displayName: user.displayName };
}

export function staffToken(app: FastifyInstance, staff: { id: string; role: Role; displayName: string }): string {
  return app.jwt.sign({
    sub: staff.id,
    role: staff.role,
    displayName: staff.displayName,
    kind: 'access',
  });
}
