# apps/mobile — placeholder

Expo (SDK latest) + Expo Router app, role-gated into two experiences:

- **Child/reporter**: anonymous report flow, case status check via case code, help resources. Quick-exit, privacy screen on background, FLAG_SECURE on Android.
- **Triage officer** (staff login + MFA): live case queue over WebSocket, case detail with timeline, transition actions, override console (supervisor only).

The design source of truth is the approved mockup set in `docs/design/`. The app must use:

- Expo Router **native tabs** (NativeTabs) — real UITabBar on iOS, Material bottom navigation on Android
- Native stack headers, SF Symbols / Material Symbols, expo-haptics
- Types and enums from `@childshield/shared` — never redeclared locally
- Locale files (en / sw / sheng) for every string

Safeguarding constraints that bind this app: zero-content (no image/video upload UI anywhere), anonymity-first (no required PII fields), no sensitive words in notifications or the app switcher preview, no PII in analytics.
