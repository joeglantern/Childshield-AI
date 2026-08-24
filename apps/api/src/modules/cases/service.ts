// Cases module — the ONLY writer of Case.status (safeguarding invariant 4).
// Every mutation writes a hash-chained audit row in the same transaction
// (invariant 3). Intake requires zero PII (invariant 5). WS payloads carry
// ids/statuses only, never report content (invariants 6 + 7).

import type { Case, CaseEvent, PrismaClient } from '@childshield/db';
import {
  isTransitionAllowed,
  WS_ROOM_QUEUE,
  wsCaseRoom,
  type CaseStatus,
  type IntakeDto,
  type WsEnvelope,
} from '@childshield/shared';
import { generateCaseCode } from '../../lib/case-code.js';
import { InvalidTransitionError, NotFoundError, ValidationFailedError } from '../../lib/errors.js';
import { appendAudit } from '../audit/index.js';

export interface EventPublisher {
  publish(rooms: string[], envelope: WsEnvelope): Promise<void>;
}

export interface SlaScheduler {
  /// Schedule an sla.warning check for a case, `delayMs` from now.
  schedule(caseId: string, delayMs: number): Promise<void>;
}

export interface TriageScheduler {
  /// Enqueue the advisory ML assessment for a case (invariant 2: the result
  /// can only ever become a CaseEvent, never an action).
  enqueue(caseId: string): Promise<void>;
}

export interface Actor {
  id: string;
  role: string;
  displayName: string;
}

export interface CasesServiceDeps {
  prisma: PrismaClient;
  publisher: EventPublisher;
  sla: SlaScheduler;
  triage: TriageScheduler;
  /// Minutes before an untriaged case triggers sla.warning.
  slaDefaultMinutes: number;
  logger?: { warn: (obj: Record<string, unknown>, msg: string) => void };
}

export class CasesService {
  constructor(private readonly deps: CasesServiceDeps) {}

  /// Post-commit side effects (WS fan-out, SLA clock) must never fail the
  /// request: the mutation is already persisted and, for intake, the child
  /// must get their case code. Failures are logged for ops follow-up.
  private async sideEffect(label: string, caseId: string, fn: () => Promise<void>): Promise<void> {
    try {
      await fn();
    } catch (err) {
      this.deps.logger?.warn({ err, caseId }, `post-commit side effect failed: ${label}`);
    }
  }

  async createCase(intake: IntakeDto): Promise<Case> {
    const { prisma } = this.deps;

    const consentVersion = await prisma.consentVersion.findUnique({
      where: { version: intake.consentVersion },
    });
    if (!consentVersion || !consentVersion.active) {
      throw new ValidationFailedError(`Unknown or inactive consent version: ${intake.consentVersion}`);
    }

    const { created, event } = await prisma.$transaction(async (tx) => {
      const created = await tx.case.create({
        data: {
          caseCode: generateCaseCode(),
          channel: intake.channel,
          incidentType: intake.incidentType,
          description: intake.description,
          county: intake.county ?? null,
          ageBand: intake.ageBand,
          reporterType: intake.reporterType,
          consentVersion: intake.consentVersion,
        },
      });

      await tx.consentRecord.create({
        data: { caseId: created.id, versionId: consentVersion.id, channel: intake.channel },
      });

      if (intake.mediaHashes?.length) {
        await tx.mediaHash.createMany({
          data: intake.mediaHashes.map((m) => ({
            caseId: created.id,
            hash: m.hash,
            algorithm: m.algorithm,
            metadata: m.metadata ?? undefined,
          })),
        });
      }

      const event = await tx.caseEvent.create({
        data: {
          caseId: created.id,
          kind: 'CASE_CREATED',
          actorId: null,
          payload: { channel: intake.channel, incidentType: intake.incidentType },
        },
      });

      await appendAudit(tx, {
        actorId: null,
        actorType: 'anonymous',
        action: 'case.create',
        entityType: 'Case',
        entityId: created.id,
        after: {
          status: created.status,
          channel: created.channel,
          incidentType: created.incidentType,
        },
      });

      return { created, event };
    });

    await this.sideEffect('publish case.created', created.id, () =>
      this.deps.publisher.publish([WS_ROOM_QUEUE], {
        event: 'case.created',
        payload: {
          caseId: created.id,
          cursor: event.id,
          at: event.createdAt.toISOString(),
          caseCode: created.caseCode,
          channel: created.channel,
          incidentType: created.incidentType,
          status: created.status,
        },
      }),
    );

    await this.sideEffect('schedule sla clock', created.id, () =>
      this.deps.sla.schedule(created.id, this.deps.slaDefaultMinutes * 60_000),
    );

    await this.sideEffect('enqueue triage assessment', created.id, () =>
      this.deps.triage.enqueue(created.id),
    );

    return created;
  }

