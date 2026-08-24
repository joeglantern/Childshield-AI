# ChildShield AI — Documentation

Child online-protection intake and triage platform for Kenya (Phase 1 pilot: Nairobi + Kisumu). Anonymous multi-channel reporting for children 10–18, human-led triage with advisory AI, referral to Childline 116 / DCS.

## Documentation map

| Document | What it covers |
|---|---|
| [architecture.md](./architecture.md) | System overview: monorepo layout, backend modules, state machine, audit chain, realtime design |
| [api-reference.md](./api-reference.md) | Every REST endpoint and WebSocket event, with auth and payloads |
| [mobile-app.md](./mobile-app.md) | The Expo app: screens, navigation, motion rules, haptics, i18n, safety UX |
| [design-system.md](./design-system.md) | Colors, typography, radii, asset inventory, severity coding rules |
| [safeguarding.md](./safeguarding.md) | The nine invariants, where each is enforced in code, and the CI tests that guard them |
| [roadmap.md](./roadmap.md) | Milestone status and what B2+ needs |
| [PENDING.md](./PENDING.md) | **Living checklist of remaining work** — update as items land |
| [presentation/CONTENT.md](./presentation/CONTENT.md) | Slide-by-slide content for the brand presentation (with speaker notes) |
| [runbooks/dev-setup.md](./runbooks/dev-setup.md) | Local backend setup: Docker, database, seeds, tests, smoke tests |
| [runbooks/mobile-dev.md](./runbooks/mobile-dev.md) | Running the app on a phone, EAS builds, and every gotcha we hit (firewall, IPs, Metro) |
| [openapi/openapi.json](./openapi/openapi.json) | Generated OpenAPI 3 spec (regenerate with `pnpm openapi:generate`) |
| [design/ChildShield-AI-Screens.dc.html](./design/ChildShield-AI-Screens.dc.html) | The approved screen mockups (design source of truth) |
