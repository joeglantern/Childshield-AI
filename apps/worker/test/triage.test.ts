import { describe, expect, it } from 'vitest';
import { buildAssessment } from '../src/triage.js';

describe('buildAssessment', () => {
  const classify = {
    labels: ['grooming', 'coercion'],
    scores: { grooming: 0.9, coercion: 0.4 },
    model: 'keyword-baseline-v0',
  };
  const severity = {
    severity: 'HIGH',
    confidence: 0.5,
    explanation: ['high marker: "threaten"'],
    model: 'rule-baseline-v0',
  };

  it('shapes both ML responses into the persisted payload', () => {
    expect(buildAssessment(classify, severity)).toEqual({
      labels: ['grooming', 'coercion'],
      suggestedSeverity: 'HIGH',
      confidence: 0.5,
      explanation: ['high marker: "threaten"'],
      models: { classifier: 'keyword-baseline-v0', severity: 'rule-baseline-v0' },
    });
  });

  it('clamps confidence into [0, 1]', () => {
    expect(buildAssessment(classify, { ...severity, confidence: 1.7 }).confidence).toBe(1);
    expect(buildAssessment(classify, { ...severity, confidence: -0.2 }).confidence).toBe(0);
  });

  it('contains no actionable fields — advisory data only (invariant 2)', () => {
    const keys = Object.keys(buildAssessment(classify, severity));
    for (const banned of ['status', 'toStatus', 'transition', 'referral', 'notify']) {
      expect(keys).not.toContain(banned);
    }
  });
});
