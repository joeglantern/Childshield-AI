# Pending Work

> Living checklist — update this file as items land. Status legend: ⬜ not started · 🟨 partially built · ⛔ blocked on something external.
> Last updated: **2026-08-21** (post SDK-57 upgrade, B3 ML wiring, dashboard v1).

## ✅ Resolved 2026-08-21: repo location + Metro bundling

The repo now lives at **`C:\Users\liban\Projects\Childshield`** (moved out of OneDrive — its reparse points broke Metro's crawler). A second, unrelated bundling bug was also fixed: Metro cannot cope with pnpm's default hardlinked installs on Windows (nondeterministic "Unable to resolve module ./types" from expo-router internals), so the root `.npmrc` now sets `package-import-method=copy`. **Never remove that line.** The old OneDrive copy is stale — do not work in it.

## Mobile app

- ⬜ **Rebuild dev clients** — required after the SDK 57 upgrade + `expo-local-authentication`, and now ALSO for the games feature's new native modules (`@shopify/react-native-skia`, `expo-audio`): `npx eas-cli build --profile development --platform ios|android`. Games screens will fail on the old dev client until this is done.
- ⬜ **Trivia question bank review** (`src/games/triviaQuestions.ts`) — first-draft safety-scenario content (grooming/sextortion/bullying/coercion themes at a 10-year-old reading level, sw + en). Needs a child-protection-specialist + sociolinguist pass before pilot, same as the Sheng copy; include the tone of all game copy (never-punitive failure states) in that review.
- ⬜ **Games on-device QA** — physics feel tuning (`src/games/towerConfig.ts`, slingshot constants), haptic choreography, 60fps check on low-end Android. All games are offline/on-device-only by design (no accounts, no leaderboards) — keep it that way.
- ⬜ **Push notifications** — settings toggle exists, no infra. Needs `expo-notifications`, a push-token registration endpoint, and delivery from the B2 `notify` worker. HARD RULE: payloads must never contain case content or sensitive words.
- ⬜ **Sheng copy review** by sociolinguists (current Sheng is a light-touch draft inheriting from Kiswahili).
- ⬜ **Accessibility audit** — labels exist on all controls and reduce-motion is honored; still needs a full VoiceOver/TalkBack pass, Dynamic Type/font-scaling sweep, and WCAG AA contrast verification.
- ⬜ **Low-end Android profiling** (cold start, list perf) + release/store profiles in `eas.json`, store listings, privacy labels.
- 🟨 **NativeTabs polish** — implemented (real UITabBar/Material bar, original-color icons); verify on-device look on iOS 26 liquid glass and Android 16, tune `labelStyle`/tint if needed.

## Dashboard (`apps/dashboard`)

- 🟨 **v1 built**: login (TOTP), live queue table (WS-driven), case detail (AI box, timeline, transitions, notes), **Takwimu (stats)**, **Ukaguzi (audit log viewer, role-gated)**. Sidebar icons all navigate for real now — no dead clicks. Run: `pnpm --filter @childshield/dashboard dev` (+ `VITE_API_URL` if not localhost).
- ✅ **Audit log viewer** (`GET /audit`, AUDITOR/SUPERVISOR/ADMIN) — paginated, resolves actor names + case codes, live chain-verification badge (flips red if tampered). Route lives outside the audit module's protected export surface (`apps/api/src/modules/audit/routes.ts`) so the safeguarding test pinning that module's exports (append+verify only) is untouched.
- ✅ **Stats** — computed client-side from `GET /cases`, no new endpoint needed.
- ⬜ **Override console** (supervisor) — needs the B4 override module + endpoints. Screen fully designed in the mockups.
- ⬜ **Referral tracker** — needs B4 referral endpoints. Designed. Sidebar icon shows a "coming soon" toast in the meantime.
- ⬜ Presence indicators + per-case room subscription (parity with mobile).

## Backend — Milestone B2: Channels

- ⛔ **WhatsApp** — Cloud API webhook receiver + Redis conversation state machine → `createCase()`; media refused with the scripted safe response. Blocked on: Meta Business account + Cloud API credentials. Conversation script designed.
- ⛔ **USSD** — Africa's Talking callback handler with the designed menu tree, 90-second Redis sessions. Blocked on: Africa's Talking sandbox + service code.
- ⬜ **SMS** — HELP keyword flow + parser; safe-contact-verified notification path (check-shape already stubbed in the notify worker).
- ⬜ **Worker**: flesh out `notify`; add `webhook-retry` queue (exponential backoff + DLQ).

## Backend — Milestone B3: ML

- 🟨 **Pipeline wired end-to-end**: createCase → `triage` queue → ML classify/severity → `CaseEvent(AI_ASSESSMENT)` + audit → `ai.assessed` WS → AI box renders in mobile + dashboard. Currently the keyword/rule **stub** model.
- ⬜ Replace the stub with the fine-tuned AfroXLMR model (int8 CPU) — pipeline needs no changes.
- ⬜ Calibration review of severity tiers; model-confidence Grafana panel (B5).

## Backend — Milestone B4: Override, referrals, notifications

- ⬜ Override module (§3.8): threshold config in DB, imminent-harm flag, `OverrideEvent` + `override.triggered` WS (contract + supervisor room already exist), weekly review export.
- ⬜ Referral service: partner routing table, dispatch, acknowledgment tracking, SLA-breach escalation.
- ⬜ Guardian notifications via SMS/WhatsApp — gated on `safe_contact_verified === true` (invariant 8), with dedicated safeguarding tests.

## Backend — Milestone B5: Hardening & ops

- ⬜ Rate limiting, partner webhook request signing, CSP/security headers, dependency audit in CI.
- ⬜ Backups: nightly encrypted `pg_dump` off-site (restic) + documented restore drill.
- ⬜ Load test to pilot targets (10k concurrent, p95 < 2s); Grafana safeguarding dashboards (time-to-human-triage, override frequency, model confidence, referral SLA).
- ⬜ Kill-switch feature flags (disable any channel or ML instantly without deploy).
- ⬜ Deployment: VPS provisioning, Caddy domains, GitHub Actions deploy job.

## Ops / repo

- ⬜ **Initial git commit + GitHub remote** — the repo has zero commits; the CI workflow activates on first push. (Waiting for explicit go-ahead.)
- ⬜ Data-residency/DPIA review before any live victim data (ODPC).
- ⬜ Phase-2 flags: NCMEC/IWF/StopNCII hash integrations, CPIMS, on-device PDQ hashing spike.
