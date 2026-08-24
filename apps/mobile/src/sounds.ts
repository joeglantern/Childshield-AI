// Sound effect registry + one-shot player for the games feature.
// Sources: Kenney (kenney.nl) Interface Sounds / Impact Sounds packs,
// CC0 1.0 — see assets/sounds/CREDITS.txt. Never re-require inline;
// go through `playSfx()`.
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';

const sources = {
  tap: require('../assets/sounds/tap.ogg'),
  pop: require('../assets/sounds/pop.ogg'),
  thud: require('../assets/sounds/thud.ogg'),
  launch: require('../assets/sounds/launch.ogg'),
  success: require('../assets/sounds/success.ogg'),
  gentleError: require('../assets/sounds/gentle-error.ogg'),
  tick: require('../assets/sounds/tick.ogg'),
} as const;

export type SfxKey = keyof typeof sources;

const players = new Map<SfxKey, AudioPlayer>();

function playerFor(key: SfxKey): AudioPlayer {
  let player = players.get(key);
  if (!player) {
    player = createAudioPlayer(sources[key]);
    players.set(key, player);
  }
  return player;
}

/// Fire-and-forget one-shot SFX playback — safe to call rapidly (each key
/// reuses one persistent native player, just rewound and replayed). Never
/// throws: a sound failing to play must never break gameplay.
export function playSfx(key: SfxKey): void {
  try {
    const player = playerFor(key);
    void player
      .seekTo(0)
      .then(() => player.play())
      .catch(() => undefined);
  } catch {
    // no-op — audio is a nice-to-have, never a hard dependency for play
  }
}
