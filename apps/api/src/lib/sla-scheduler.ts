import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import type { SlaScheduler } from '../modules/cases/service.js';

export const SLA_QUEUE_NAME = 'sla';
export const TRIAGE_QUEUE_NAME = 'triage';

export interface SlaJobData {
  caseId: string;
}

export interface TriageJobData {
  caseId: string;
}

/// BullMQ-backed scheduler. The queue (and its Redis connection) is created
/// on first use so building the app never requires a live Redis — tests and
/// OpenAPI generation inject a no-op scheduler instead.
export class BullSlaScheduler implements SlaScheduler {
  private queue: Queue<SlaJobData> | undefined;

  constructor(private readonly redisUrl: string) {}

  async schedule(caseId: string, delayMs: number): Promise<void> {
    this.queue ??= new Queue<SlaJobData>(SLA_QUEUE_NAME, {
      connection: new Redis(this.redisUrl, { maxRetriesPerRequest: null }),
    });
    await this.queue.add(
      'sla-check',
      { caseId },
      // BullMQ forbids ':' in custom job ids.
      { delay: delayMs, jobId: `sla-${caseId}`, removeOnComplete: true, removeOnFail: 100 },
    );
  }

  async close(): Promise<void> {
    await this.queue?.close();
  }
}

/// Enqueues a case for the advisory ML triage pass (worker consumes; the
/// result is a CaseEvent only — never a transition). Lazy like the SLA queue.
export class BullTriageQueue {
  private queue: Queue<TriageJobData> | undefined;

  constructor(private readonly redisUrl: string) {}

  async enqueue(caseId: string): Promise<void> {
    this.queue ??= new Queue<TriageJobData>(TRIAGE_QUEUE_NAME, {
      connection: new Redis(this.redisUrl, { maxRetriesPerRequest: null }),
    });
    await this.queue.add(
      'assess',
      { caseId },
      { jobId: `triage-${caseId}`, removeOnComplete: true, removeOnFail: 100, attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
    );
  }

  async close(): Promise<void> {
    await this.queue?.close();
  }
}
