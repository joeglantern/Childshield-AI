// Error state — sad mascot with a slow 2° sway. Nothing is lost; the draft
// survives, so "Jaribu tena" returns to the review screen.
import React from 'react';
import { Linking, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { img } from '../../src/assets';
import { Mascot } from '../../src/components/Mascot';
import { PressableScale } from '../../src/components/PressableScale';
import { RefreshIcon } from '../../src/components/icons';
import { useApp } from '../../src/state/AppContext';
import { font, palette } from '../../src/theme/tokens';

export default function ReportError() {
  const { t, colors, isDark } = useApp();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, overflow: 'hidden' }}>
      <View
        style={{
          position: 'absolute',
          width: 240,
          height: 240,
          borderRadius: 120,
          backgroundColor: isDark ? palette.darkCard : palette.tealTintAlt,
          top: -80,
          right: -80,
        }}
      />
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 34,
        }}
      >
        <Mascot source={img.mascot.sad} size={170} variant="sway" style={{ marginBottom: 16 }} />
        <Text
          style={{
            fontFamily: font.headingX,
            fontSize: 23,
            color: colors.heading,
            textAlign: 'center',
            lineHeight: 28,
          }}
        >
          {t.error.title}
        </Text>
        <Text
          style={{
            fontFamily: font.body,
            fontSize: 13.5,
            color: colors.muted,
            textAlign: 'center',
            marginTop: 9,
            lineHeight: 21,
          }}
        >
          {t.error.subtitle}
        </Text>
      </View>
      <View style={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 30 }}>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={t.common.retry}
          onPress={() => router.back()}
          style={{
            height: 54,
            borderRadius: 999,
            backgroundColor: palette.teal,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <RefreshIcon size={17} color={palette.white} />
          <Text style={{ fontFamily: font.heading, fontSize: 15.5, color: palette.white }}>
            {t.common.retry}
          </Text>
        </PressableScale>
        <PressableScale
          accessibilityRole="button"
          onPress={() => void Linking.openURL('tel:116')}
          style={{ paddingVertical: 14 }}
        >
          <Text
            style={{
              fontFamily: font.bodyBold,
              fontSize: 13,
              color: colors.accent,
              textAlign: 'center',
            }}
          >
            {t.error.callInstead}
          </Text>
        </PressableScale>
      </View>
    </View>
  );
}
