// Central asset registry — every PNG from the design handoff, required
// statically so Metro bundles them. Use these, never re-require inline.

export const img = {
  logo: require('../assets/logo.png'),
  emptyNest: require('../assets/empty-nest.png'),
  /// The shield cradling a child at their tablet — the platform's promise in
  /// one picture. Used as the onboarding "you are protected" scene.
  shieldHug: require('../assets/spot-shield-hug.png'),

  mascot: {
    welcome: require('../assets/mascot-welcome.png'),
    listen: require('../assets/mascot-listen.png'),
    sad: require('../assets/mascot-sad.png'),
    celebrate: require('../assets/mascot-celebrate.png'),
    phone: require('../assets/mascot-phone.png'),
    /// Sitting cross-legged with a phone; warmer than `phone`, for moments
    /// about being listened to rather than about reporting.
    phoneSit: require('../assets/mascot-phone-sit.png'),
  },

  category: {
    GROOMING: require('../assets/icons/grooming.png'),
    SEXTORTION: require('../assets/icons/sextortion.png'),
    BULLYING: require('../assets/icons/bullying.png'),
    SELF_HARM: require('../assets/icons/selfharm.png'),
    COERCION: require('../assets/icons/coercion.png'),
    HARMFUL_EXPOSURE: require('../assets/icons/exposure.png'),
    OTHER: require('../assets/icons/other.png'),
  },

  spot: {
    phone: require('../assets/icons/spot-phone.png'),
    plane: require('../assets/icons/spot-plane.png'),
    search: require('../assets/icons/spot-search.png'),
    lifering: require('../assets/icons/spot-lifering.png'),
    lock: require('../assets/icons/spot-lock.png'),
    bell: require('../assets/icons/spot-bell.png'),
  },

  nav: {
    home: require('../assets/icons/nav-home.png'),
    status: require('../assets/icons/nav-status.png'),
    help: require('../assets/icons/nav-help.png'),
    shield: require('../assets/icons/nav-shield.png'),
    settings: require('../assets/icons/nav-settings.png'),
    exit: require('../assets/icons/nav-exit.png'),
  },

  // Native tab bar icons — 25pt (75px @3x). UITabBar renders image icons at
  // pixel size as points, so ONLY these belong in NativeTabs.
  tab: {
    home: require('../assets/icons/tab-home.png'),
    status: require('../assets/icons/tab-status.png'),
    help: require('../assets/icons/tab-help.png'),
    inbox: require('../assets/icons/tab-inbox.png'),
    chart: require('../assets/icons/tab-chart.png'),
  },

  st: {
    received: require('../assets/icons/st-received.png'),
    review: require('../assets/icons/st-review.png'),
    talking: require('../assets/icons/st-talking.png'),
    sent: require('../assets/icons/st-sent.png'),
    care: require('../assets/icons/st-care.png'),
    growth: require('../assets/icons/st-growth.png'),
  },

  of: {
    inbox: require('../assets/icons/of-inbox.png'),
    checklist: require('../assets/icons/of-checklist.png'),
    chart: require('../assets/icons/of-chart.png'),
    scroll: require('../assets/icons/of-scroll.png'),
    chain: require('../assets/icons/of-chain.png'),
    warning: require('../assets/icons/of-warning.png'),
    queue: require('../assets/icons/officer-queue.png'),
    override: require('../assets/icons/officer-override.png'),
    sla: require('../assets/icons/officer-sla.png'),
    timeline: require('../assets/icons/officer-timeline.png'),
  },

  p: {
    child: require('../assets/icons/p-child.png'),
    friends: require('../assets/icons/p-friends.png'),
    caregiver: require('../assets/icons/p-caregiver.png'),
    doctor: require('../assets/icons/p-doctor.png'),
    officer: require('../assets/icons/p-officer.png'),
    stophand: require('../assets/icons/p-stophand.png'),
  },

  tm: {
    moon: require('../assets/icons/tm-moon.png'),
    sun: require('../assets/icons/tm-sun.png'),
    sunmoon: require('../assets/icons/tm-sunmoon.png'),
    bell: require('../assets/icons/tm-bell.png'),
    sliders: require('../assets/icons/tm-sliders.png'),
    globe: require('../assets/icons/tm-globe.png'),
  },

  shape: {
    blob: require('../assets/icons/shape-blob.png'),
    blob2: require('../assets/icons/shape-blob2.png'),
    brushcircle: require('../assets/icons/shape-brushcircle.png'),
    confetti: require('../assets/icons/shape-confetti.png'),
    textureDots: require('../assets/icons/texture-dots.png'),
    textureWaves: require('../assets/icons/texture-waves.png'),
    brushTeal: require('../assets/shapes/brush-teal.png'),
    brushAmber: require('../assets/shapes/brush-amber.png'),
    blobLightteal: require('../assets/shapes/blob-lightteal.png'),
    blobAmber: require('../assets/shapes/blob-amber.png'),
    archTeal: require('../assets/shapes/arch-teal.png'),
    squiggleTeal: require('../assets/shapes/squiggle-teal.png'),
  },

  // Grayscale block sprites (Kenney CC0, see assets/games/CREDITS.txt) for
  // the physics games — tinted to brand colors at Skia render time via a
  // Multiply blend, so one neutral sprite serves every color/floor.
  game: {
    blocks: {
      wide: require('../assets/games/blocks/block-wide.png'),
      medium: require('../assets/games/blocks/block-medium.png'),
      tall: require('../assets/games/blocks/block-tall.png'),
    },
  },
} as const;
