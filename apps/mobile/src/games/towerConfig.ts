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

  /// Decorative swing (not physics). Difficulty ramps with the tower: the
  /// first floors swing slowly over a narrow arc, then each floor shaves
  /// the cycle time and widens the arc toward the caps below. amplitude is
  /// a fraction of stage width; a full left-right-left cycle takes the
  /// period. See swingParams() for the ramp.
  swingStartPeriodMs: 3200,
  swingMinPeriodMs: 1600,
  swingPeriodStepMs: 110,
  swingStartAmplitudeRatio: 0.2,
  swingMaxAmplitudeRatio: 0.32,
  swingAmplitudeStepRatio: 0.008,
  /// How much of the swing's instantaneous velocity carries into the drop —
  /// full carry makes late taps feel unfairly punished.
  swingVelocityCarry: 0.4,

  /// A drop within this many px of the block below counts as "Kamili".
  perfectTolerance: 9,

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

/// Swing speed/arc for the current floor count. Early floors are forgiving
/// (slow, narrow); every floor tightens both until the caps.
export function swingParams(floors: number): { periodMs: number; amplitudeRatio: number } {
  return {
    periodMs: Math.max(
      TOWER.swingMinPeriodMs,
      TOWER.swingStartPeriodMs - floors * TOWER.swingPeriodStepMs,
    ),
    amplitudeRatio: Math.min(
      TOWER.swingMaxAmplitudeRatio,
      TOWER.swingStartAmplitudeRatio + floors * TOWER.swingAmplitudeStepRatio,
    ),
  };
}
