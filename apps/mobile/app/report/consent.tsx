// Step 1 — Kabla hatujaanza (consent + language). The only required step.
import React, { useState } from 'react';
import { Image, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { img } from '../../src/assets';
import { StepHeader } from '../../src/components/StepHeader';
import { PressableScale } from '../../src/components/PressableScale';
import { PixelDots } from '../../src/components/PixelDots';
import { CheckIcon } from '../../src/components/icons';
import { PrimaryButton } from '../../src/components/ui';
import { consentVersionFor, localeLabels, type Locale } from '../../src/i18n';
import { snap } from '../../src/lib/haptics';
import { useApp } from '../../src/state/AppContext';
import { useReport } from '../../src/state/ReportContext';
import { font, palette } from '../../src/theme/tokens';

const localeOrder: Locale[] = ['sw', 'en', 'sheng'];

export default function ConsentStep() {
  const { t, colors, isDark, locale, setLocale } = useApp();
  const { update } = useReport();
  const insets = useSafeAreaInsets();
  const [agreed, setAgreed] = useState(false);

  const bullets = [
    { icon: img.spot.lock, text: t.report.consentNoPii },
    { icon: img.p.officer, text: t.report.consentHuman },
    { icon: img.p.stophand, text: t.report.consentStop },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StepHeader step={1} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingTop: 18 }}>
        <Text style={{ fontFamily: font.heading, fontSize: 21, color: colors.heading, marginBottom: 10 }}>
          {t.report.consentTitle}
        </Text>
        <View style={{ marginBottom: 16 }}>
          <PixelDots dark={isDark} />
        </View>

        {/* Language chips */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <Image source={img.tm.globe} style={{ width: 26, height: 26, resizeMode: 'contain' }} />
          {localeOrder.map((l) => {
            const selected = locale === l;
            return (
              <PressableScale
                key={l}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setLocale(l)}
                style={{
                  backgroundColor: selected ? palette.teal : colors.card,
                  borderRadius: 999,
                  paddingVertical: 7,
                  paddingHorizontal: 14,
                  borderWidth: selected ? 0 : 1,
                  borderColor: 'rgba(5,66,64,0.14)',
                }}
              >
                <Text
                  style={{
                    fontFamily: font.bodyBold,
                    fontSize: 12,
                    color: selected ? palette.white : colors.text,
                  }}
                >
                  {localeLabels[l]}
                </Text>
              </PressableScale>
            );
          })}
        </View>

        {/* Promise card */}
        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: 20,
            padding: 18,
            gap: 14,
            shadowColor: palette.ink,
            shadowOpacity: isDark ? 0 : 0.06,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: 4 },
            elevation: 2,
          }}
        >
          {bullets.map((b) => (
            <View key={b.text} style={{ flexDirection: 'row', gap: 11, alignItems: 'flex-start' }}>
              <Image source={b.icon} style={{ width: 26, height: 26, resizeMode: 'contain' }} />
              <Text
                style={{
                  fontFamily: font.body,
                  fontSize: 13,
                  color: isDark ? palette.darkTextMuted : palette.inkSoft,
                  lineHeight: 20,
                  flex: 1,
                }}
              >
                {b.text}
              </Text>
            </View>
          ))}
        </View>

        {/* Agree row */}
        <PressableScale
          accessibilityRole="checkbox"
          accessibilityState={{ checked: agreed }}
          onPress={() => {
            snap();
            setAgreed((v) => !v);
          }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 11,
            backgroundColor: isDark ? palette.darkCard : palette.tealTint,
            borderRadius: 16,
            paddingVertical: 13,
            paddingHorizontal: 15,
            marginTop: 14,
          }}
        >
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: 8,
              backgroundColor: agreed ? palette.teal : colors.card,
              borderWidth: agreed ? 0 : 1.5,
              borderColor: 'rgba(5,66,64,0.22)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {agreed ? <CheckIcon size={14} color={palette.white} /> : null}
          </View>
          <Text
            style={{
              fontFamily: font.bodySemi,
              fontSize: 12.5,
              color: colors.text,
              lineHeight: 18,
              flex: 1,
            }}
          >
            {t.report.consentAgree}
          </Text>
        </PressableScale>
        <Text style={{ fontFamily: font.body, fontSize: 11, color: colors.faint, marginTop: 8 }}>
          {t.report.consentVersionLabel(consentVersionFor[locale].replace('v1-', '').toUpperCase() + '-1.2')}
        </Text>
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
          label={t.report.consentContinue}
          disabled={!agreed}
          onPress={() => {
            snap();
            update({ consented: true });
            router.push('/report/category');
          }}
        />
      </View>
    </View>
  );
}
