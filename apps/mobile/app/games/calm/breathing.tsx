// Pumzi Tulivu — hold-to-inflate breathing. Zero-pressure: no score, no
// timer pressure, nothing to fail. Haptic on every phase change.
import React, { useCallback, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useStageDimensions } from '../../../src/lib/layout';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { img } from '../../../src/assets';
import { Mascot } from '../../../src/components/Mascot';
import { PressableScale } from '../../../src/components/PressableScale';
import { QuickExitButton } from '../../../src/components/QuickExitButton';
import { CloseIcon } from '../../../src/components/icons';
import { useApp } from '../../../src/state/AppContext';
import { playSfx } from '../../../src/sounds';
import { snap, submitted, tap } from '../../../src/lib/haptics';
import { font, palette, radius } from '../../../src/theme/tokens';

const BREATHS = 4;
const MIN_SCALE = 1;
const MAX_SCALE = 1.55;
/// EXCEPTION to the springs-only motion rule (documented): breathing is a
/// paced timer, not UI juice — inhale/exhale must run at a steady, guided
/// pace, so withTiming with a gentle ease, never a spring.
const INHALE_MS = 3500;
const EXHALE_MS = 3500;
const easing = Easing.inOut(Easing.quad);

type Phase = 'idle' | 'inhale' | 'hold' | 'exhale' | 'done';

export default function BreathingScreen() {
  const { t, colors, isDark } = useApp();
  const insets = useSafeAreaInsets();
  const { width: W } = useStageDimensions();

  const [phase, setPhase] = useState<Phase>('idle');
  const [breaths, setBreaths] = useState(0);
  const phaseRef = useRef<Phase>('idle');
  const scale = useSharedValue(MIN_SCALE);

  const setPhaseBoth = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  const onInhaleFull = useCallback(() => {
    if (phaseRef.current !== 'inhale') return;
    setPhaseBoth('hold');
    snap();
  }, [setPhaseBoth]);

  const onExhaleDone = useCallback(() => {
    if (phaseRef.current !== 'exhale') return;
    tap();
    setBreaths((b) => {
      const next = b + 1;
      if (next >= BREATHS) {
        setPhaseBoth('done');
        submitted();
        playSfx('success');
      } else {
        setPhaseBoth('idle');
      }
      return next;
    });
  }, [setPhaseBoth]);

  const pressIn = useCallback(() => {
    if (phaseRef.current === 'done') return;
    tap();
    setPhaseBoth('inhale');
    cancelAnimation(scale);
    const remaining = (MAX_SCALE - scale.value) / (MAX_SCALE - MIN_SCALE);
    scale.value = withTiming(
      MAX_SCALE,
      { duration: Math.max(200, INHALE_MS * remaining), easing },
      (finished) => {
        if (finished) runOnJS(onInhaleFull)();
      },
    );
  }, [scale, setPhaseBoth, onInhaleFull]);

  const pressOut = useCallback(() => {
    if (phaseRef.current !== 'inhale' && phaseRef.current !== 'hold') return;
    setPhaseBoth('exhale');
    cancelAnimation(scale);
    const remaining = (scale.value - MIN_SCALE) / (MAX_SCALE - MIN_SCALE);
    scale.value = withTiming(
      MIN_SCALE,
      { duration: Math.max(200, EXHALE_MS * remaining), easing },
      (finished) => {
        if (finished) runOnJS(onExhaleDone)();
      },
    );
  }, [scale, setPhaseBoth, onExhaleDone]);

  const circleStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const circleSize = Math.min(W * 0.52, 230);

  const label =
    phase === 'idle'
      ? t.games.calm.breathing.instructionHold
      : phase === 'inhale'
        ? t.games.calm.breathing.inhale
        : phase === 'hold'
          ? t.games.calm.breathing.hold
          : phase === 'exhale'
            ? t.games.calm.breathing.exhale
            : t.games.calm.breathing.done;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 16,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={t.common.cancel}
          onPress={() => router.back()}
          style={{
            width: 36,
            height: 36,
            borderRadius: 13,
            backgroundColor: colors.card,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CloseIcon size={18} color={colors.text} />
        </PressableScale>
        <Text style={{ fontFamily: font.heading, fontSize: 17, color: colors.heading }}>
          {t.games.calm.breathing.title}
        </Text>
        <QuickExitButton />
      </View>

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        {phase === 'done' ? (
          <View style={{ alignItems: 'center', gap: 14 }}>
            <Mascot source={img.mascot.celebrate} size={130} variant="pop" />
            <Text
              style={{
                fontFamily: font.heading,
                fontSize: 19,
                color: colors.heading,
                textAlign: 'center',
              }}
            >
              {t.games.calm.breathing.done}
            </Text>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={t.common.retry}
              onPress={() => {
                setBreaths(0);
                setPhaseBoth('idle');
              }}
              style={{
                marginTop: 8,
                borderRadius: radius.button,
                backgroundColor: palette.amber,
                paddingVertical: 13,
                paddingHorizontal: 34,
              }}
            >
              <Text style={{ fontFamily: font.heading, fontSize: 15, color: palette.ink }}>
                {t.common.retry}
              </Text>
            </PressableScale>
          </View>
        ) : (
          <>
            <View
              style={{
                width: circleSize * MAX_SCALE + 24,
                height: circleSize * MAX_SCALE + 24,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* Outer guide ring marks "full breath" */}
              <View
                style={{
                  position: 'absolute',
                  width: circleSize * MAX_SCALE,
                  height: circleSize * MAX_SCALE,
                  borderRadius: (circleSize * MAX_SCALE) / 2,
                  borderWidth: 2,
                  borderColor: isDark ? palette.darkDot : palette.track,
                }}
              />
              <Animated.View
                style={[
                  {
                    width: circleSize,
                    height: circleSize,
                    borderRadius: circleSize / 2,
                    backgroundColor: isDark ? palette.darkAccent : palette.lightTeal,
                    opacity: 0.9,
                    alignItems: 'center',
                    justifyContent: 'center',
                  },
                  circleStyle,
                ]}
              >
                <View
                  style={{
                    width: circleSize * 0.62,
                    height: circleSize * 0.62,
                    borderRadius: (circleSize * 0.62) / 2,
                    backgroundColor: isDark ? palette.darkCardAlt : palette.teal,
                  }}
                />
              </Animated.View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={label}
                onPressIn={pressIn}
                onPressOut={pressOut}
                style={{ position: 'absolute', width: '100%', height: '100%' }}
              />
            </View>
            <Text
              style={{
                fontFamily: font.heading,
                fontSize: 19,
                color: colors.heading,
                marginTop: 26,
              }}
            >
              {label}
            </Text>
            <Text
              style={{
                fontFamily: font.bodySemi,
                fontSize: 13,
                color: colors.muted,
                marginTop: 6,
              }}
            >
              {t.games.calm.breathing.cycleOf(Math.min(breaths + 1, BREATHS), BREATHS)}
            </Text>
          </>
        )}
      </View>
    </View>
  );
}
