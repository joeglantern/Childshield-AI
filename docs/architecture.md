# Architecture

Modular monolith + one Python ML service + one worker, on a single VPS with Docker Compose. **Not** microservices.

## Monorepo layout

```
apps/
  api/        Fastify + TypeScript (strict) + TypeBox — the modular monolith
  worker/     BullMQ consumers (sla real; triage/notify stubs until B2/B3)
  ml/         Python 3.11 FastAPI — advisory classifier stub (internal network only)
  mobile/     Expo + expo-router app (child reporter + officer, role-gated)
  dashboard/  Vite + React placeholder (desktop triage — designed, not yet built)
packages/
  db/         Prisma schema + migrations + audit-chain service (server-side shared)
  shared/     TypeBox schemas, enums, transition map, WS contracts (FE/BE shared)
  config/     tsconfig/eslint bases
```

## Backend modules (`apps/api/src/modules/`)

- **cases** — `createCase()` (anonymous intake), `transitionCase()` (the ONLY writer of `Case.status`), `addNote()`, listing/detail/public-status. Every mutation writes an audit row in the same transaction and publishes a WS event after commit. Post-commit side effects (WS publish, SLA scheduling) never fail the request — the mutation is already persisted.
- **audit** — re-exports the hash-chain implementation from `@childshield/db` (shared with the worker). Append + verify only; no update/delete exists anywhere.
- **auth** — staff login (argon2 + TOTP when enrolled), JWT access/refresh pair. Children never have accounts.
- **ws** — realtime gateway (see below).
- **health** — `/health` liveness, `/ready` (pings Postgres + Redis).

## Case state machine

```
RECEIVED → TRIAGED → UNDER_REVIEW → REFERRED → IN_PROGRESS → CLOSED → REOPENED → UNDER_REVIEW
                          └────────────→ CLOSED
```

The allowed-transitions map lives in `packages/shared/src/transitions.ts` and is consumed by both the API guard and the mobile UI (to render only legal actions). `transitionCase()` in `apps/api/src/modules/cases/service.ts` is the only code that writes `Case.status` — enforced by a grep-based CI test.

## Audit chain

`packages/db/src/audit.ts`. Every mutation appends an `AuditLog` row inside the caller's transaction: `entryHash = sha256(prevHash ‖ canonicalJson(entry))`. Appends are serialized with a Postgres advisory lock so the chain never forks. `verifyChain()` re-walks the whole chain; any tampered, deleted, or reordered row breaks verification (proven by tests).

## Realtime (§5 of the build plan)

- WS is a **delivery optimization, never the source of truth**. Every WS event mirrors a persisted `CaseEvent`; clients refetch via REST on every event and on reconnect (the `cursor` field is the CaseEvent id).
- Auth: short-lived single-use ticket from `POST /ws/ticket` (staff only), stored in Redis, consumed with GETDEL on connect.
- Rooms: `queue` (all staff), `case:{id}` (presence-tracked), `supervisor` (SUPERVISOR/ADMIN only).
- Fan-out: api and worker publish JSON to the Redis channel `childshield:ws`; each api instance broadcasts to its local sockets by room. Presence is kept in Redis sets so it works across instances.

## Worker queues

BullMQ on Redis: `sla` (real — a delayed job per case; if still RECEIVED when it fires, writes `CaseEvent(SLA_WARNING)` + audit row and publishes `sla.warning`), `triage` and `notify` (stubs until B2/B3).

## ML service

`apps/ml` — FastAPI keyword/rule baseline behind an API key, internal Docker network only. Its output is **advisory**: the API writes it as `CaseEvent(kind=AI_ASSESSMENT)`; no code path lets a model score transition a case, create a referral, or send a notification (invariant 2).

## Data notes

- Public IDs are cuid2; autoincrement ints are never exposed (the audit `seq` is internal ordering only).
- `Case` has zero required PII; `MediaHash` stores hash + algorithm + metadata only — no storage refs by schema design.
- Dev Postgres maps to **host port 5433** (5432 is taken by another local container on this machine).
