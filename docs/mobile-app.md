# Mobile App (`apps/mobile`)

Expo SDK 57 + expo-router (**NativeTabs** — true UITabBar on iOS / Material bottom nav on Android, with `renderingMode="original"` keeping the design's colorful icons), React Native 0.86, Reanimated 4 (springs-only API unchanged), Gesture Handler, FlashList v2, expo-haptics, expo-local-authentication (optional app-lock). Two role-gated experiences in one app: the child reporter and the triage officer. Layouts, copy, and geometry replicate the approved mockups (`docs/design/ChildShield-AI-Screens.dc.html`) exactly.

## Screen map (expo-router routes)

```
app/
  index.tsx                  Onboarding — 4 swipeable animated scenes, then redirects
  decoy.tsx                  Quick-exit decoy ("Notes") — see Safety UX
  settings.tsx               Mipangilio: theme flipper, language, notifications
  (tabs)/                    Child tabs: Nyumbani · Michezo · Hali · Msaada
    index.tsx                Home (greeting hero, amber CTA, action rows)
    games.tsx                Uwanja wa michezo hub: daily trivia hero, Mnara/Kombeo
                             tiles with live records, tilt-maze "coming soon",
                             privacy note, Kona ya utulivu rows
    status.tsx               Hali ya ripoti: case-code entry + 5-step timeline
    help.tsx                 Msaada: Childline 116 call card + resource rows
  games/                     Gameplay stack (tab bar hidden)
    trivia.tsx               Vita vya Maswali — 10 daily safety questions,
                             countdown ring, combo scoring, gentle wrong-answer
                             explanations (content: src/games/triviaQuestions.ts)
    tower.tsx                Mnara — Skia + matter-js stack tower (swing → drop,
                             real toppling, Kamili streaks, on-device high score)
    slingshot.tsx            Kombeo — Skia + matter-js slingshot (drag-back,
                             trajectory dots, 5 levels, 1–3 stars)
    calm/breathing.tsx       Pumzi Tulivu — hold-to-inflate, 4 guided breaths
    calm/bubbles.tsx         Vipovu — tap-to-pop, bubbles regrow, no score
    calm/nest.tsx            Kiota — one twig per day, streak, no failure state
  help/[topic].tsx           Help articles: dcs · tips · friend
  report/                    5-step anonymous flow (FLAG_SECURE on Android)
    consent.tsx              1 — Kabla hatujaanza (language + consent)
    category.tsx             2 — Nini kilitokea?
    persona.tsx              3 — Unaripoti kwa ajili ya nani? (+ age band, county)
    description.tsx          4 — Unaweza kutuelezea zaidi? (skippable)
    review.tsx               5 — Kagua kabla ya kutuma → POST /cases
    success.tsx              Ripoti imetumwa (case code + copy button)
    error.tsx                Samahani… (retry keeps the draft)
  officer/
    login.tsx                Ingia kama afisa (email + password + TOTP)
    (tabs)/                  Officer tabs: Foleni · Takwimu · Akaunti
      queue.tsx              Live WS queue with filters, skeleton/offline/empty states
      stats.tsx              Counts by severity/status/channel from the real queue
      account.tsx            Identity, server, sign out
    case/[id].tsx            Detail: AI advisory box, timeline, transitions, note sheet
```

## Games (`app/games/**`, `src/games/**`)

Real games, fully offline. Tech: `@shopify/react-native-skia` for canvas rendering, `matter-js` for rigid-body physics, `expo-audio` for the Kenney CC0 sound effects (`src/sounds.ts`; `.ogg` added to Metro `assetExts`). matter-js is not worklet-safe, so the simulation steps on the JS thread via requestAnimationFrame (`src/lib/physics.ts`) and writes body poses into Reanimated shared values that Skia reads — React re-renders only on discrete events. Block sprites are grayscale (Kenney CC0, `assets/games/`) tinted to brand colors at render time with a Skia Multiply blend. Records (`src/state/GamesContext.tsx`, key `childshield.games.v1`) are AsyncStorage-only — **no accounts, no server calls, no online leaderboards, ever** (that is a safeguarding decision, not a TODO). Wrong answers/failed levels always get gentle, non-punitive feedback; `palette.critical`/`high` never appear in games. Quick exit stays available on every game screen. NOTE: Skia + expo-audio are native modules — dev clients built before the games feature must be rebuilt with EAS.

Two documented exceptions to the springs-only motion rule live here: the trivia countdown ring and the breathing pace are real-time clocks/paced timers, so they use linear/eased `withTiming` (marked with comments at the call sites).

## Web support

`npx expo start --web` (or press `w` in the dev server) runs the whole app in a browser — useful for quick UI iteration without a dev client. How it works:

- `react-native-web` + `react-dom` are installed. Desktop viewports render the app in a centered 720px stage on a branded backdrop (`src/components/WebShell.tsx`); screens that do absolute-position math use `useStageDimensions()` from `src/lib/layout.ts` instead of `useWindowDimensions`.
- The child tab bar on web is a custom floating pill with the mobile icons (`app/(tabs)/_layout.web.tsx`) because NativeTabs' web renderer draws labels only; tab screens pad their tops by `WEB_TAB_INSET` to clear it.
- The three Skia games load through `WithSkiaWeb` (`src/lib/skiaWeb.tsx`): each `app/games/*.web.tsx` route lazy-imports its screen from `src/games/screens/` only after CanvasKit (Skia's WASM build) finishes loading. The native route files re-export the same screens directly. **canvaskit.wasm is served from `public/` (same origin), never a CDN** — the games' zero-external-network rule applies on web too.
- `metro.config.js` has two web-related resolver pins: `merge-options` (an async-storage web dep whose exports map breaks Metro's interop — "reading 'bind'") resolves to its CJS entry, and `canvaskit-wasm` resolves to an empty stub on non-web platforms (expo-router's require.context sweeps the `*.web.tsx` routes into native graphs, and canvaskit's entry requires `fs`).
- `expo-local-authentication` has no web implementation; the lock gate and settings guard on `Platform.OS === 'web'`. FLAG_SECURE/screen-capture blocking does not exist on web — treat web as a dev/demo target, not a pilot channel for children, until that gap is reviewed.
- Browsers pause `requestAnimationFrame` for hidden tabs, so the physics games freeze in background tabs and resume when visible — no time-jump, because the loop caps each step at 33 ms.

## Onboarding scenes

Four swipeable scenes (`app/index.tsx` + `src/components/OnboardingScenes.tsx`), each with its own artwork and its own motion so paging reads as four moments rather than one layout with the picture swapped: **welcome** (the rigged mascot waves on a breathing brush halo), **anonymity** (`spot-shield-hug` — the shield cradling a child at their tablet — with a lock settling in and the data specks drifting away), **reporting** (mascot at its phone, a paper plane climbing away and fading), and **help** (mascot sitting with its phone, ring-buoy and handset pulsing).

The scroll offset is the single source of truth for the current scene: the CTA only scrolls and `page` is derived from `onScroll`. Driving both fought itself — a programmatic scroll raced the state update and landed on the wrong scene. Copy for each scene lives under `onboarding.scenes` in every locale.

## Animated mascot (Lottie)

`<MascotLottie anim="idle|wave|cheer|party" size={n} />` plays a real vector animation of the brand mascot, rigged into body / arms / hands / legs / eyes / brows layers so limbs swing with overlap and the mascot blinks — not a whole-image bob. `idle` and `wave` loop; `cheer` and `party` are one-shots that fire `onFinish` (used for the Success haptic). `party` is the fists-up celebrate pose; the rest come from the welcome pose.

The files are generated locally from the brand PNGs, with no paid tooling and nothing uploaded anywhere:

1. `scripts/vectorize.py` traces a flat-colour PNG into vector contours (OpenCV: smooth gradients, k-means the palette, walk each colour's outlines plus holes). The mascot art traces to ~40 shapes at 8 colours.
2. `scripts/build_lottie.py` sorts those contours into rig parts by bounding box and builds a **parented** hierarchy — hands parented to arms, everything else to the body — then keyframes each part's own motion.

Two things there are load-bearing, both learned by getting them wrong first:

- **Parent the face to the body.** Animating the face in canvas coordinates alongside the body, even by a slightly different amount, slides it across the shield and the character visibly comes apart. As a child it inherits the body's motion exactly and only animates a blink.
- **Keep shoulder rotation under ~15° on the welcome pose.** The arm is a short stub mostly hidden behind the shield; rotate it further and the stub swings inside the silhouette, leaving the hand floating unattached. Expression belongs in the wrist (hands are their own layers and lag the arm, which is also what gives the motion overlap). The celebrate pose holds its fists clear of the body, so that rig tolerates more.

**Known limit — not every pose can be traced.** The tracer needs bold shapes. Poses whose expression is carried by *thin* strokes do not survive colour quantisation: the anti-aliased edges of a hairline eyebrow or a drawn frown get split between the stroke colour and the body colour, and the feature comes out ragged. The sad pose fails this way (its brows and frown are hairlines), so the error screen deliberately keeps the crisp static PNG via `<Mascot>` rather than a degraded animation. Check any new pose against the original side by side before shipping it; `--clean 1` on the tracer preserves thin strokes better than the default but does not rescue them.

Regenerate with, e.g.:
```
python scripts/vectorize.py assets/mascot-originals/<pose>.png --colors 8 --min-area 400 --smooth 2 --json traced.json
python scripts/build_lottie.py traced.json apps/mobile/assets/lottie/mascot-idle.json --anim idle
```
Rig regions and the animation presets live at the top of `build_lottie.py`. A part is matched only when its whole bbox fits the region — centre-matching swept the shield body into the face layer and the blink squashed the entire character.

Players are split by platform: **native** uses Skia's built-in Lottie renderer (Skottie), which ships inside `@shopify/react-native-skia` — no extra native module. **Web** uses `lottie-web`, because Skia on web is an 8MB CanvasKit WASM download that must also finish loading before anything imports Skia; the player and animation JSON are lazy-loaded into a separate chunk, so neither reaches the main bundle. `<MascotLottie>` falls back to the static PNG `<Mascot>` under Reduce Motion or if a player fails, so no screen depends on it.

## Motion rules (no exceptions)

Everything is `withSpring` — never `timing` with linear/ease curves. Defaults in `src/theme/motion.ts`:

- default spring `{damping:15, stiffness:170}`; playful overshoot `{damping:12, stiffness:200}`
- every button scales to 0.96 on press-in with a spring back (`PressableScale`), paired with a Light haptic
- mascots idle-animate with looping springs: welcome bobs ±7px, celebrate pops with overshoot, sad sways ±2° (`Mascot`); all honor Reduce Motion
- the active status step pulses a soft amber ring (`PulseGlow`)
- list items stagger in at 40 ms per index, translateY 20→0 + fade (`StaggerIn`)
- sheets are gesture-driven, track the finger, rubber-band past rest, and dismiss on velocity (`BottomSheet`)
- screen transitions are interruptible with full-screen back gestures

## Haptics choreography (`src/lib/haptics.ts`)

Light on taps/selection · Medium on step completion + card snaps · **Success exactly when the celebrate mascot's pop lands** (via `onPopLanded`) · Warning on failed/override-grade confirms.

## Data layer

- `src/lib/api.ts` — typed client over the real API; base URL from `EXPO_PUBLIC_API_URL`.
- `src/lib/ws.ts` — queue socket with ticket auth and exponential reconnect; every event triggers a REST refetch (server state wins).
- `src/state/OfficerContext.tsx` — in-memory staff session; `call()` wraps requests with refresh-and-retry on 401.
- `src/state/ReportContext.tsx` — the report draft, memory-only, wiped by quick exit.
- Runtime imports from `@childshield/shared` use only the TypeBox-free entries (`/constants`, `/transitions`); everything else is `import type`. **Do not add a runtime value import from the main entry — TypeBox breaks Hermes.**

## i18n

All user-facing strings live in `src/i18n/{sw,en,sheng}.ts` (Kiswahili is primary and verbatim from the mockups; Sheng needs sociolinguist review before pilot). Never inline a user-facing string. Consent versions map per locale in `src/i18n/index.ts`.

## Safety UX (safeguarding invariants in the client)

- **Quick exit** on every child screen → clears the draft, wipes the stack, lands on the `decoy` Notes screen. Return: tap the "Notes" title 5× quickly. Android back on the decoy exits the app (never back into the flow).
- **Privacy shield**: app switcher preview shows only the logo (AppState overlay).
- **FLAG_SECURE**: screenshots blocked on Android for the whole report flow (`expo-screen-capture` — runtime call, NOT an app.json plugin; it has none).
- **Zero-content**: no media picker exists anywhere; the description step says "Maneno tu".
- **Anonymity**: intake collects no PII; county is the finest location granularity; settings and the case code persist on-device only.
- Severity colors appear in officer views only — never in child flows.
