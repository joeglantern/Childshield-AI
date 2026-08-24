// Vipovu — tap-to-pop bubbles. Pure toy: no score, bubbles quietly grow
// back, springPlayful pops with a light haptic each.
import React, { useCallback, useMemo, useRef } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated';
import { PressableScale } from '../../../src/components/PressableScale';
import { QuickExitButton } from '../../../src/components/QuickExitButton';
import { StaggerIn } from '../../../src/components/StaggerIn';
import { CloseIcon } from '../../../src/components/icons';
import { useApp } from '../../../src/state/AppContext';
import { playSfx } from '../../../src/sounds';
import { tap } from '../../../src/lib/haptics';
import { springPlayful } from '../../../src/theme/motion';
import { font } from '../../../src/theme/tokens';

const COLS = 4;
const ROWS = 6;

const LIGHT_COLORS = ['#BFE4E2', '#FBD9A9', '#A9DEDC', '#F6C98D', '#CBE9E7', '#B2E0DD'];
const DARK_COLORS = ['#1D4744', '#3A5A45', '#22524E', '#4A5A3A', '#274E4B', '#1D4744'];

function Bubble({ size, color, index }: { size: number; color: string; index: number }) {
  const scale = useSharedValue(1);
  const poppedRef = useRef(false);

  const pop = useCallback(() => {
    if (poppedRef.current) return;
    poppedRef.current = true;
    tap();
    playSfx('pop');
    scale.value = withSpring(0, springPlayful);
    // Grow back after a quiet pause (staggered by position so regrowth
    // never feels mechanical).
    const delay = 1800 + ((index * 613) % 1700);
    scale.value = withDelay(delay, withSpring(1, springPlayful));
    setTimeout(() => {
      poppedRef.current = false;
    }, delay + 250);
  }, [scale, index]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          alignItems: 'flex-start',
          justifyContent: 'flex-start',
        },
        style,
      ]}
    >
      {/* sheen */}
      <View
        style={{
          width: size * 0.22,
          height: size * 0.22,
          borderRadius: size * 0.11,
          backgroundColor: 'rgba(255,255,255,0.55)',
          marginTop: size * 0.16,
          marginLeft: size * 0.18,
        }}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="pop"
        onPress={pop}
        style={{ position: 'absolute', width: '100%', height: '100%' }}
      />
    </Animated.View>
  );
}

export default function BubblesScreen() {
  const { t, colors, isDark } = useApp();
  const insets = useSafeAreaInsets();
  const { width: W } = useWindowDimensions();

  const gap = 14;
  const pad = 22;
  const size = (W - pad * 2 - gap * (COLS - 1)) / COLS;
  const bubbleColors = isDark ? DARK_COLORS : LIGHT_COLORS;

  const cells = useMemo(() => Array.from({ length: COLS * ROWS }, (_, i) => i), []);

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
          {t.games.calm.bubbles.title}
        </Text>
        <QuickExitButton />
      </View>

      <Text
        style={{
          fontFamily: font.body,
          fontSize: 12.5,
          color: colors.muted,
          textAlign: 'center',
          marginTop: 10,
        }}
      >
        {t.games.calm.bubbles.instruction}
      </Text>

      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap,
          padding: pad,
          alignContent: 'center',
          justifyContent: 'center',
        }}
      >
        {cells.map((i) => (
          <StaggerIn key={i} index={i % COLS}>
            <Bubble size={size} color={bubbleColors[i % bubbleColors.length]!} index={i} />
          </StaggerIn>
        ))}
      </View>
      <View style={{ height: insets.bottom + 6 }} />
    </View>
  );
}
