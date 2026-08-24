// Onboarding — mascot bobs on a brush-circle halo; shown until "Anza".
import React, { useEffect, useState } from 'react';
import { Image, Text, View } from 'react-native';
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
import { Mascot } from '../src/components/Mascot';
import { PressableScale } from '../src/components/PressableScale';
import { ArrowRightIcon } from '../src/components/icons';
import { useApp } from '../src/state/AppContext';
import { snap } from '../src/lib/haptics';
import { font, palette } from '../src/theme/tokens';

const ONBOARDED_KEY = 'childshield.onboarded';
const nudgeSpring = { damping: 14, stiffness: 30 };

export default function Onboarding() {
  const { t } = useApp();
  const insets = useSafeAreaInsets();
  const [seen, setSeen] = useState<boolean | null>(null);

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

  if (seen === null) return null;
  if (seen) return <Redirect href="/(tabs)" />;

  const finish = () => {
    void AsyncStorage.setItem(ONBOARDED_KEY, '1');
    snap();
    router.replace('/(tabs)');
  };

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
        style={{ position: 'absolute', width: 90, height: 60, top: 120, right: 30, opacity: 0.75, resizeMode: 'contain' }}
      />
      <Image
        source={img.shape.blob}
        style={{ position: 'absolute', width: 110, height: 72, bottom: 150, left: -30, opacity: 0.25, resizeMode: 'contain' }}
      />

      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 20, alignItems: 'flex-end' }}>
        <PressableScale
          accessibilityRole="button"
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

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        <View style={{ marginBottom: 18, alignItems: 'center', justifyContent: 'center' }}>
          <Image
            source={img.shape.brushcircle}
            style={{ position: 'absolute', width: 210, height: 210, opacity: 0.16, resizeMode: 'contain' }}
          />
          <Mascot source={img.mascot.welcome} size={190} variant="bob" />
        </View>
        <Text
          style={{
            fontFamily: font.headingX,
            fontSize: 26,
            color: palette.teal,
            textAlign: 'center',
            lineHeight: 31,
          }}
        >
          {t.onboarding.title}
        </Text>
        <Text
          style={{
            fontFamily: font.body,
            fontSize: 14,
            color: palette.textMuted,
            textAlign: 'center',
            marginTop: 10,
            lineHeight: 22,
          }}
        >
          {t.onboarding.subtitle}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 7, marginTop: 24 }}>
          <View
            style={{
              width: 11,
              height: 11,
              borderRadius: 4,
              backgroundColor: palette.amber,
              transform: [{ rotate: '8deg' }],
            }}
          />
          <View style={{ width: 8, height: 8, borderRadius: 3, backgroundColor: '#DCE9E7' }} />
          <View style={{ width: 8, height: 8, borderRadius: 3, backgroundColor: '#DCE9E7' }} />
        </View>
      </View>

      <View style={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 26 }}>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={t.onboarding.start}
          onPress={finish}
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
            {t.onboarding.start}
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
