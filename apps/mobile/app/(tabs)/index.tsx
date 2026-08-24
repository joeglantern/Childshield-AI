import React, { useEffect } from 'react';
import { Image, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import { img } from '../../src/assets';
import { PressableScale } from '../../src/components/PressableScale';
import { QuickExitButton } from '../../src/components/QuickExitButton';
import { PixelDots } from '../../src/components/PixelDots';
import { ArrowRightIcon } from '../../src/components/icons';
import { CardRow, SectionLabel } from '../../src/components/ui';
import { useApp } from '../../src/state/AppContext';
import { WEB_TAB_INSET } from '../../src/lib/layout';
import { font, palette, radius } from '../../src/theme/tokens';

const driftSpring = { damping: 15, stiffness: 14 };

/// The paper plane on the CTA drifts gently (translate + slight rotate).
function DriftingPlane() {
  const reduced = useReducedMotion();
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const rot = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    tx.value = withRepeat(withSequence(withSpring(4, driftSpring), withSpring(0, driftSpring)), -1);
    ty.value = withRepeat(withSequence(withSpring(-6, driftSpring), withSpring(0, driftSpring)), -1);
    rot.value = withRepeat(withSequence(withSpring(4, driftSpring), withSpring(0, driftSpring)), -1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { rotate: `${rot.value}deg` }],
  }));
  return (
    <Animated.Image
      source={img.spot.plane}
      style={[{ width: 38, height: 38, resizeMode: 'contain' }, style]}
    />
  );
}

export default function Home() {
  const { t, colors, isDark } = useApp();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 26 }}>
        <View
          style={{
            paddingTop: insets.top + 8 + WEB_TAB_INSET,
            paddingHorizontal: 16,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={t.settings.title}
            onPress={() => router.push('/settings')}
            style={{
              width: 38,
              height: 38,
              borderRadius: 13,
              backgroundColor: colors.card,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Image
              source={isDark ? img.tm.moon : img.nav.settings}
              style={{ width: 22, height: 22, resizeMode: 'contain' }}
            />
          </PressableScale>
          <QuickExitButton />
        </View>

        {/* Greeting hero card */}
        <View
          style={{
            marginTop: 10,
            marginHorizontal: 16,
            backgroundColor: colors.card,
            paddingTop: 20,
            paddingHorizontal: 20,
            paddingBottom: 16,
            borderRadius: radius.hero,
            overflow: 'hidden',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            shadowColor: palette.ink,
            shadowOpacity: isDark ? 0 : 0.06,
            shadowRadius: 20,
            shadowOffset: { width: 0, height: 6 },
            elevation: 3,
          }}
        >
          <View
            style={{
              position: 'absolute',
              width: 150,
              height: 150,
              borderRadius: 80,
              backgroundColor: isDark ? palette.darkCardAlt : palette.tealTintAlt,
              top: -60,
              right: -50,
            }}
          />
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontFamily: font.headingX,
                fontSize: 25,
                color: isDark ? palette.darkAccent : palette.teal,
                lineHeight: 29,
              }}
            >
              {t.home.greeting}
            </Text>
            <Image
              source={img.shape.brushAmber}
              style={{ width: 92, height: 14, marginTop: 2 }}
              resizeMode="stretch"
            />
            <Text
              style={{
                fontFamily: font.body,
                fontSize: 12.5,
                color: colors.muted,
                marginTop: 5,
                lineHeight: 19,
              }}
            >
              {t.home.safeHere}
            </Text>
            <View style={{ marginTop: 10 }}>
              <PixelDots dark={isDark} />
            </View>
          </View>
          <Image
            source={img.mascot.welcome}
            style={{ width: 112, height: 112, resizeMode: 'contain' }}
          />
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
          <SectionLabel>{t.home.howCanIHelp}</SectionLabel>

          {/* Primary amber CTA */}
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={t.home.tellMe}
            onPress={() => router.push('/report/consent')}
            style={{
              backgroundColor: palette.amber,
              borderRadius: radius.card,
              padding: 18,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
              <DriftingPlane />
              <View>
                <Text style={{ fontFamily: font.heading, fontSize: 15.5, color: palette.ink }}>
                  {t.home.tellMe}
                </Text>
                <Text
                  style={{
                    fontFamily: font.body,
                    fontSize: 12,
                    color: palette.amberInk,
                    marginTop: 3,
                  }}
                >
                  {t.home.tellMeSub}
                </Text>
              </View>
            </View>
            <View
              style={{
                width: 30,
                height: 30,
                borderRadius: 15,
                backgroundColor: palette.white,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ArrowRightIcon size={16} color={isDark ? palette.high : palette.teal} />
            </View>
          </PressableScale>

          {/* Secondary rows */}
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: radius.card,
              shadowColor: palette.ink,
              shadowOpacity: isDark ? 0 : 0.05,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 3 },
              elevation: 2,
            }}
          >
            <CardRow
              icon={img.spot.search}
              label={t.home.checkReport}
              onPress={() => router.push('/(tabs)/status')}
              divider
            />
            <CardRow
              icon={img.spot.lifering}
              label={t.home.helpNow}
              onPress={() => router.push('/(tabs)/help')}
            />
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 18 }}>
            <View
              style={{
                width: 5,
                height: 5,
                borderRadius: 2,
                backgroundColor: colors.accent,
                marginTop: 5,
              }}
            />
            <Text
              style={{
                fontFamily: font.body,
                fontSize: 12,
                color: colors.muted,
                lineHeight: 18,
                flex: 1,
              }}
            >
              {t.home.noPii}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
