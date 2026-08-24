// Safeguarding override contracts (spec 3.8).
//
// An override is the ONLY sanctioned route by which a case stops being
// anonymous: a named supervisor records, in writing, that a child is at
// imminent risk and that identifying detail must reach DCS / Childline 116.
// Because it is the single exception to invariant 5, the contract is
// deliberately strict — a free-text reason is mandatory, the requesting
// supervisor is always recorded, and every field that leaves the platform
// is enumerated rather than spread from an internal entity (invariant 6).

import { Type, type Static } from '@sinclair/typebox';

/// Why a supervisor broke anonymity. These map to the Safeguarding Ops
/// Committee's review categories, so the weekly export can be grouped.
export const OVERRIDE_GROUNDS = [
  /// Disclosed or inferred risk to life, or of serious physical harm.
  'IMMINENT_HARM',
  /// Ongoing abuse where delay would leave the child in contact with a
  /// suspected perpetrator.
  'ONGOING_ABUSE',
  /// A court order or statutory request compels disclosure.
  'LEGAL_ORDER',
  /// The child (or a verified safe adult) has explicitly asked us to share.
  'CHILD_REQUESTED',
] as const;

export type OverrideGround = (typeof OVERRIDE_GROUNDS)[number];

export const OverrideGroundSchema = Type.Union(
  OVERRIDE_GROUNDS.map((g) => Type.Literal(g)),
  { $id: 'OverrideGround' },
);

/// Minimum length forces a real justification rather than "urgent".
export const OVERRIDE_REASON_MIN = 40;
export const OVERRIDE_REASON_MAX = 2000;

export const OverrideRequestSchema = Type.Object(
  {
    ground: OverrideGroundSchema,
    /// Written justification. Reviewed by the Safeguarding Ops Committee.
    reason: Type.String({ minLength: OVERRIDE_REASON_MIN, maxLength: OVERRIDE_REASON_MAX }),
    /// Whether the child was told before identifying detail was shared.
    /// Recorded either way: "no" is a legitimate answer when telling the
    /// child would increase their risk, but it must be a deliberate choice.
    childPreNotified: Type.Boolean(),
    /// Set when the supervisor judges the child to be in immediate danger.
    /// Raises the WS alert priority; it does NOT change case status.
    imminentHarm: Type.Boolean(),
  },
  { $id: 'OverrideRequest', additionalProperties: false },
);

export type OverrideRequest = Static<typeof OverrideRequestSchema>;

export const OverrideEventDtoSchema = Type.Object(
  {
    id: Type.String(),
    caseId: Type.String(),
    caseCode: Type.String(),
    supervisorId: Type.String(),
    supervisorName: Type.String(),
    ground: OverrideGroundSchema,
    reason: Type.String(),
    childPreNotified: Type.Boolean(),
    imminentHarm: Type.Boolean(),
    createdAt: Type.String({ format: 'date-time' }),
  },
  { $id: 'OverrideEventDto' },
);

export type OverrideEventDto = Static<typeof OverrideEventDtoSchema>;

/// Weekly review export for the Safeguarding Ops Committee. Counts plus the
/// individual entries for the period, so the committee can audit both the
/// rate of overrides and each decision.
export const OverrideReviewExportSchema = Type.Object(
  {
    from: Type.String({ format: 'date-time' }),
    to: Type.String({ format: 'date-time' }),
    total: Type.Integer(),
    imminentHarmCount: Type.Integer(),
    childPreNotifiedCount: Type.Integer(),
    byGround: Type.Record(Type.String(), Type.Integer()),
    entries: Type.Array(OverrideEventDtoSchema),
  },
  { $id: 'OverrideReviewExport' },
);

export type OverrideReviewExport = Static<typeof OverrideReviewExportSchema>;
