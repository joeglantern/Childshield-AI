# Runbook — Backend Dev Setup

Prereqs: Node 22+, pnpm 10, Docker Desktop. On this machine dev Postgres maps to **host port 5433** (5432 is held by another local container — do not free it).

## First-time setup

```powershell
pnpm install
docker compose -f docker-compose.dev.yml up -d postgres redis   # (+ mailpit ml as needed)
pnpm db:migrate        # prisma migrate dev (packages/db)
pnpm db:seed           # dev staff users + consent versions
```

Test database (integration tests refuse to run against anything not named `*_test`):

```powershell
docker exec childshield-postgres-1 psql -U childshield -c "CREATE DATABASE childshield_test"
```

## Daily commands

```powershell
pnpm --filter @childshield/api dev       # API on :3000 (tsx watch, WS enabled)
pnpm --filter @childshield/worker dev    # BullMQ consumers (sla/triage/notify)
pnpm typecheck && pnpm test              # required green before calling anything done
pnpm openapi:generate                    # refresh docs/openapi/openapi.json
```

Local env: copy `.env.example` → `.env` if you need to override defaults. Dev defaults work without a `.env`.

## Seeded dev credentials (password `childshield-dev-password`)

`officer@childshield.local` (TRIAGE_OFFICER) · `supervisor@` (SUPERVISOR) · `admin@` (ADMIN) · `auditor@` (AUDITOR, read-only). Consent versions: `v1-en`, `v1-sw`.

## Smoke tests

```powershell
# REST + WS end-to-end (needs api dev server + postgres/redis up):
pnpm --filter @childshield/api exec tsx scripts/ws-smoke.ts
```

Manual: `POST /cases` (anonymous intake) → `GET /case-status/{code}` → login → `POST /cases/{id}/transition` → watch `case.transitioned` arrive on the socket.

## Gotchas

- Tests run sequentially against the shared test DB (`fileParallelism:false`); the global setup pushes the Prisma schema automatically.
- Never edit `packages/db/prisma/migrations` by hand — generate new migrations with `prisma migrate dev`.
- pnpm blocks native build scripts by default; the allowlist lives in the root `package.json` (`pnpm.onlyBuiltDependencies`).
- Building in OneDrive is fine (verified); if installs ever hit file-lock errors, retry — do not move `node_modules` manually.
