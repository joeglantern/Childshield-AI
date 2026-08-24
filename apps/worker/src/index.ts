// BullMQ consumers. Queues: sla (real), triage + notify (stubs until B2/B3).
// SAFEGUARDING: the worker never transitions cases and never sends guardian
// notifications without safe_contact_verified — the notify stub encodes the
// check-shape now so B2 cannot forget it.

import { Worker, type Job } from 'bullmq';
import { Redis } from 'ioredis';
import { pino } from 'pino';
import { appendAudit, createPrismaClient } from '@childshield/db';
import { WS_REDIS_CHANNEL, wsCaseRoom, WS_ROOM_QUEUE, type WsEnvelope } from '@childshield/shared';
import { buildAssessment, createMlClient } from './triage.js';

const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  redact: { paths: ['*.description', '*.email', '*.password'], censor: '[REDACTED]' },
});

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
const prisma = createPrismaClient(process.env.DATABASE_URL);
const connection = { url: REDIS_URL, maxRetriesPerRequest: null as null };
const pubRedis = new Redis(REDIS_URL, { lazyConnect: true });

async function publish(rooms: string[], envelope: WsEnvelope): Promise<void> {
  await pubRedis.publish(WS_REDIS_CHANNEL, JSON.stringify({ rooms, envelope }));
}

interface SlaJobData {
  caseId: string;
}

const slaWorker = new Worker<SlaJobData>(
  'sla',
  async (job: Job<SlaJobData>) => {
    const { caseId } = job.data;
    const existing = await prisma.case.findUnique({ where: { id: caseId } });
    if (!existing) return;
    // Only warn if a human has not yet picked the case up.
    if (existing.status !== 'RECEIVED') return;

    const minutesSinceReceived = Math.round((Date.now() - existing.createdAt.getTime()) / 60_000);

    const event = await prisma.$transaction(async (tx) => {
      const event = await tx.caseEvent.create({
        data: {
          caseId,
          kind: 'SLA_WARNING',
          actorId: null,
          payload: { minutesSinceReceived, severity: existing.severity },
        },
      });
      await appendAudit(tx, {
        actorId: null,
        actorType: 'system',
        action: 'case.sla_warning',
        entityType: 'Case',
        entityId: caseId,
        after: { minutesSinceReceived },
      });
      return event;
    });

    await publish([WS_ROOM_QUEUE, wsCaseRoom(caseId)], {
      event: 'sla.warning',
      payload: {
        caseId,
        cursor: event.id,
        at: event.createdAt.toISOString(),
        severity: existing.severity,
        minutesSinceReceived,
      },
    });

    logger.warn({ caseId, minutesSinceReceived }, 'sla.warning emitted for untriaged case');
  },
  { connection },
);

const ml = createMlClient(
  process.env.ML_SERVICE_URL ?? 'http://localhost:8000',
  process.env.ML_SERVICE_API_KEY ?? '',
);

interface TriageJobData {
  caseId: string;
}

const triageWorker = new Worker<TriageJobData>(
  'triage',
  async (job: Job<TriageJobData>) => {
    // SAFEGUARDING INVARIANT 2: advisory only. The assessment becomes a
    // CaseEvent + WS event and NOTHING else. If ML is down, the job retries
    // and the case keeps flowing to human triage unscored.
    const { caseId } = job.data;
    const existing = await prisma.case.findUnique({ where: { id: caseId } });
    if (!existing) return;

    const already = await prisma.caseEvent.findFirst({
      where: { caseId, kind: 'AI_ASSESSMENT' },
      select: { id: true },
    });
    if (already) return; // idempotent across retries

    const classify = await ml.classify(existing.description);
    const severity = await ml.severity(existing.description, classify.labels, existing.incidentType);
    const assessment = buildAssessment(classify, severity);

    const event = await prisma.$transaction(async (tx) => {
      const event = await tx.caseEvent.create({
        data: {
          caseId,
          kind: 'AI_ASSESSMENT',
          actorId: null,
          payload: { ...assessment },
        },
      });
      await appendAudit(tx, {
        actorId: null,
        actorType: 'system',
        action: 'case.ai_assessment',
        entityType: 'Case',
        entityId: caseId,
        after: { suggestedSeverity: assessment.suggestedSeverity, confidence: assessment.confidence },
      });
      return event;
    });

    await publish([WS_ROOM_QUEUE, wsCaseRoom(caseId)], {
      event: 'ai.assessed',
      payload: {
        caseId,
        cursor: event.id,
        at: event.createdAt.toISOString(),
        labels: assessment.labels,
        suggestedSeverity: assessment.suggestedSeverity as never,
        confidence: assessment.confidence,
      },
    });

    logger.info(
      { caseId, suggestedSeverity: assessment.suggestedSeverity },
      'advisory ai assessment recorded',
    );
  },
  { connection },
);

const notifyWorker = new Worker(
  'notify',
  async (job) => {
    // B2/B4 implement channels. HARD RULE (invariant 8): any guardian
    // notification must check safeContactVerified === true before sending.
    logger.info({ jobId: job.id }, 'notify job received (stub — channels land in B2)');
  },
  { connection },
);

logger.info('worker started: consuming sla, triage, notify');

async function shutdown(): Promise<void> {
  logger.info('worker shutting down');
  await Promise.allSettled([slaWorker.close(), triageWorker.close(), notifyWorker.close()]);
  await prisma.$disconnect();
  pubRedis.disconnect();
  process.exit(0);
}

process.on('SIGINT', () => void shutdown());
process.on('SIGTERM', () => void shutdown());
