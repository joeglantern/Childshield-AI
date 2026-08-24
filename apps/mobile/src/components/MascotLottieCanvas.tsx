// The Skia half of <MascotLottie>. Kept in its own module because on web
// nothing may import Skia until CanvasKit's WASM has loaded — MascotLottie
// therefore pulls this in lazily, the same rule the game routes follow.
import React, { useMemo } from 'react';
import { type StyleProp, type ViewStyle } from 'react-native';
import { Canvas, Skia, Skottie } from '@shopify/react-native-skia';
import { useFrameCallback, useSharedValue, type SharedValue } from 'react-native-reanimated';

import idleJson from '../../assets/lottie/mascot-idle.json';
import waveJson from '../../assets/lottie/mascot-wave.json';
import cheerJson from '../../assets/lottie/mascot-cheer.json';

export type MascotAnim = 'idle' | 'wave' | 'cheer';

const SOURCES: Record<MascotAnim, unknown> = {
  idle: idleJson,
  wave: waveJson,
  cheer: cheerJson,
};

/// Advances `frame` in real time, looping or holding on the last frame.
function useLottieClock(
  frame: SharedValue<number>,
  totalFrames: number,
  fps: number,
  loop: boolean,
  onFinish?: () => void,
): void {
  const finished = useSharedValue(false);
  useFrameCallback((info) => {
    'worklet';
    if (totalFrames <= 0) return;
    const raw = ((info.timeSinceFirstFrame ?? 0) / 1000) * fps;
    if (loop) {
      frame.value = raw % totalFrames;
      return;
    }
    if (raw >= totalFrames - 1) {
      frame.value = totalFrames - 1;
      if (!finished.value) {
        finished.value = true;
        if (onFinish) onFinish();
      }
      return;
    }
    frame.value = raw;
  }, true);
}

export interface MascotLottieCanvasProps {
  anim: MascotAnim;
  size: number;
  loop: boolean;
  style?: StyleProp<ViewStyle>;
  onFinish?: () => void;
  /// Called if Skottie rejects the animation, so the caller can fall back.
  onUnavailable: () => void;
}

export default function MascotLottieCanvas({
  anim,
  size,
  loop,
  style,
  onFinish,
  onUnavailable,
}: MascotLottieCanvasProps) {
  const animation = useMemo(() => {
    try {
      return Skia.Skottie.Make(JSON.stringify(SOURCES[anim]));
    } catch (error) {
      if (__DEV__) {
        console.warn('[MascotLottie] Skottie rejected the animation:', error);
      }
      return null;
    }
  }, [anim]);

  const frame = useSharedValue(0);
  useLottieClock(
    frame,
    animation ? animation.duration() * animation.fps() : 0,
    animation?.fps() ?? 60,
    loop,
    onFinish,
  );

  React.useEffect(() => {
    if (!animation) onUnavailable();
  }, [animation, onUnavailable]);

  if (!animation) return null;

  return (
    <Canvas style={[{ width: size, height: size }, style]}>
      <Skottie animation={animation} frame={frame} />
    </Canvas>
  );
}
