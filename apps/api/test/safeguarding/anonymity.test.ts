// SAFEGUARDING INVARIANT 5 (ANONYMITY): intake must work with zero PII and
// the intake schema must never gain PII fields â€” required OR optional.
// Never weaken or skip this file.

import { describe, expect, it } from 'vitest';
import { IntakeDtoSchema } from '@childshield/shared';

const PII_KEYWORDS = [
  'name',
  'phone',
  'msisdn',
  'email',
  'address',
  'school',
  'guardian',
  'parent',
  'idnumber',
  'id_number',
  'nationalid',
  'birth',
  'dob',
  'location', // precise location; county-level is the allowed granularity
  'gps',
  'latitude',
  'longitude',
];

describe('intake schema anonymity', () => {
  const properties = Object.keys(IntakeDtoSchema.properties);
  const required: string[] = IntakeDtoSchema.required ?? [];

  it('contains no PII-named field, required or optional', () => {
    for (const prop of properties) {
      const lower = prop.toLowerCase();
      for (const keyword of PII_KEYWORDS) {
        expect(lower.includes(keyword), `intake field "${prop}" matches PII keyword "${keyword}"`).toBe(
          false,
        );
      }
    }
  });

  it('requires nothing beyond the non-PII core', () => {
    expect([...required].sort()).toEqual([
      'ageBand',
      'channel',
      'consentVersion',
      'description',
      'incidentType',
      'reporterType',
    ]);
  });

  it('rejects extra properties, so PII can never be smuggled in', () => {
    expect(IntakeDtoSchema.additionalProperties).toBe(false);
  });

  it('keeps ageBand an anonymous band, never an exact age or birthdate', () => {
    expect(properties).toContain('ageBand');
    expect(properties).not.toContain('age');
    expect(properties).not.toContain('birthDate');
  });
});
