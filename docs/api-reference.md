# API Reference

Base URL (dev): `http://localhost:3000`. The generated machine-readable spec is [openapi/openapi.json](./openapi/openapi.json) (`pnpm openapi:generate` refreshes it). Swagger UI is served at `/docs` in non-production.

Errors are always `{code, message}` — e.g. `VALIDATION_FAILED` (400), `UNAUTHORIZED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `INVALID_TRANSITION` (409), `INTERNAL` (500). Stack traces and internal messages never leak.

## REST endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/health` | none | Liveness probe |
| GET | `/ready` | none | Readiness probe (checks PostgreSQL and Redis) |
| POST | `/auth/login` | none | Staff login: `{email, password, totpCode?}` → `{accessToken, refreshToken, role, displayName}`. TOTP required once enrolled. Children never log in |
| POST | `/auth/refresh` | refresh token | `{refreshToken}` → new token pair |
| POST | `/cases` | none (anonymous) | Case intake. Body = `IntakeDto` (zero PII). Returns `201 {caseCode, status, createdAt}` — caseCode format `K7RD-M2XA` |
| GET | `/cases` | staff (Bearer) | Queue listing, severity-sorted; optional `?status=` / `?severity=` filters → `CaseSummaryDto[]` |
| GET | `/cases/{id}` | staff | Case detail with full event timeline (`CaseDetailDto`) |
| POST | `/cases/{id}/transition` | TRIAGE_OFFICER, SUPERVISOR, DCS_LIAISON, ADMIN | `{toStatus, note?}` — the ONLY way status changes; `409` on an illegal move |
| POST | `/cases/{id}/notes` | TRIAGE_OFFICER, SUPERVISOR, DCS_LIAISON, ADMIN | `{tag?, text}` — audited officer note; returns the created `CaseEventDto` (201) |
| GET | `/case-status/{caseCode}` | none (child-facing) | Public status check: `{caseCode, status, createdAt}` ONLY — never content, severity, or events |
| POST | `/ws/ticket` | staff | `{ticket, expiresInSeconds}` — short-lived single-use WebSocket ticket |
| GET | `/audit` | AUDITOR, SUPERVISOR, ADMIN | Read-only audit log listing (`?limit=`, `?before=` cursor by entry id). Returns `{entries, chainValid}` — `chainValid` re-walks the whole hash chain at request time. No mutating endpoint exists for this resource, ever |

Access tokens live ~15 minutes; clients (the mobile officer session does this automatically) should refresh-and-retry on 401.

## WebSocket

Connect: `GET /ws?ticket=<ticket>` (upgrade). Invalid/expired ticket → close code 4001.

**Client → server:** `{type:"subscribe"|"unsubscribe", room}` (acked with `subscribed` / `subscribe_denied` / `unsubscribed`), `{type:"ping"}` → `{event:"pong"}`.

**Rooms:** `queue` (all staff), `case:{caseId}` (presence-tracked), `supervisor` (SUPERVISOR/ADMIN only).

**Server events** — `{event, payload}` envelopes; every payload has `caseId`, `cursor` (CaseEvent id — the reconnect reconciliation cursor), `at` (ISO time). Payloads carry ids/statuses only, never report content.

| Event | Extra payload | Status |
|---|---|---|
| `case.created` | `caseCode, channel, incidentType, status` | live |
| `case.transitioned` | `from, to, actorId` | live |
| `sla.warning` | `severity, minutesSinceReceived` | live (fired by the worker) |
| `ai.assessed` | `labels, suggestedSeverity, confidence` | live (worker, after the advisory ML pass) |
| `override.triggered` | `overrideEventId, supervisorId` | contract only — arrives with B4 |

Presence frames on case rooms: `{event:"presence", room, viewers: string[]}` (officer display names currently viewing).

**Rule:** WS is a delivery optimization — REST is the source of truth; refetch on every event and on reconnect.

## Shared types

Everything above is typed in `@childshield/shared` (TypeBox schemas + inferred TS types). Import from:

- `@childshield/shared` — full surface (schemas + types). Backend + type-only frontend imports.
- `@childshield/shared/constants` — plain enum arrays, WS room/channel constants. **TypeBox-free** — the only entry the mobile app imports at runtime (Hermes cannot load TypeBox).
- `@childshield/shared/transitions` — `ALLOWED_TRANSITIONS`, `isTransitionAllowed()`. Also TypeBox-free.
