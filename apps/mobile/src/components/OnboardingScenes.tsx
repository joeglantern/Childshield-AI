// Onboarding artwork: one component per scene, each animating something
// different so paging through them feels like four moments rather than one
// layout with the picture swapped.
//
// Motion follows the app rule: springs only (src/theme/motion.ts). Every
// scene honours Reduce Motion by simply rendering its rest pose.
import React, { useEffect } from 'react';
import { Image, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
} from 'react-native-reanimated';

import { img } from '../assets';
import { MascotLottie } from './MascotLottie';
import { palette } from '../theme/tokens';

const STAGE = 250;

/// Slow looping springs. Stiffness this low reads as drifting, not bouncing.
const drift = { damping: 16, stiffness: 10 };
const breathe = { damping: 18, stiffness: 14 };

function useLoop(
  to: number,
  config: { damping: number; stiffness: number },
  delayMs = 0,
  enabled = true,
) {
  const v = useSharedValue(0);
  useEffect(() => {
    if (!enabled) {
      v.value = 0;
      return;
    }
    v.value = withDelay(
      delayMs,
      withRepeat(withSequence(withSpring(to, config), withSpring(0, config)), -1),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, to, delayMs]);
  return v;
}

function Stage({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ width: STAGE, height: STAGE, alignItems: 'center', justifyContent: 'center' }}>
      {children}
    </View>
  );
}

/// 1 — Welcome: the rigged mascot waves hello on a brush halo.
function SceneWelcome() {
  const reduced = useReducedMotion();
  const halo = useLoop(1, breathe, 0, !reduced);
  const haloStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + halo.value * 0.06 }],
    opacity: 0.16 + halo.value * 0.06,
  }));

  return (
    <Stage>
      <Animated.Image
        source={img.shape.brushcircle}
        style={[
          { position: 'absolute', width: 215, height: 215, resizeMode: 'contain' },
          haloStyle,
        ]}
      />
      <MascotLottie anim="wave" size={200} />
    </Stage>
  );
}

/// 2 — Anonymity: the shield cradles the child while a lock settles in and
/// the data specks drift away, i.e. nothing identifying leaves.
function SceneProtected() {
  const reduced = useReducedMotion();
  const hug = useLoop(1, breathe, 0, !reduced);
  const lock = useLoop(1, drift, 400, !reduced);
  const specks = useLoop(1, drift, 800, !reduced);

  const hugStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + hug.value * 0.03 }, { translateY: -hug.value * 4 }],
  }));
  const lockStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -lock.value * 7 }, { rotate: `${-4 + lock.value * 8}deg` }],
  }));
  const speckStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -specks.value * 10 }],
    opacity: 0.5 + specks.value * 0.5,
  }));

  return (
    <Stage>
      <View
        style={{
          position: 'absolute',
          width: 205,
          height: 205,
          borderRadius: 103,
          backgroundColor: palette.tealTintAlt,
        }}
      />
      <Animated.Image
        source={img.shieldHug}
        style={[{ width: 215, height: 205, resizeMode: 'contain' }, hugStyle]}
      />
      <Animated.Image
        source={img.spot.lock}
        style={[
          { position: 'absolute', width: 54, height: 54, left: 6, bottom: 30, resizeMode: 'contain' },
          lockStyle,
        ]}
      />
      <Animated.View
        style={[
          { position: 'absolute', right: 16, top: 34, flexDirection: 'row', gap: 5 },
          speckStyle,
        ]}
      >
        {[7, 10, 6].map((size, i) => (
          <View
            key={i}
            style={{
              width: size,
              height: size,
              borderRadius: 3,
              backgroundColor: i === 1 ? palette.amber : palette.lightTeal,
            }}
          />
        ))}
      </Animated.View>
    </Stage>
  );
}

/// 3 — Reporting: the mascot types on its phone and a paper plane lifts off.
function SceneReport() {
  const reduced = useReducedMotion();
  const bob = useLoop(1, breathe, 0, !reduced);
  const plane = useLoop(1, drift, 200, !reduced);

  const bobStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -bob.value * 6 }],
  }));
  // The plane climbs to the right and fades as it goes, so it reads as sent.
  const planeStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: plane.value * 26 },
      { translateY: -plane.value * 30 },
      { rotate: `${-8 - plane.value * 10}deg` },
    ],
    opacity: 1 - plane.value * 0.55,
  }));

  return (
    <Stage>
      <Image
        source={img.shape.blobLightteal}
        style={{
          position: 'absolute',
          width: 200,
          height: 130,
          bottom: 14,
          opacity: 0.5,
          resizeMode: 'contain',
        }}
      />
      <Animated.Image
        source={img.mascot.phone}
        style={[{ width: 195, height: 203, resizeMode: 'contain' }, bobStyle]}
      />
      <Animated.Image
        source={img.spot.plane}
        style={[
          { position: 'absolute', width: 52, height: 52, right: 22, top: 44, resizeMode: 'contain' },
          planeStyle,
        ]}
      />
    </Stage>
  );
}

/// 4 — Help: the mascot sits with its phone; a ring-buoy and handset pulse
/// gently on either side, standing in for a real person on the line.
function SceneHelp() {
  const reduced = useReducedMotion();
  const sit = useLoop(1, breathe, 0, !reduced);
  const ring = useLoop(1, drift, 300, !reduced);
  const call = useLoop(1, drift, 700, !reduced);

  const sitStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -sit.value * 5 }],
  }));
  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -ring.value * 9 }, { rotate: `${ring.value * 10}deg` }],
  }));
  const callStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + call.value * 0.12 }, { translateY: -call.value * 6 }],
  }));

  return (
    <Stage>
      <Image
        source={img.shape.blobAmber}
        style={{
          position: 'absolute',
          width: 210,
          height: 150,
          bottom: 26,
          opacity: 0.4,
          resizeMode: 'contain',
        }}
      />
      <Animated.Image
        source={img.mascot.phoneSit}
        style={[{ width: 190, height: 210, resizeMode: 'contain' }, sitStyle]}
      />
      <Animated.Image
        source={img.spot.lifering}
        style={[
          { position: 'absolute', width: 50, height: 50, left: 8, top: 52, resizeMode: 'contain' },
          ringStyle,
        ]}
      />
      <Animated.Image
        source={img.spot.phone}
        style={[
          { position: 'absolute', width: 50, height: 50, right: 10, top: 66, resizeMode: 'contain' },
          callStyle,
        ]}
      />
    </Stage>
  );
}

export const ONBOARDING_SCENES = [SceneWelcome, SceneProtected, SceneReport, SceneHelp];
export const SCENE_COUNT = ONBOARDING_SCENES.length;
