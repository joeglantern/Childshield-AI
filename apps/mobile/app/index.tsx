// Onboarding — four swipeable scenes, each with its own artwork and its own
// animation, ending on the amber "start" CTA. Shown once, then `Anza` (or
// `Ruka`) records the flag and redirects to the tabs.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Image, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Redirect, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import { img } from '../src/assets';
import { ONBOARDING_SCENES, SCENE_COUNT } from '../src/components/OnboardingScenes';
import { PressableScale } from '../src/components/PressableScale';
import { ArrowRightIcon } from '../src/components/icons';
import { useApp } from '../src/state/AppContext';
import { useStageDimensions } from '../src/lib/layout';
import { snap, tap } from '../src/lib/haptics';
import { spring } from '../src/theme/motion';
import { font, palette } from '../src/theme/tokens';

const ONBOARDED_KEY = 'childshield.onboarded';
const nudgeSpring = { damping: 14, stiffness: 30 };

/// Page dot: the active one is a wider amber lozenge, the rest small and pale.
function Dot({ active }: { active: boolean }) {
  const w = useSharedValue(active ? 22 : 8);
  useEffect(() => {
    w.value = withSpring(active ? 22 : 8, spring);
  }, [active, w]);
  const style = useAnimatedStyle(() => ({ width: w.value }));
  return (
    <Animated.View
      style={[
        {
          height: 8,
          borderRadius: 4,
          backgroundColor: active ? palette.amber : '#DCE9E7',
        },
        style,
      ]}
    />
  );
}

export default function Onboarding() {
  const { t } = useApp();
  const insets = useSafeAreaInsets();
  const { width: stageWidth } = useStageDimensions();
  const { height } = useWindowDimensions();
  const [seen, setSeen] = useState<boolean | null>(null);
  const [page, setPage] = useState(0);
  const scroller = useRef<ScrollView | null>(null);

  const reduced = useReducedMotion();
  const nudge = useSharedValue(0);
  useEffect(() => {
    void AsyncStorage.getItem(ONBOARDED_KEY).then((v) => setSeen(v === '1'));
    if (!reduced) {
      nudge.value = withRepeat(
        withSequence(withSpring(4, nudgeSpring), withSpring(0, nudgeSpring)),
        -1,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced]);
  const nudgeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: nudge.value }] }));

  const finish = useCallback(() => {
    void AsyncStorage.setItem(ONBOARDED_KEY, '1');
    snap();
    router.replace('/(tabs)');
  }, []);

  // The scroll offset is the single source of truth for which scene is
  // showing: the CTA only scrolls, and `page` is derived from the offset.
  // Setting both fought each other — a programmatic scroll would race the
  // state update and land on the wrong scene.
  const advance = useCallback(() => {
    if (page >= SCENE_COUNT - 1) {
      finish();
      return;
    }
    tap();
    scroller.current?.scrollTo({ x: (page + 1) * stageWidth, animated: true });
  }, [page, stageWidth, finish]);

  if (seen === null) return null;
  if (seen) return <Redirect href="/(tabs)" />;

  const isLast = page === SCENE_COUNT - 1;
  const scene = t.onboarding.scenes[page] ?? t.onboarding.scenes[0]!;
  // Short screens (or a browser window) shouldn't push the CTA off-screen.
  const compact = height < 700;

  return (
    <View style={{ flex: 1, backgroundColor: palette.warmBg, overflow: 'hidden' }}>
      <View
        style={{
          position: 'absolute',
          width: 260,
          height: 260,
          borderRadius: 130,
          backgroundColor: palette.tealTintAlt,
          top: -90,
          left: -80,
        }}
      />
      <Image
        source={img.shape.confetti}
        style={{
          position: 'absolute',
          width: 90,
          height: 60,
          top: 120,
          right: 30,
          opacity: 0.75,
          resizeMode: 'contain',
        }}
      />
      <Image
        source={img.shape.squiggleTeal}
        style={{
          position: 'absolute',
          width: 130,
          height: 70,
          bottom: 140,
          left: -34,
          opacity: 0.3,
          resizeMode: 'contain',
        }}
      />

      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 20, alignItems: 'flex-end' }}>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={t.common.skip}
          onPress={finish}
          style={{
            backgroundColor: palette.white,
            borderWidth: 1,
            borderColor: 'rgba(5,66,64,0.1)',
            borderRadius: 999,
            paddingVertical: 8,
            paddingHorizontal: 16,
          }}
        >
          <Text style={{ fontFamily: font.bodyBold, fontSize: 12.5, color: palette.textMuted }}>
            {t.common.skip}
          </Text>
        </PressableScale>
      </View>

      <View style={{ flex: 1, justifyContent: 'center' }}>
        <ScrollView
          ref={scroller}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={(e) => {
            const next = Math.max(
              0,
              Math.min(SCENE_COUNT - 1, Math.round(e.nativeEvent.contentOffset.x / stageWidth)),
            );
            if (next !== page) setPage(next);
          }}
          style={{ flexGrow: 0 }}
        >
          {ONBOARDING_SCENES.map((Scene, i) => (
            <View
              key={i}
              style={{ width: stageWidth, alignItems: 'center', justifyContent: 'center' }}
            >
              <Scene />
            </View>
          ))}
        </ScrollView>

        <View style={{ paddingHorizontal: 32, marginTop: compact ? 6 : 16 }}>
          <Text
            style={{
              fontFamily: font.headingX,
              fontSize: 26,
              color: palette.tealText,
              textAlign: 'center',
              lineHeight: 31,
            }}
          >
            {scene.title}
          </Text>
          <Text
            style={{
              fontFamily: font.body,
              fontSize: 14,
              color: palette.textMuted,
              textAlign: 'center',
              marginTop: 10,
              lineHeight: 22,
              minHeight: 44,
            }}
          >
            {scene.body}
          </Text>
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignSelf: 'center',
            alignItems: 'center',
            gap: 7,
            marginTop: compact ? 14 : 24,
          }}
        >
          {ONBOARDING_SCENES.map((_, i) => (
            <Dot key={i} active={i === page} />
          ))}
        </View>
      </View>

      <View style={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 26 }}>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={isLast ? t.onboarding.start : t.onboarding.next}
          onPress={advance}
          style={{
            height: 56,
            borderRadius: 999,
            backgroundColor: palette.amber,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingLeft: 26,
            paddingRight: 8,
            shadowColor: palette.amber,
            shadowOpacity: 0.35,
            shadowRadius: 24,
            shadowOffset: { width: 0, height: 10 },
            elevation: 8,
          }}
        >
          <Text style={{ fontFamily: font.heading, fontSize: 16, color: palette.ink }}>
            {isLast ? t.onboarding.start : t.onboarding.next}
          </Text>
          <Animated.View
            style={[
              {
                width: 42,
                height: 42,
                borderRadius: 21,
                backgroundColor: palette.white,
                alignItems: 'center',
                justifyContent: 'center',
              },
              nudgeStyle,
            ]}
          >
            <ArrowRightIcon size={18} color={palette.amber} />
          </Animated.View>
        </PressableScale>
      </View>
    </View>
  );
}
