// Vector mascot animations, played through Skia's built-in Lottie renderer
// (Skottie). No extra native module: @shopify/react-native-skia is already a
// dependency for the games, and Skottie ships inside it on native and web.
//
// The animation JSON is generated from the brand artwork by
// scripts/vectorize.py + scripts/build_lottie.py — the mascot is rigged into
// body/arm/leg/eye layers, so limbs move independently and it blinks.
//
// Falls back to the static PNG <Mascot> whenever the animation can't or
// shouldn't play: Reduce Motion on, CanvasKit still downloading (web), or
// Skottie rejecting the file. No screen depends on this succeeding.
import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo, View, type StyleProp, type ViewStyle } from 'react-native';

import { img } from '../assets';
import { Mascot } from './Mascot';
import type { MascotAnim } from './MascotLottieCanvas';

export type { MascotAnim };

// Lazy so the player (Skottie on native, lottie-web on web) and the ~50KB of
// animation JSON only load for screens that actually show an animated mascot.
const MascotLottieCanvas = React.lazy(() => import('./MascotLottieCanvas'));

/// Static pose shown whenever the animated version isn't available.
const FALLBACK: Record<MascotAnim, { source: number; variant: 'bob' | 'pop' }> = {
  idle: { source: img.mascot.welcome, variant: 'bob' },
  wave: { source: img.mascot.welcome, variant: 'bob' },
  cheer: { source: img.mascot.celebrate, variant: 'pop' },
};

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduced);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => sub.remove();
  }, []);
  return reduced;
}

interface Props {
  anim: MascotAnim;
  size: number;
  /// idle/wave loop by default; cheer is a one-shot.
  loop?: boolean;
  style?: StyleProp<ViewStyle>;
  /// Fires when a non-looping animation reaches its last frame. The static
  /// fallback fires it too (when its pop lands), so callers can rely on it.
  onFinish?: () => void;
}

export function MascotLottie({ anim, size, loop, style, onFinish }: Props) {
  const reduced = useReducedMotion();
  const [unavailable, setUnavailable] = useState(false);
  const onUnavailable = useCallback(() => setUnavailable(true), []);

  const shouldLoop = loop ?? anim !== 'cheer';
  const fallback = FALLBACK[anim];
  const staticMascot = (
    <View style={[{ width: size, height: size }, style]}>
      <Mascot
        source={fallback.source}
        size={size}
        variant={reduced ? 'still' : fallback.variant}
        onPopLanded={!shouldLoop ? onFinish : undefined}
      />
    </View>
  );

  if (reduced || unavailable) return staticMascot;

  return (
    <Suspense fallback={staticMascot}>
      <MascotLottieCanvas
        anim={anim}
        size={size}
        loop={shouldLoop}
        style={style}
        onFinish={onFinish}
        onUnavailable={onUnavailable}
      />
    </Suspense>
  );
}
