import { Type } from '@sinclair/typebox';
import {
  AGE_BANDS,
  CASE_STATUSES,
  CHANNELS,
  HASH_ALGORITHMS,
  INCIDENT_TYPES,
  REPORTER_TYPES,
  ROLES,
  SEVERITIES,
} from './constants.js';

// TypeBox schemas over the shared enum constants (constants.ts is the single
// source of truth for the values; this module exists for API validation).
// No $id on these: they are embedded in many route schemas and duplicate
// $ids collide in Fastify's shared AJV instance.
function stringEnum<T extends readonly string[]>(values: T) {
  return Type.Unsafe<T[number]>({ type: 'string', enum: [...values] });
}

export const SeveritySchema = stringEnum(SEVERITIES);
export const CaseStatusSchema = stringEnum(CASE_STATUSES);
export const ChannelSchema = stringEnum(CHANNELS);
export const IncidentTypeSchema = stringEnum(INCIDENT_TYPES);
export const ReporterTypeSchema = stringEnum(REPORTER_TYPES);
export const AgeBandSchema = stringEnum(AGE_BANDS);
export const RoleSchema = stringEnum(ROLES);
export const HashAlgorithmSchema = stringEnum(HASH_ALGORITHMS);
