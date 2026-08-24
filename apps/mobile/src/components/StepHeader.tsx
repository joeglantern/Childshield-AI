// Report-flow header: back tile, quick exit, 5 progress bars, HATUA label.
import React from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PressableScale } from './PressableScale';
import { QuickExitButton } from './QuickExitButton';
import { useApp } from '../state/AppContext';
import { font, palette } from '../theme/tokens';
import { CaretLeftIcon } from './icons';

export const REPORT_TOTAL_STEPS = 5;

export function StepHeader({ step }: { step: number }) {
  const { t, colors, isDark } = useApp();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 20 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          style={{
            width: 34,
            height: 34,
            borderRadius: 12,
            backgroundColor: colors.card,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: palette.ink,
            shadowOpacity: isDark ? 0 : 0.08,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 2 },
          }}
        >
          <CaretLeftIcon size={16} color={colors.heading} />
        </PressableScale>
        <QuickExitButton />
      </View>
      <View style={{ flexDirection: 'row', gap: 6, marginTop: 18 }}>
        {Array.from({ length: REPORT_TOTAL_STEPS }, (_, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: 6,
              borderRadius: 4,
              backgroundColor: i < step ? colors.accent : colors.track,
            }}
          />
        ))}
      </View>
      <Text
        style={{
          fontFamily: font.bodyBold,
          fontSize: 11.5,
          color: colors.muted,
          letterSpacing: 0.5,
          marginTop: 10,
        }}
      >
        {t.report.stepOf(step, REPORT_TOTAL_STEPS)}
      </Text>
    </View>
  );
}
