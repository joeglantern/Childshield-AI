import { Type, type Static } from '@sinclair/typebox';

/// Read-only view of one audit chain entry. Deliberately excludes the
/// internal `seq` ordering column — entries are addressed by `id` only.
export const AuditLogEntryDtoSchema = Type.Object(
  {
    id: Type.String(),
    actorId: Type.Union([Type.String(), Type.Null()]),
    actorType: Type.String(),
    /// Resolved staff display name, when actorId points at a known user.
    actorDisplayName: Type.Union([Type.String(), Type.Null()]),
    action: Type.String(),
    entityType: Type.String(),
    entityId: Type.String(),
    /// Human-friendly label for the entity (e.g. the case code), when resolvable.
    entityLabel: Type.Union([Type.String(), Type.Null()]),
    entryHash: Type.String(),
    createdAt: Type.String({ format: 'date-time' }),
  },
  {},
);

export const AuditListResponseSchema = Type.Object(
  {
    entries: Type.Array(AuditLogEntryDtoSchema),
    /// Result of re-walking the whole chain at request time.
    chainValid: Type.Boolean(),
  },
  {},
);

export type AuditLogEntryDto = Static<typeof AuditLogEntryDtoSchema>;
export type AuditListResponse = Static<typeof AuditListResponseSchema>;
