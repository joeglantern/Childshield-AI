# Runbook — Mobile Dev & Builds

## One-time setup (do this once, on this or any new machine)

Windows blocks inbound connections on networks it doesn't trust ("Public" profile) — new Wi-Fi networks default to Public, so every network switch used to require re-fixing this. Fixed **permanently** by opening the dev ports on every profile, once, as Administrator:

```powershell
New-NetFirewallRule -DisplayName "ChildShield Dev - Metro" -Direction Inbound -Protocol TCP -LocalPort 8081 -Action Allow -Profile Any
New-NetFirewallRule -DisplayName "ChildShield Dev - API" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow -Profile Any
```

`-Profile Any` means these two ports stay reachable regardless of what category Windows assigns any given network (home, work, hotel, airport) — you never need to touch `Set-NetConnectionProfile` again.

## Run on a phone (dev)

```powershell
cd apps\mobile
pnpm start          # auto-detects your current LAN IP, writes apps/mobile/.env, then starts Metro
pnpm start:clear    # same, plus --clear (use after dependency/resolver changes)
pnpm start:tunnel   # bypasses LAN entirely (see Troubleshooting) — does not auto-sync .env
```

`pnpm start` runs `scripts/sync-lan-ip.ps1` first, which detects the active Wi-Fi adapter's IPv4 and writes `EXPO_PUBLIC_API_URL` into `apps/mobile/.env` automatically — **you never hand-edit this file or run `ipconfig` yourself.** Switch networks, then just run `pnpm start` again.

Backend must be running (see [dev-setup.md](./dev-setup.md)). Env vars are baked in when Metro serves the bundle, which is why the sync step must run before `expo start` (the npm scripts already order this for you).

- **Expo Go** also works (all libraries are Go-compatible): `npx expo start`, scan the QR.
- **Dev-client** (the EAS build installed on the phone): connect via **"Enter URL manually"** → `http://<PC-LAN-IP>:8081` — don't rely on the auto-discovery list (it needs the CLI logged into the same Expo account).

## Builds (EAS — required on Windows for iOS)

```powershell
npx eas-cli build --profile development --platform ios      # dev client, needs Apple account for device installs
npx eas-cli build --profile development --platform android  # or: npx expo run:android locally with Android Studio
```

EAS project: `@afosi/childshield`. iOS encryption prompt: answer **Y** (standard/exempt — set in app.json as `ITSAppUsesNonExemptEncryption:false`).

## Troubleshooting (everything we actually hit)

| Symptom | Cause → fix |
|---|---|
| Phone can't find/reach the dev server | If the one-time firewall rules above aren't applied yet, do that first — it fixes this for every network permanently. Verify from phone Safari: `http://<PC-IP>:8081/status` should return `packager-status:running` |
| Reaches Metro but the app won't connect | iOS **Local Network** permission: Settings → Privacy & Security → Local Network → ChildShield → ON. Then connect by manual URL |
| PC IP changed / switched networks | Just run `pnpm start` again — it re-syncs `.env` automatically. Don't hand-edit the file or run `ipconfig` yourself |
| "A React Element from an older version of React was rendered" | Duplicate React copies in the monorepo (dashboard has 18, mobile 19). Fixed by singleton pinning in `metro.config.js` — if it recurs, restart with `--clear` |
| "Cannot read property 'defineProperty' of undefined" (Hermes) + routes "missing default export" | TypeBox entered the bundle. Mobile code must import runtime values ONLY from `@childshield/shared/constants` or `/transitions`; the main entry is `import type` only |
| `expo config`/`export` crashes on `expo-modules-core/src/index.ts` | A package without a config plugin was listed in `app.json` `plugins` (e.g. `expo-screen-capture` has none — it's runtime-only). Remove it from plugins |
| Metro "Unable to resolve ./enums.js" | The shared package uses NodeNext `.js` specifiers; the resolver retry in `metro.config.js` handles it — don't remove that block |
| Stuck on the "Notes" screen | That's the quick-exit decoy (by design). Tap the "Notes" title 5× quickly to return |
| Metro says a file "does not exist" that clearly exists / "Failed to get SHA-1" | **OneDrive reparse points** — SDK 57 Metro drops OneDrive-synced files from its file map. Run `powershell -File scripts\fix-onedrive-metro.ps1` and retry. Permanent fix: move the repo out of OneDrive (see docs/PENDING.md) |
| VS Code says `expo/tsconfig.base not found` but CLI passes | Stale TS server. tsconfig now extends the file by relative path; restart the TS server |

## Performance notes

- Asset PNGs are pre-optimized (15.6 MB → 1.4 MB). If you add assets, resize to ≤ @3x render size and strip metadata before committing.
- Queue lists use FlashList (virtualized); keep `estimatedItemSize` accurate.
- All animations are springs on the UI thread (Reanimated); never add a JS-driven `Animated.timing`.
