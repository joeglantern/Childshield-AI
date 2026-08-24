import { Type, type Static } from '@sinclair/typebox';
import { CaseStatusSchema, ChannelSchema, IncidentTypeSchema, SeveritySchema } from './enums.js';

// Realtime contracts (§5). Every WS event mirrors a persisted CaseEvent —
// REST is the source of truth; clients reconcile via `cursor` (the CaseEvent
// id) on reconnect.
//
// SAFEGUARDING INVARIANTS 6 + 7: payloads carry ids, statuses, severities
// and timestamps ONLY. Never the case description or any free text a child
// wrote — WS frames must stay PII-free and content-free.

import type { WsEventName } from './constants.js';

// The ws constants (channel, room names, event-name lists) live in
// constants.ts so runtime-light consumers (the mobile app) can import them
// without TypeBox.

const base = {
  caseId: Type.String(),
  /// CaseEvent id — reconnect cursor.
  cursor: Type.String(),
  at: Type.String({ format: 'date-time' }),
};

export const CaseCreatedPayloadSchema = Type.Object(
  {
    ...base,
    caseCode: Type.String(),
    channel: ChannelSchema,
    incidentType: IncidentTypeSchema,
    status: CaseStatusSchema,
  },
  { $id: 'WsCaseCreated' },
);

export const CaseTransitionedPayloadSchema = Type.Object(
  {
    ...base,
    from: CaseStatusSchema,
    to: CaseStatusSchema,
    actorId: Type.Union([Type.String(), Type.Null()]),
  },
  { $id: 'WsCaseTransitioned' },
);

export const SlaWarningPayloadSchema = Type.Object(
  {
    ...base,
    severity: Type.Union([SeveritySchema, Type.Null()]),
    minutesSinceReceived: Type.Number(),
  },
  { $id: 'WsSlaWarning' },
);

export const AiAssessedPayloadSchema = Type.Object(
  {
    ...base,
    // Advisory only (invariant 2): labels + confidence, never a status change.
    labels: Type.Array(Type.String()),
    suggestedSeverity: SeveritySchema,
    confidence: Type.Number({ minimum: 0, maximum: 1 }),
  },
  { $id: 'WsAiAssessed' },
);

export const OverrideTriggeredPayloadSchema = Type.Object(
  {
    ...base,
    overrideEventId: Type.String(),
    supervisorId: Type.String(),
  },
  { $id: 'WsOverrideTriggered' },
);

export type CaseCreatedPayload = Static<typeof CaseCreatedPayloadSchema>;
export type CaseTransitionedPayload = Static<typeof CaseTransitionedPayloadSchema>;
export type SlaWarningPayload = Static<typeof SlaWarningPayloadSchema>;
export type AiAssessedPayload = Static<typeof AiAssessedPayloadSchema>;
export type OverrideTriggeredPayload = Static<typeof OverrideTriggeredPayloadSchema>;

export interface WsEventPayloadMap {
  'case.created': CaseCreatedPayload;
  'case.transitioned': CaseTransitionedPayload;
  'sla.warning': SlaWarningPayload;
  'ai.assessed': AiAssessedPayload;
  'override.triggered': OverrideTriggeredPayload;
}

export interface WsEnvelope<N extends WsEventName = WsEventName> {
  event: N;
  payload: WsEventPayloadMap[N];
}

// ---- Client -> server messages over the socket ----

export const WsClientMessageSchema = Type.Union(
  [
    Type.Object({ type: Type.Literal('subscribe'), room: Type.String() }),
    Type.Object({ type: Type.Literal('unsubscribe'), room: Type.String() }),
    Type.Object({ type: Type.Literal('ping') }),
  ],
  { $id: 'WsClientMessage' },
);
export type WsClientMessage = Static<typeof WsClientMessageSchema>;

// ---- Server -> client system frames (presence etc.) ----

export interface WsPresenceFrame {
  event: 'presence';
  room: string;
  /// Display names of staff currently in the room ("officer X is viewing").
  viewers: string[];
}
