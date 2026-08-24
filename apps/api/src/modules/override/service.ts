// Safeguarding override module (spec 3.8).
//
// SAFEGUARDING INVARIANT 5 (ANONYMITY): this module is the ONLY sanctioned
// de-anonymization path in the platform. Intake collects no PII and nothing
// else may reveal a reporter; when a supervisor judges a child to be at
// risk, this is where that decision is recorded and justified.
//
// Consequently:
//  - INVARIANT 2 (HUMAN-IN-THE-LOOP): only a named human SUPERVISOR/ADMIN can
//    trigger an override. No model score, queue worker or automated rule may
//    reach this service — the route guard and `Actor` requirement enforce it.
//  - INVARIANT 3 (AUDIT): the OverrideEvent and its audit row are written in
//    one transaction. OverrideEvent rows are append-only: this service never
//    updates or deletes them, and nothing outside it may write them at all.
//  - INVARIANT 4 (STATE MACHINE): an override NEVER touches Case.status.
//    Escalating a case remains a separate, explicit transitionCase() call.
//  - INVARIANT 6 (MINIMUM NECESSARY): the WS alert and the referral payload
//    enumerate their fields; no internal entity is ever spread outbound.
//  - INVARIANT 7 (NO PII IN LOGS): the written justification is persisted to
//    the database only. It is never logged and never sent over WS.

import type { OverrideEvent, PrismaClient } from '@childshield/db';
import {
  WS_ROOM_SUPERVISOR,
  wsCaseRoom,
  type OverrideGround,
  type OverrideRequest,
  type WsEnvelope,
} from '@childshield/shared';
import { NotFoundError, ValidationFailedError } from '../../lib/errors.js';
import { appendAudit } from '../audit/index.js';
import type { Actor, EventPublisher } from '../cases/index.js';

/// Roles permitted to break anonymity. Deliberately narrow, and deliberately
/// duplicated at the route guard: a mistake in one layer should not be enough
/// to de-anonymize a child.
export const OVERRIDE_ROLES = ['SUPERVISOR', 'ADMIN'] as const;

export interface OverrideServiceDeps {
  prisma: PrismaClient;
  publisher: EventPublisher;
  logger?: { warn: (obj: Record<string, unknown>, msg: string) => void };
}

export interface OverrideEventWithContext extends OverrideEvent {
  case: { caseCode: string };
  supervisor: { displayName: string };
}

/// The grounds/flags we persist alongside the free-text reason. Stored in
/// `thresholdConfig` (a Json column) rather than as new columns so the module
/// needs no schema migration; the shape is owned here and validated by the
/// TypeBox request contract at the edge.
interface OverrideContext {
  ground: OverrideGround;
  imminentHarm: boolean;
}

function readContext(row: OverrideEvent): OverrideContext {
  const raw = row.thresholdConfig as Partial<OverrideContext> | null;
  return {
    ground: (raw?.ground ?? 'IMMINENT_HARM') as OverrideGround,
    imminentHarm: raw?.imminentHarm ?? false,
  };
}

export class OverrideService {
  constructor(private readonly deps: OverrideServiceDeps) {}

  /// Post-commit side effects must never fail the request: the override is
  /// already recorded and a child may be at risk, so a WS hiccup cannot be
  /// allowed to surface as an error to the supervisor.
  private async sideEffect(label: string, caseId: string, fn: () => Promise<void>): Promise<void> {
    try {
      await fn();
    } catch (err) {
      this.deps.logger?.warn({ err, caseId }, `post-commit side effect failed: ${label}`);
    }
  }

