// Audit module — append-only, hash-chained (safeguarding invariant 3).
// The chain implementation lives in @childshield/db so apps/worker can write
// audited mutations too. This module intentionally re-exports append +
// verify ONLY — no update/delete exists anywhere.
export { appendAudit, verifyChain, GENESIS_HASH } from '@childshield/db';
export type { AuditEntryInput, ChainVerification, TxClient } from '@childshield/db';
