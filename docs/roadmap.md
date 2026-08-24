# Roadmap & Milestone Status

Phase-1 milestones from [specs/build-plan.md](./specs/build-plan.md).

## Done

- **B0 — Foundations**: monorepo, Docker dev stack, Prisma schema v1 + initial migration, Fastify boot (pino redaction, request IDs, Sentry hook, OpenAPI generation, health/ready), JWT auth with argon2 + TOTP hooks, hash-chained audit plugin with tamper-detection tests.
- **B1 — Case core**: anonymous intake (`createCase`), guarded state machine (`transitionCase`), officer notes (`addNote`), public case-code status, RBAC route guards, consent versions, exhaustive tests (41 passing) incl. the CI-mandatory `test/safeguarding/` suite.
- **Realtime (§5, pulled forward)**: WS gateway with ticket auth, role-scoped rooms, per-case presence, Redis fan-out; `case.created` / `case.transitioned` / `sla.warning` live; SLA clock in the worker.
- **Design**: full mockup set + brand assets, checked into `docs/design/` and `apps/mobile/assets/`.
- **Mobile app (Phase-1 client, pulled forward from the original web-portal plan)**: complete child + officer experiences wired to the real API/WS — see [mobile-app.md](./mobile-app.md).

## Next — B2: Channels (WhatsApp, USSD, SMS)

1. **WhatsApp**: Cloud API webhook receiver with signature verification; Redis-backed conversation state machine feeding `createCase()`; media messages refused with a scripted safe response (zero-content); handoff keywords route to a human. Needs Meta Business + Cloud API credentials. Conversation script is already designed (see the WhatsApp mockup).
2. **USSD**: Africa's Talking callback handler; menu tree language → reporter type → incident type → 160-char description → county → callback opt-in; Redis sessions sized for the 90-second window. Needs an Africa's Talking sandbox + service code. Menu is designed (USSD mockup).
3. **SMS**: HELP keyword flow, structured prompt/reply parser; safe-contact-verified notification path (invariant 8 — the check-shape is already stubbed in the notify worker).
4. **Worker**: flesh out `notify`; add `webhook-retry` with exponential backoff + DLQ.

## Then

- **B3 — ML integration**: wire `apps/ml` into the triage queue; write `CaseEvent(AI_ASSESSMENT)`; emit `ai.assessed` (contract + mobile UI slot already exist); circuit breaker so cases flow unscored when ML is down; dedicated invariant-2 tests.
- **B4 — Override, referrals, notifications**: override module (`override.triggered` contract + supervisor room ready), referral routing/acknowledgment/SLA-breach escalation (designed in the dashboard mockups), guardian notifications gated on `safe_contact_verified`.
- **Dashboard (`apps/dashboard`)**: desktop triage — queue table, override console, referral tracker, audit log viewer. All four screens are fully designed in the mockups; currently a Vite placeholder.
- **B5 — Hardening**: rate limiting, partner webhook signing, CSP, backups + restore drill, load test (10k concurrent, p95 < 2s), Grafana safeguarding dashboards.
- **Mobile pre-pilot**: Sheng copy review by sociolinguists, optional app-lock, accessibility audit (WCAG 2.1 AA / TalkBack / VoiceOver pass), low-end Android profiling.

## Later flags (don't build now, don't forget)

Data-residency/DPIA review before live victim data lands on the VPS; NCMEC/IWF/StopNCII hash integrations; CPIMS integration; on-device PDQ hashing research spike.
