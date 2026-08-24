import { Type, type Static } from '@sinclair/typebox';
import {
  AgeBandSchema,
  ChannelSchema,
  HashAlgorithmSchema,
  IncidentTypeSchema,
  ReporterTypeSchema,
} from './enums.js';

// SAFEGUARDING INVARIANT 5 (ANONYMITY): this schema must never contain a
// required (or any) PII field (name, phone, email, address, school, ID
// number, guardian details...). test/safeguarding/anonymity.test.ts enforces
// this against a PII keyword list. Do not add PII fields here.

export const MediaHashInputSchema = Type.Object(
  {
    hash: Type.String({ minLength: 8, maxLength: 512 }),
    algorithm: HashAlgorithmSchema,
    metadata: Type.Optional(
      Type.Record(Type.String(), Type.Union([Type.String(), Type.Number(), Type.Boolean()]), {
        description: 'Non-content metadata only (e.g. platform, approximate size). Never storage refs.',
      }),
    ),
  },
  { },
);

export const IntakeDtoSchema = Type.Object(
  {
    reporterType: ReporterTypeSchema,
    ageBand: AgeBandSchema,
    channel: ChannelSchema,
    incidentType: IncidentTypeSchema,
    description: Type.String({ minLength: 1, maxLength: 10000 }),
    county: Type.Optional(Type.String({ maxLength: 100 })),
    consentVersion: Type.String({ minLength: 1, maxLength: 50 }),
    mediaHashes: Type.Optional(Type.Array(MediaHashInputSchema, { maxItems: 20 })),
  },
  {
    additionalProperties: false,
    description:
      'Anonymous-first intake. Contains zero PII fields by design; free-text description is the only unstructured input.',
  },
);

export type MediaHashInput = Static<typeof MediaHashInputSchema>;
export type IntakeDto = Static<typeof IntakeDtoSchema>;
