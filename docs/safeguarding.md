# Safeguarding Invariants

The nine non-negotiables, with where each is enforced and which test guards it. The `test/safeguarding/` suite is CI-mandatory — the build fails if any of these tests fail or are skipped, and they must never be weakened.

| # | Invariant | Enforced in code | Guarded by |
|---|---|---|---|
| 1 | **Zero-content** — never download/store/proxy/log media; hashes + metadata only | No upload endpoint or multipart parser exists; `MediaHash` schema has no storage-ref columns; mobile has no media picker and says "Maneno tu" | `test/safeguarding/no-uploads.test.ts` (parser + dependency + source scan); MediaHash column-shape assertion in `cases.test.ts` |
| 2 | **Human-in-the-loop** — ML is advisory; a score never transitions/refers/notifies | ML writes only `CaseEvent(AI_ASSESSMENT)`; the mobile AI box is labeled "PENDEKEZO LA AI, SI UAMUZI" and is display-only | Architecture (no code path exists); B3 will add dedicated tests when ML lands |
| 3 | **Audit everything** — every mutation writes a hash-chained AuditLog row in the same transaction | `appendAudit()` in `packages/db/src/audit.ts`, called inside `createCase`, `transitionCase`, `addNote`, SLA warnings | `audit.test.ts` (tamper/deletion/rewrite detection via `verifyChain()`); `audit-append-only.test.ts` (no update/delete/upsert exists anywhere, incl. raw SQL) |
| 4 | **State machine** — status changes ONLY via `transitionCase()` | Explicit `ALLOWED_TRANSITIONS` map (`packages/shared/src/transitions.ts`); typed `InvalidTransitionError` (409) | `status-writer.test.ts` (grep: only `cases/service.ts` calls `case.update`; exactly one status write; no raw SQL status writes); exhaustive valid/invalid matrix in `cases.test.ts` |
| 5 | **Anonymity** — intake works with zero PII; no required PII fields ever | `IntakeDto` has no PII fields at all; `additionalProperties:false` blocks smuggling; Case model has no PII columns; county is the finest location granularity | `anonymity.test.ts` (PII keyword list vs schema properties + required set) |
| 6 | **Minimum necessary** — outbound payloads use explicit allow-lists, never spreads | Public status endpoint returns `{caseCode,status,createdAt}` only; WS payloads carry ids/statuses, never description text | Key-set assertion in `cases.test.ts`; WS payload content assertion (`case.created` must not contain description) |
| 7 | **No PII in logs** — pino redaction; no bodies; Sentry scrubbed | Redaction paths in `apps/api/src/app.ts` (+ worker logger); Sentry `beforeSend` strips bodies/headers/user | Config review; redaction lists live in code, not env |
| 8 | **Guardian safety** — no guardian notification without `safe_contact_verified === true` | `NotificationLog.safeContactVerified` column; the notify worker stub encodes the check-shape so B2 cannot forget it | Dedicated tests arrive with B2 notifications |
| 9 | **Secrets** — env vars only | TypeBox-validated env loader refuses prod boot with default JWT secrets; `.env` gitignored; `.env.example` documents every var | Boot-time guard in `apps/api/src/env.ts` |

## Client-side safety UX (mobile)

- Quick exit on every child screen → wipes the in-memory draft, clears the stack, lands on the neutral "Notes" decoy (return: 5 quick taps on the title; Android back exits the app).
- App-switcher privacy shield (logo-only preview), FLAG_SECURE on the report flow (Android), no sensitive words in any notification copy.
- Severity colors and case content exist in officer views only; the child status screen shows progress steps and nothing else.
- Officer note sheet warns: "Usiweke jina, simu, au anwani ya mtoto kwenye dokezo."

## Working rules

Before coding any feature, restate which invariants it touches. If a requirement conflicts with an invariant — stop and ask; never pick a workaround.
