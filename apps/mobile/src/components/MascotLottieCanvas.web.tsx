// Web renderer for <MascotLottie>, using lottie-web.
//
// The native build plays these files through Skia's Skottie, but on web
// Skia is CanvasKit: an 8MB WASM download that also has to finish loading
// before ANY module imports Skia (its web API captures CanvasKit at import
// time). Blocking first paint on that just to bob a mascot is a bad trade,
// and the games already load CanvasKit on demand. lottie-web is a small
// pure-JS player, so web gets the same animation with no WASM.
import React, { useEffect, useRef } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import lottie, { type AnimationItem } from 'lottie-web';

import idleJson from '../../assets/lottie/mascot-idle.json';
import waveJson from '../../assets/lottie/mascot-wave.json';
import cheerJson from '../../assets/lottie/mascot-cheer.json';
import type { MascotAnim, MascotLottieCanvasProps } from './MascotLottieCanvas';

const SOURCES: Record<MascotAnim, unknown> = {
  idle: idleJson,
  wave: waveJson,
  cheer: cheerJson,
};

export default function MascotLottieCanvasWeb({
  anim,
  size,
  loop,
  style,
  onFinish,
  onUnavailable,
}: MascotLottieCanvasProps) {
  const host = useRef<View | null>(null);
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;

  useEffect(() => {
    // react-native-web renders View to a real DOM node.
    const node = host.current as unknown as HTMLElement | null;
    if (!node) return;

    let animation: AnimationItem | null = null;
    try {
      animation = lottie.loadAnimation({
        container: node,
        renderer: 'svg',
        loop,
        autoplay: true,
        animationData: SOURCES[anim],
      });
      animation.addEventListener('complete', () => finishRef.current?.());
    } catch (error) {
      if (__DEV__) {
        console.warn('[MascotLottie] lottie-web could not play the file:', error);
      }
      onUnavailable();
      return;
    }

    return () => animation?.destroy();
  }, [anim, loop, onUnavailable]);

  return <View ref={host} style={[{ width: size, height: size }, style]} />;
}
