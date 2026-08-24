// Ripoti imetumwa — celebrate mascot pops in with overshoot; the Success
// haptic fires exactly when the pop lands. Floating pixel dots + confetti.
import React, { useState } from 'react';
import { Image, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { img } from '../../src/assets';
import { MascotLottie } from '../../src/components/MascotLottie';
import { PressableScale } from '../../src/components/PressableScale';
import { submitted } from '../../src/lib/haptics';
import { useApp } from '../../src/state/AppContext';
import { font, palette } from '../../src/theme/tokens';

export default function Success() {
  const { t, colors, isDark } = useApp();
  const insets = useSafeAreaInsets();
  const { code } = useLocalSearchParams<{ code: string }>();
  const [copied, setCopied] = useState(false);

  const dots = [
    { top: 120, left: 40, size: 10, color: palette.amber, opacity: 0.7 },
    { top: 180, right: 50, size: 14, color: palette.lightTeal, opacity: 0.6 },
    { top: 260, left: 70, size: 8, color: palette.lightTeal, opacity: 0.5 },
    { top: 300, right: 90, size: 11, color: palette.amber, opacity: 0.5 },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, overflow: 'hidden' }}>
      {dots.map((d, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            top: d.top,
            left: d.left,
            right: d.right,
            width: d.size,
            height: d.size,
            borderRadius: d.size / 3.5,
            backgroundColor: d.color,
            opacity: d.opacity,
          }}
        />
      ))}

      <View
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 }}
      >
        <View style={{ marginBottom: 10 }}>
          <Image
            source={img.shape.confetti}
            style={{
              position: 'absolute',
              width: 80,
              height: 54,
              top: -14,
              right: -50,
              opacity: 0.85,
              resizeMode: 'contain',
            }}
          />
          <Image
            source={img.shape.confetti}
            style={{
              position: 'absolute',
              width: 64,
              height: 44,
              bottom: 4,
              left: -48,
              opacity: 0.6,
              resizeMode: 'contain',
              transform: [{ scaleX: -1 }],
            }}
          />
          <MascotLottie anim="cheer" size={148} onFinish={submitted} />
        </View>
        <Text
          style={{
            fontFamily: font.headingX,
            fontSize: 23,
            color: isDark ? palette.darkAccent : palette.teal,
            textAlign: 'center',
          }}
        >
          {t.report.successTitle}
        </Text>
        <Image
          source={img.shape.brushAmber}
          style={{ width: 110, height: 15, marginTop: 4 }}
          resizeMode="stretch"
        />
        <Text
          style={{
            fontFamily: font.body,
            fontSize: 13.5,
            color: colors.muted,
            textAlign: 'center',
            marginTop: 8,
            lineHeight: 20,
          }}
        >
          {t.report.successSubtitle}
        </Text>
        <View
          style={{
            backgroundColor: colors.card,
            borderWidth: 1,
            borderStyle: 'dashed',
            borderColor: 'rgba(0,156,156,0.4)',
            borderRadius: 16,
            paddingVertical: 14,
            paddingHorizontal: 22,
            marginTop: 22,
            shadowColor: palette.ink,
            shadowOpacity: isDark ? 0 : 0.06,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 6 },
            elevation: 3,
          }}
        >
          <Text
            style={{
              fontFamily: font.heading,
              fontSize: 20,
              color: colors.heading,
              letterSpacing: 1,
            }}
            accessibilityLabel={`${t.status.caseCodeLabel}: ${code}`}
          >
            {code}
          </Text>
        </View>
      </View>

      <View style={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 24 }}>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={t.report.copyCode}
          onPress={() => {
            void Clipboard.setStringAsync(code ?? '');
            setCopied(true);
          }}
          style={{
            height: 50,
            borderRadius: 16,
            backgroundColor: palette.amber,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 10,
          }}
        >
          <Text style={{ fontFamily: font.bodyBold, fontSize: 15, color: palette.ink }}>
            {copied ? t.report.copied : t.report.copyCode}
          </Text>
        </PressableScale>
        <PressableScale
          accessibilityRole="button"
          onPress={() => router.replace('/(tabs)')}
          style={{ paddingVertical: 10 }}
        >
          <Text
            style={{
              fontFamily: font.bodyBold,
              fontSize: 13,
              color: colors.accent,
              textAlign: 'center',
            }}
          >
            {t.report.backHome}
          </Text>
        </PressableScale>
      </View>
    </View>
  );
}