  /// Record a supervisor's decision to break anonymity on a case.
  ///
  /// Writes OverrideEvent + CaseEvent(OVERRIDE_TRIGGERED) + AuditLog in one
  /// transaction, then alerts the supervisor channel. Never changes status.
  async triggerOverride(
    caseId: string,
    actor: Actor,
    request: OverrideRequest,
  ): Promise<OverrideEventWithContext> {
    const { prisma } = this.deps;

    // Defence in depth: the route guard already restricts the role, but this
    // service is the invariant's home and must not rely on its callers.
    if (!(OVERRIDE_ROLES as readonly string[]).includes(actor.role)) {
      throw new ValidationFailedError('Only a supervisor may trigger a safeguarding override');
    }
    // Trimmed length, so whitespace cannot buy past the minimum.
    if (request.reason.trim().length < 40) {
      throw new ValidationFailedError('A written justification of at least 40 characters is required');
    }

    const { created, event } = await prisma.$transaction(async (tx) => {
      const existing = await tx.case.findUnique({
        where: { id: caseId },
        select: { id: true, caseCode: true },
      });
      if (!existing) throw new NotFoundError('Case not found');

      const created = await tx.overrideEvent.create({
        data: {
          caseId,
          supervisorId: actor.id,
          reason: request.reason.trim(),
          childPreNotified: request.childPreNotified,
          thresholdConfig: {
            ground: request.ground,
            imminentHarm: request.imminentHarm,
          },
        },
      });

      // Mirrors onto the case timeline. Carries the decision metadata but
      // NOT the justification text (invariant 7).
      const event = await tx.caseEvent.create({
        data: {
          caseId,
          kind: 'OVERRIDE_TRIGGERED',
          actorId: actor.id,
          payload: {
            overrideEventId: created.id,
            ground: request.ground,
            imminentHarm: request.imminentHarm,
            childPreNotified: request.childPreNotified,
          },
        },
      });

      await appendAudit(tx, {
        actorId: actor.id,
        actorType: 'staff',
        action: 'override.trigger',
        entityType: 'OverrideEvent',
        entityId: created.id,
        after: {
          caseId,
          ground: request.ground,
          imminentHarm: request.imminentHarm,
          childPreNotified: request.childPreNotified,
        },
      });

      return { created, event, caseCode: existing.caseCode };
    });

    await this.sideEffect('publish override.triggered', caseId, () =>
      this.deps.publisher.publish([WS_ROOM_SUPERVISOR, wsCaseRoom(caseId)], {
        event: 'override.triggered',
        payload: {
          caseId,
          cursor: event.id,
          at: event.createdAt.toISOString(),
          overrideEventId: created.id,
          supervisorId: actor.id,
        },
      } satisfies WsEnvelope),
    );

    return this.withContext(created.id);
  }

  private async withContext(id: string): Promise<OverrideEventWithContext> {
    const row = await this.deps.prisma.overrideEvent.findUnique({
      where: { id },
      include: { case: { select: { caseCode: true } }, supervisor: { select: { displayName: true } } },
    });
    if (!row) throw new NotFoundError('Override event not found');
    return row;
  }

  async listForCase(caseId: string): Promise<OverrideEventWithContext[]> {
    return this.deps.prisma.overrideEvent.findMany({
      where: { caseId },
      include: { case: { select: { caseCode: true } }, supervisor: { select: { displayName: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  /// Every override in a window, for the Safeguarding Ops Committee review.
  async listBetween(from: Date, to: Date): Promise<OverrideEventWithContext[]> {
    return this.deps.prisma.overrideEvent.findMany({
      where: { createdAt: { gte: from, lte: to } },
      include: { case: { select: { caseCode: true } }, supervisor: { select: { displayName: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  /// Aggregate counts for the review export. Computed here rather than in the
  /// route so the numbers and the entries can never disagree.
  summarise(rows: OverrideEventWithContext[]): {
    total: number;
    imminentHarmCount: number;
    childPreNotifiedCount: number;
    byGround: Record<string, number>;
  } {
    const byGround: Record<string, number> = {};
    let imminentHarmCount = 0;
    let childPreNotifiedCount = 0;

    for (const row of rows) {
      const ctx = readContext(row);
      byGround[ctx.ground] = (byGround[ctx.ground] ?? 0) + 1;
      if (ctx.imminentHarm) imminentHarmCount += 1;
      if (row.childPreNotified) childPreNotifiedCount += 1;
    }

    return { total: rows.length, imminentHarmCount, childPreNotifiedCount, byGround };
  }

  /// Explicit field allow-list for anything leaving the module
  /// (invariant 6) — never spread an entity into an outbound payload.
  static toDto(row: OverrideEventWithContext): {
    id: string;
    caseId: string;
    caseCode: string;
    supervisorId: string;
    supervisorName: string;
    ground: OverrideGround;
    reason: string;
    childPreNotified: boolean;
    imminentHarm: boolean;
    createdAt: string;
  } {
    const ctx = readContext(row);
    return {
      id: row.id,
      caseId: row.caseId,
      caseCode: row.case.caseCode,
      supervisorId: row.supervisorId,
      supervisorName: row.supervisor.displayName,
      ground: ctx.ground,
      reason: row.reason,
      childPreNotified: row.childPreNotified,
      imminentHarm: ctx.imminentHarm,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
