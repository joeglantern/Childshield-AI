// Step 2 — Nini kilitokea? Category picker with icon rows.
import React from 'react';
import { Image, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { IncidentType } from '@childshield/shared';
import { img } from '../../src/assets';
import { StepHeader } from '../../src/components/StepHeader';
import { PressableScale } from '../../src/components/PressableScale';
import { PixelDots } from '../../src/components/PixelDots';
import { StaggerIn } from '../../src/components/StaggerIn';
import { PrimaryButton, RadioDot } from '../../src/components/ui';
import { snap } from '../../src/lib/haptics';
import { useApp } from '../../src/state/AppContext';
import { useReport } from '../../src/state/ReportContext';
import { font, palette } from '../../src/theme/tokens';

export default function CategoryStep() {
  const { t, colors, isDark } = useApp();
  const { draft, update } = useReport();
  const insets = useSafeAreaInsets();

  const options: Array<{ type: IncidentType; label: string }> = [
    { type: 'GROOMING', label: t.report.catGrooming },
    { type: 'SEXTORTION', label: t.report.catSextortion },
    { type: 'BULLYING', label: t.report.catBullying },
    { type: 'SELF_HARM', label: t.report.catSelfHarm },
    { type: 'COERCION', label: t.report.catCoercion },
    { type: 'HARMFUL_EXPOSURE', label: t.report.catExposure },
    { type: 'OTHER', label: t.report.catOther },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StepHeader step={2} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingTop: 18 }}>
        <Text style={{ fontFamily: font.heading, fontSize: 21, color: colors.heading, marginBottom: 6 }}>
          {t.report.categoryTitle}
        </Text>
        <Text
          style={{ fontFamily: font.body, fontSize: 13.5, color: colors.muted, marginBottom: 10, lineHeight: 20 }}
        >
          {t.report.categorySubtitle}
        </Text>
        <View style={{ marginBottom: 16 }}>
          <PixelDots dark={isDark} />
        </View>

        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: 19,
            overflow: 'hidden',
            shadowColor: palette.ink,
            shadowOpacity: isDark ? 0 : 0.05,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 3 },
            elevation: 2,
          }}
        >
          {options.map((opt, i) => {
            const selected = draft.incidentType === opt.type;
            return (
              <StaggerIn key={opt.type} index={i}>
                <PressableScale
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    snap();
                    update({ incidentType: opt.type });
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingVertical: 15,
                    paddingHorizontal: 16,
                    backgroundColor: selected
                      ? isDark
                        ? palette.darkCardAlt
                        : palette.amberTint
                      : 'transparent',
                    borderBottomWidth: i < options.length - 1 ? 1 : 0,
                    borderBottomColor: isDark ? palette.darkSurface : 'rgba(5,66,64,0.06)',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                    <Image
                      source={img.category[opt.type]}
                      style={{ width: 26, height: 26, resizeMode: 'contain' }}
                    />
                    <Text
                      style={{
                        fontFamily: font.bodySemi,
                        fontSize: 14,
                        color: colors.text,
                        flex: 1,
                      }}
                    >
                      {opt.label}
                    </Text>
                  </View>
                  <RadioDot selected={selected} />
                </PressableScale>
              </StaggerIn>
            );
          })}
        </View>
      </ScrollView>
      <View
        style={{
          padding: 20,
          paddingTop: 14,
          paddingBottom: insets.bottom + 14,
          borderTopWidth: 1,
          borderTopColor: isDark ? palette.darkCard : 'rgba(5,66,64,0.08)',
        }}
      >
        <PrimaryButton
          label={t.common.continue}
          disabled={!draft.incidentType}
          onPress={() => {
            snap();
            router.push('/report/persona');
          }}
        />
        <Text
          style={{
            fontFamily: font.body,
            fontSize: 11.5,
            color: colors.muted,
            textAlign: 'center',
            marginTop: 9,
          }}
        >
          {t.report.noNameStored}
        </Text>
      </View>
    </View>
  );
}
