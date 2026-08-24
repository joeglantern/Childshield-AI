// Plain constants and union types — ZERO runtime dependencies.
// The mobile app (Hermes) imports its runtime values ONLY from here and
// from transitions.ts, so TypeBox never enters the app bundle. Keep this
// file dependency-free.

export const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export const CASE_STATUSES = [
  'RECEIVED',
  'TRIAGED',
  'UNDER_REVIEW',
  'REFERRED',
  'IN_PROGRESS',
  'CLOSED',
  'REOPENED',
] as const;
export const CHANNELS = ['WEB', 'WHATSAPP', 'USSD', 'SMS'] as const;
export const INCIDENT_TYPES = [
  'GROOMING',
  'SEXTORTION',
  'BULLYING',
  'SELF_HARM',
  'COERCION',
  'HARMFUL_EXPOSURE',
  'OTHER',
] as const;
export const REPORTER_TYPES = [
  'CHILD_SELF',
  'PEER',
  'CAREGIVER',
  'PROFESSIONAL',
  'OTHER',
] as const;
export const AGE_BANDS = [
  'UNDER_10',
  'AGE_10_12',
  'AGE_13_15',
  'AGE_16_18',
  'UNKNOWN',
] as const;
export const ROLES = [
  'CHILD_REPORTER',
  'TRIAGE_OFFICER',
  'SUPERVISOR',
  'DCS_LIAISON',
  'ADMIN',
  'AUDITOR',
] as const;
export const STAFF_ROLES = [
  'TRIAGE_OFFICER',
  'SUPERVISOR',
  'DCS_LIAISON',
  'ADMIN',
  'AUDITOR',
] as const;
export const HASH_ALGORITHMS = ['SHA256', 'PDQ', 'MD5_LEGACY'] as const;

export type Severity = (typeof SEVERITIES)[number];
export type CaseStatus = (typeof CASE_STATUSES)[number];
export type Channel = (typeof CHANNELS)[number];
export type IncidentType = (typeof INCIDENT_TYPES)[number];
export type ReporterType = (typeof REPORTER_TYPES)[number];
export type AgeBand = (typeof AGE_BANDS)[number];
export type Role = (typeof ROLES)[number];
export type StaffRole = (typeof STAFF_ROLES)[number];
export type HashAlgorithm = (typeof HASH_ALGORITHMS)[number];

// ---- Realtime constants (§5) ----

/// Redis pub/sub channel fanning WS events out across api/worker containers.
export const WS_REDIS_CHANNEL = 'childshield:ws';

export const WS_EVENT_NAMES = [
  'case.created',
  'case.transitioned',
  'sla.warning',
  'ai.assessed',
  'override.triggered', // contract defined; emitted from Milestone B4 (override module)
] as const;
export type WsEventName = (typeof WS_EVENT_NAMES)[number];

/// Events actually emitted by the current backend build.
export const IMPLEMENTED_WS_EVENTS = [
  'case.created',
  'case.transitioned',
  'sla.warning',
  'ai.assessed',
] as const;

// Rooms: 'queue' (all staff), 'supervisor' (priority channel),
// 'case:{caseId}' (per-case room with presence).
export const WS_ROOM_QUEUE = 'queue';
export const WS_ROOM_SUPERVISOR = 'supervisor';
export const wsCaseRoom = (caseId: string): string => `case:${caseId}`;
