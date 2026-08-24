// Mnara (stack tower) physics + feel tuning. All world units are px on the
// JS-thread matter-js simulation; screen mapping happens in the game screen.
export const TOWER = {
  /// World gravity (matter default 1 ≈ Earth-ish for px worlds).
  gravityY: 1.15,

  /// Block sprite draw + body size.
  blockW: 86,
  blockH: 34,

  /// Body material: near-dead bounce, high friction so the tower feels
  /// like wood blocks rather than rubber.
  restitution: 0.05,
  friction: 0.9,
  frictionStatic: 1.1,
  density: 0.0022,

  /// Decorative swing (not physics): amplitude as a fraction of screen
  /// width, one full left-right-left cycle in swingPeriodMs.
  swingAmplitudeRatio: 0.3,
  swingPeriodMs: 1900,
  /// How much of the swing's instantaneous velocity carries into the drop —
  /// full carry makes late taps feel unfairly punished.
  swingVelocityCarry: 0.55,

  /// A drop within this many px of the block below counts as "Kamili".
  perfectTolerance: 8,

  /// Any settled block leaning past this (radians) = the tower has toppled.
  toppleAngleRad: 0.5,

  /// A block counts as settled after `settleTicks` consecutive physics
  /// ticks below `settleSpeed` (matter px/step units).
  settleSpeed: 0.22,
  settleTicks: 14,

  /// A body this far (px) below the ground top has fallen off — game over.
  fallMarginPx: 260,

  /// Render/state pool ceiling; toppling ends games long before this.
  maxBlocks: 40,

  /// Static ground platform.
  groundWidthRatio: 0.62,
  groundH: 26,
} as const;
