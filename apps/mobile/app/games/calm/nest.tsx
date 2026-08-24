// Kiota — drag one twig into the nest, once per day. A tiny ritual with a
// streak and no failure state: miss the nest and the twig just springs
// home. Streak lives in on-device AsyncStorage only (GamesContext).
import React, { useCallback, useMemo, useState } from 'react';
import { Image, Text, View } from 'react-native';
import { useStageDimensions } from '../../../src/lib/layout';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { img } from '../../../src/assets';
import { Mascot } from '../../../src/components/Mascot';
import { PressableScale } from '../../../src/components/PressableScale';
import { QuickExitButton } from '../../../src/components/QuickExitButton';
import { CloseIcon } from '../../../src/components/icons';
import { useApp } from '../../../src/state/AppContext';
import { useGames } from '../../../src/state/GamesContext';
import { playSfx } from '../../../src/sounds';
import { submitted, tap } from '../../../src/lib/haptics';
import { spring, springPlayful } from '../../../src/theme/motion';
import { font, palette } from '../../../src/theme/tokens';

const NEST_SIZE = 190;
const TWIG_W = 74;
const TWIG_H = 11;

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function Twig({ rotated }: { rotated?: boolean }) {
  return (
    <View
      style={{
        width: TWIG_W,
        height: TWIG_H,
        borderRadius: TWIG_H / 2,
        backgroundColor: '#8B5E34',
        transform: [{ rotate: rotated ? '-14deg' : '4deg' }],
      }}
    >
      <View
        style={{
          position: 'absolute',
          right: 8,
          top: -4,
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: '#5B8C56',
        }}
      />
    </View>
  );
}

export default function NestScreen() {
  const { t, colors, isDark } = useApp();
  const { calm, recordNestToday } = useGames();
  const insets = useSafeAreaInsets();
  const { width: W, height: H } = useStageDimensions();

  const placedToday = calm.lastNestDate === todayKey();
  const [justPlaced, setJustPlaced] = useState(false);

  // Layout geometry (screen coords): nest center upper-middle, twig rests
  // near the bottom.
  const nestCenter = useMemo(() => ({ x: W / 2, y: insets.top + 96 + NEST_SIZE / 2 }), [W, insets.top]);
  const twigHome = useMemo(() => ({ x: W / 2, y: H - insets.bottom - 130 }), [W, H, insets.bottom]);

  const tx = useSharedValue(0);
  const ty = useSharedValue(0);

  const place = useCallback(() => {
    const ok = recordNestToday();
    if (ok) {
      setJustPlaced(true);
      submitted();
      playSfx('success');
    }
  }, [recordNestToday]);

  const startDrag = useCallback(() => {
    tap();
  }, []);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .enabled(!placedToday && !justPlaced)
        .onBegin(() => {
          'worklet';
          runOnJS(startDrag)();
        })
        .onUpdate((e) => {
          'worklet';
          tx.value = e.translationX;
          ty.value = e.translationY;
        })
        .onEnd((e) => {
          'worklet';
          const x = twigHome.x + e.translationX;
          const y = twigHome.y + e.translationY;
          const dx = x - nestCenter.x;
          const dy = y - nestCenter.y;
          if (Math.hypot(dx, dy) < NEST_SIZE * 0.45) {
            // Landed in the nest: snap to its center and record the day.
            tx.value = withSpring(nestCenter.x - twigHome.x, springPlayful);
            ty.value = withSpring(nestCenter.y + 14 - twigHome.y, springPlayful);
            runOnJS(place)();
          } else {
            tx.value = withSpring(0, spring);
            ty.value = withSpring(0, spring);
          }
        }),
    [placedToday, justPlaced, twigHome, nestCenter, tx, ty, place, startDrag],
  );

  const twigStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }],
  }));

  const streak = calm.nestStreakDays;
  const done = placedToday || justPlaced;

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
          {t.games.calm.nest.title}
        </Text>
        <QuickExitButton />
      </View>

      <GestureDetector gesture={pan}>
        <View style={{ flex: 1 }}>
          {/* Nest */}
          <View
            style={{
              position: 'absolute',
              left: nestCenter.x - NEST_SIZE / 2,
              top: nestCenter.y - NEST_SIZE / 2,
              width: NEST_SIZE,
              height: NEST_SIZE,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Image
              source={img.emptyNest}
              style={{ width: NEST_SIZE, height: NEST_SIZE, resizeMode: 'contain' }}
            />
            {placedToday && !justPlaced && (
              <View style={{ position: 'absolute', top: NEST_SIZE * 0.42 }}>
                <Twig rotated />
              </View>
            )}
          </View>

          {/* Streak + copy */}
          <View
            style={{
              position: 'absolute',
              top: nestCenter.y + NEST_SIZE / 2 + 16,
              left: 24,
              right: 24,
              alignItems: 'center',
              gap: 10,
            }}
          >
            {streak > 0 && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  backgroundColor: palette.amber,
                  borderRadius: 999,
                  paddingVertical: 6,
                  paddingHorizontal: 14,
                }}
              >
                <Text style={{ fontFamily: font.bodyExtra, fontSize: 12, color: palette.ink }}>
                  {t.games.calm.nest.streak(streak)}
                </Text>
              </View>
            )}
            <Text
              style={{
                fontFamily: font.body,
                fontSize: 13,
                lineHeight: 20,
                color: colors.muted,
                textAlign: 'center',
              }}
            >
              {done
                ? justPlaced
                  ? t.games.calm.nest.placed
                  : t.games.calm.nest.alreadyToday
                : t.games.calm.nest.instruction}
            </Text>
            {justPlaced && <Mascot source={img.mascot.celebrate} size={100} variant="pop" />}
          </View>

          {/* Draggable twig */}
          {!placedToday && (
            <Animated.View
              style={[
                {
                  position: 'absolute',
                  left: twigHome.x - TWIG_W / 2,
                  top: twigHome.y - TWIG_H / 2,
                  padding: 18, // generous touch target around the twig
                  margin: -18,
                },
                twigStyle,
              ]}
            >
              <Twig />
            </Animated.View>
          )}

          {/* Resting spot hint */}
          {!done && (
            <View
              style={{
                position: 'absolute',
                left: twigHome.x - 52,
                top: twigHome.y + 18,
                width: 104,
                height: 8,
                borderRadius: 4,
                backgroundColor: isDark ? palette.darkCardAlt : palette.track,
                opacity: 0.7,
              }}
            />
          )}
        </View>
      </GestureDetector>
    </View>
  );
}
