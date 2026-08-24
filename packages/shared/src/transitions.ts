import type { CaseStatus } from './constants.js';

// SAFEGUARDING INVARIANT 4 (STATE MACHINE): the ONLY legal status graph.
// transitionCase() in apps/api is the ONLY writer of Case.status and it
// consults this map. Nothing else may set status.

export const ALLOWED_TRANSITIONS: Readonly<Record<CaseStatus, readonly CaseStatus[]>> = {
  RECEIVED: ['TRIAGED'],
  TRIAGED: ['UNDER_REVIEW'],
  UNDER_REVIEW: ['REFERRED', 'CLOSED'],
  REFERRED: ['IN_PROGRESS'],
  IN_PROGRESS: ['CLOSED'],
  CLOSED: ['REOPENED'],
  REOPENED: ['UNDER_REVIEW'],
} as const;

export function isTransitionAllowed(from: CaseStatus, to: CaseStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}