  async transitionCase(
    caseId: string,
    toStatus: CaseStatus,
    actor: Actor,
    note?: string,
  ): Promise<Case> {
    const { prisma } = this.deps;

    const { updated, event, fromStatus } = await prisma.$transaction(async (tx) => {
      const existing = await tx.case.findUnique({ where: { id: caseId } });
      if (!existing) throw new NotFoundError('Case not found');

      const fromStatus = existing.status as CaseStatus;
      if (!isTransitionAllowed(fromStatus, toStatus)) {
        throw new InvalidTransitionError(fromStatus, toStatus);
      }

      const updated = await tx.case.update({
        where: { id: caseId },
        data: { status: toStatus },
      });

      const event = await tx.caseEvent.create({
        data: {
          caseId,
          kind: 'STATUS_CHANGED',
          actorId: actor.id,
          payload: { from: fromStatus, to: toStatus, note: note ?? null },
        },
      });

      await appendAudit(tx, {
        actorId: actor.id,
        actorType: 'staff',
        action: 'case.transition',
        entityType: 'Case',
        entityId: caseId,
        before: { status: fromStatus },
        after: { status: toStatus },
      });

      return { updated, event, fromStatus };
    });

    await this.sideEffect('publish case.transitioned', caseId, () =>
      this.deps.publisher.publish([WS_ROOM_QUEUE, wsCaseRoom(caseId)], {
        event: 'case.transitioned',
        payload: {
          caseId,
          cursor: event.id,
          at: event.createdAt.toISOString(),
          from: fromStatus,
          to: toStatus,
          actorId: actor.id,
        },
      }),
    );

    return updated;
  }

  /// Officer note: CaseEvent(NOTE_ADDED) + audit row in one transaction.
  /// Text only (zero-content); the audit hash covers the tag, the note body
  /// itself lives solely in the CaseEvent payload.
  async addNote(caseId: string, actor: Actor, text: string, tag?: string): Promise<CaseEvent> {
    const { prisma } = this.deps;
    return prisma.$transaction(async (tx) => {
      const existing = await tx.case.findUnique({ where: { id: caseId }, select: { id: true } });
      if (!existing) throw new NotFoundError('Case not found');

      const event = await tx.caseEvent.create({
        data: {
          caseId,
          kind: 'NOTE_ADDED',
          actorId: actor.id,
          payload: { tag: tag ?? null, text },
        },
      });

      await appendAudit(tx, {
        actorId: actor.id,
        actorType: 'staff',
        action: 'case.note_add',
        entityType: 'Case',
        entityId: caseId,
        after: { eventId: event.id, tag: tag ?? null },
      });

      return event;
    });
  }

  async listCases(filters: { status?: CaseStatus; severity?: string }): Promise<Case[]> {
    return this.deps.prisma.case.findMany({
      where: {
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.severity ? { severity: filters.severity as never } : {}),
      },
      orderBy: [{ severity: 'desc' }, { createdAt: 'asc' }],
      take: 200,
    });
  }

  async getCase(caseId: string): Promise<(Case & { events: CaseEvent[] }) | null> {
    return this.deps.prisma.case.findUnique({
      where: { id: caseId },
      include: { events: { orderBy: { createdAt: 'asc' } } },
    });
  }

  /// Public status check by case code — returns the row; the route maps it
  /// to the minimum-necessary DTO (status + createdAt only).
  async getByCaseCode(caseCode: string): Promise<Case | null> {
    return this.deps.prisma.case.findUnique({ where: { caseCode } });
  }
}
