import { randomInt } from 'node:crypto';

// Unambiguous alphabet (no 0/O, 1/I/L) — children may write codes by hand
// or read them over USSD/SMS.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/// e.g. "K7RD-M2XA" — 31^8 ≈ 850 billion combinations.
export function generateCaseCode(): string {
  const pick = (): string => ALPHABET[randomInt(ALPHABET.length)] as string;
  const block = (n: number): string => Array.from({ length: n }, pick).join('');
  return `${block(4)}-${block(4)}`;
}
