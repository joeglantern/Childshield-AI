import { Type, type Static } from '@sinclair/typebox';
import {
  AgeBandSchema,
  CaseStatusSchema,
  ChannelSchema,
  IncidentTypeSchema,
  ReporterTypeSchema,
  SeveritySchema,
} from './enums.js';

export const CaseEventDtoSchema = Type.Object(
  {
    id: Type.String(),
    kind: Type.String(),
    payload: Type.Unknown(),
    actorId: Type.Union([Type.String(), Type.Null()]),
    createdAt: Type.String({ format: 'date-time' }),
  },
  { },
);

export const CaseSummaryDtoSchema = Type.Object(
  {
    id: Type.String(),
    caseCode: Type.String(),
    status: CaseStatusSchema,
    severity: Type.Union([SeveritySchema, Type.Null()]),
    channel: ChannelSchema,
    incidentType: IncidentTypeSchema,
    county: Type.Union([Type.String(), Type.Null()]),
    ageBand: AgeBandSchema,
    reporterType: ReporterTypeSchema,
    createdAt: Type.String({ format: 'date-time' }),
    updatedAt: Type.String({ format: 'date-time' }),
  },
  { },
);

export const CaseDetailDtoSchema = Type.Object(
  {
    ...CaseSummaryDtoSchema.properties,
    description: Type.String(),
    consentVersion: Type.String(),
    events: Type.Array(CaseEventDtoSchema),
  },
  { },
);

/// Public child-facing status check: status + createdAt ONLY. No content,
/// no severity, no events (minimum-necessary invariant).
export const CasePublicStatusDtoSchema = Type.Object(
  {
    caseCode: Type.String(),
    status: CaseStatusSchema,
    createdAt: Type.String({ format: 'date-time' }),
  },
  { },
);

export const CreateCaseResponseSchema = Type.Object(
  {
    caseCode: Type.String(),
    status: CaseStatusSchema,
    createdAt: Type.String({ format: 'date-time' }),
  },
  { },
);

export const TransitionRequestSchema = Type.Object(
  {
    toStatus: CaseStatusSchema,
    note: Type.Optional(Type.String({ maxLength: 2000 })),
  },
  { additionalProperties: false },
);

/// Officer case note (text only — zero-content invariant). The UI warns
/// against putting any child PII in notes.
export const NoteRequestSchema = Type.Object(
  {
    tag: Type.Optional(Type.String({ maxLength: 40 })),
    text: Type.String({ minLength: 1, maxLength: 2000 }),
  },
  { additionalProperties: false },
);

export type CaseEventDto = Static<typeof CaseEventDtoSchema>;
export type CaseSummaryDto = Static<typeof CaseSummaryDtoSchema>;
export type CaseDetailDto = Static<typeof CaseDetailDtoSchema>;
export type CasePublicStatusDto = Static<typeof CasePublicStatusDtoSchema>;
export type CreateCaseResponse = Static<typeof CreateCaseResponseSchema>;
export type TransitionRequest = Static<typeof TransitionRequestSchema>;
export type NoteRequest = Static<typeof NoteRequestSchema>;
