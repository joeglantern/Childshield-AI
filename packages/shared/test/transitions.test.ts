import { describe, expect, it } from 'vitest';
import { ALLOWED_TRANSITIONS, CASE_STATUSES, isTransitionAllowed } from '../src/index.js';

describe('ALLOWED_TRANSITIONS', () => {
  it('covers every status as a source', () => {
    for (const status of CASE_STATUSES) {
      expect(ALLOWED_TRANSITIONS[status]).toBeDefined();
    }
  });

  it('only lists valid statuses as targets', () => {
    for (const targets of Object.values(ALLOWED_TRANSITIONS)) {
      for (const target of targets) {
        expect(CASE_STATUSES).toContain(target);
      }
    }
  });

  it('matches the documented state machine', () => {
    expect(isTransitionAllowed('RECEIVED', 'TRIAGED')).toBe(true);
    expect(isTransitionAllowed('TRIAGED', 'UNDER_REVIEW')).toBe(true);
    expect(isTransitionAllowed('UNDER_REVIEW', 'REFERRED')).toBe(true);
    expect(isTransitionAllowed('UNDER_REVIEW', 'CLOSED')).toBe(true);
    expect(isTransitionAllowed('REFERRED', 'IN_PROGRESS')).toBe(true);
    expect(isTransitionAllowed('IN_PROGRESS', 'CLOSED')).toBe(true);
    expect(isTransitionAllowed('CLOSED', 'REOPENED')).toBe(true);
    expect(isTransitionAllowed('REOPENED', 'UNDER_REVIEW')).toBe(true);
  });

  it('rejects skips and reversals', () => {
    expect(isTransitionAllowed('RECEIVED', 'CLOSED')).toBe(false);
    expect(isTransitionAllowed('RECEIVED', 'UNDER_REVIEW')).toBe(false);
    expect(isTransitionAllowed('CLOSED', 'RECEIVED')).toBe(false);
    expect(isTransitionAllowed('TRIAGED', 'RECEIVED')).toBe(false);
    expect(isTransitionAllowed('REFERRED', 'TRIAGED')).toBe(false);
  });

  it('no status transitions to itself', () => {
    for (const status of CASE_STATUSES) {
      expect(isTransitionAllowed(status, status)).toBe(false);
    }
  });
});
