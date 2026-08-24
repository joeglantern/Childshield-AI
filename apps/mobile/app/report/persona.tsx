// Step 3 — Unaripoti kwa ajili ya nani? Persona cards + optional age band
// and county. County stays at county granularity — never a precise location.
import React, { useState } from 'react';
import { Image, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { AgeBand, ReporterType } from '@childshield/shared';
import { img } from '../../src/assets';
import { StepHeader } from '../../src/components/StepHeader';
import { PressableScale } from '../../src/components/PressableScale';
import { StaggerIn } from '../../src/components/StaggerIn';
import { CaretDownIcon } from '../../src/components/icons';
import { Chip, PrimaryButton } from '../../src/components/ui';
import { snap } from '../../src/lib/haptics';
import { useApp } from '../../src/state/AppContext';
import { useReport } from '../../src/state/ReportContext';
import { font, palette } from '../../src/theme/tokens';

const COUNTIES = [
  'Nairobi',
  'Kisumu',
  'Mombasa',
  'Nakuru',
  'Kiambu',
  'Uasin Gishu',
  'Kakamega',
  'Machakos',
];

export default function PersonaStep() {
  const { t, colors, isDark } = useApp();
  const { draft, update } = useReport();
  const insets = useSafeAreaInsets();
  const [countyOpen, setCountyOpen] = useState(false);

  const personas: Array<{ type: ReporterType; icon: number; label: string }> = [
    { type: 'CHILD_SELF', icon: img.p.child, label: t.report.personaSelf },
    { type: 'PEER', icon: img.p.friends, label: t.report.personaFriend },
    { type: 'CAREGIVER', icon: img.p.caregiver, label: t.report.personaChildICareFor },
    { type: 'PROFESSIONAL', icon: img.p.doctor, label: t.report.personaProfessional },
  ];

  const ages: Array<{ band: AgeBand; label: string; dashed?: boolean }> = [
    { band: 'UNDER_10', label: t.report.ageUnder10 },
    { band: 'AGE_10_12', label: t.report.age10to12 },
    { band: 'AGE_13_15', label: t.report.age13to15 },
    { band: 'AGE_16_18', label: t.report.age16to18 },
    { band: 'UNKNOWN', label: t.report.agePreferNot, dashed: true },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StepHeader step={3} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingTop: 18 }}>
        <Text style={{ fontFamily: font.heading, fontSize: 21, color: colors.heading, marginBottom: 6 }}>
          {t.report.personaTitle}
        </Text>
        <Text
          style={{ fontFamily: font.body, fontSize: 13.5, color: colors.muted, marginBottom: 16, lineHeight: 20 }}
        >
          {t.report.personaSubtitle}
        </Text>

        <View style={{ gap: 9 }}>
          {personas.map((p, i) => {
            const selected = draft.reporterType === p.type;
            return (
              <StaggerIn key={p.type} index={i}>
                <PressableScale
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    snap();
                    update({ reporterType: p.type });
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    backgroundColor: selected
                      ? isDark
                        ? palette.darkCardAlt
                        : palette.amberTint
                      : colors.card,
                    borderWidth: 2,
                    borderColor: selected ? palette.amber : 'transparent',
                    borderRadius: 17,
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                  }}
                >
                  <Image source={p.icon} style={{ width: 40, height: 40, resizeMode: 'contain' }} />
                  <Text
                    style={{ fontFamily: font.bodySemi, fontSize: 14, color: colors.text, flex: 1 }}
                  >
                    {p.label}
                  </Text>
                  {selected ? (
                    <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: palette.amber }} />
                  ) : (
                    <View
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        borderWidth: 2,
                        borderColor: colors.accent,
                      }}
                    />
                  )}
                </PressableScale>
              </StaggerIn>
            );
          })}
        </View>

        <Text style={{ fontFamily: font.bodyBold, fontSize: 12, color: colors.text, marginTop: 20, marginBottom: 8 }}>
          {t.report.ageLabel}
        </Text>
        <View style={{ flexDirection: 'row', gap: 7, flexWrap: 'wrap' }}>
          {ages.map((a) => (
            <Chip
              key={a.band}
              label={a.label}
              dashed={a.dashed}
              selected={draft.ageBand === a.band}
              onPress={() => {
                snap();
                update({ ageBand: draft.ageBand === a.band ? null : a.band });
              }}
            />
          ))}
        </View>

        <Text style={{ fontFamily: font.bodyBold, fontSize: 12, color: colors.text, marginTop: 18, marginBottom: 8 }}>
          {t.report.countyLabel}
        </Text>
        <PressableScale
          accessibilityRole="button"
          onPress={() => setCountyOpen((v) => !v)}
          style={{
            backgroundColor: colors.card,
            borderRadius: 15,
            paddingVertical: 13,
            paddingHorizontal: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderWidth: 1,
            borderColor: 'rgba(5,66,64,0.1)',
          }}
        >
          <Text style={{ fontFamily: font.bodySemi, fontSize: 13.5, color: draft.county ? colors.text : colors.faint }}>
            {draft.county ?? '—'}
          </Text>
          <CaretDownIcon size={14} color={colors.faint} />
        </PressableScale>
        {countyOpen ? (
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 15,
              marginTop: 6,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: 'rgba(5,66,64,0.1)',
            }}
          >
            {COUNTIES.map((c, i) => (
              <PressableScale
                key={c}
                accessibilityRole="button"
                onPress={() => {
                  snap();
                  update({ county: draft.county === c ? null : c });
                  setCountyOpen(false);
                }}
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderBottomWidth: i < COUNTIES.length - 1 ? 1 : 0,
                  borderBottomColor: isDark ? palette.darkSurface : 'rgba(5,66,64,0.06)',
                  backgroundColor: draft.county === c ? (isDark ? palette.darkCardAlt : palette.tealTint) : 'transparent',
                }}
              >
                <Text style={{ fontFamily: font.bodySemi, fontSize: 13.5, color: colors.text }}>{c}</Text>
              </PressableScale>
            ))}
          </View>
        ) : null}
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
          disabled={!draft.reporterType}
          onPress={() => {
            snap();
            router.push('/report/description');
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
          {t.report.optionalHint}
        </Text>
      </View>
    </View>
  );
}
