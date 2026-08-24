// Step 5 — Kagua kabla ya kutuma. Submits the anonymous IntakeDto to the
// real API. Nothing is sent until the child presses Tuma ripoti.
import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { IntakeDto } from '@childshield/shared';
import { StepHeader } from '../../src/components/StepHeader';
import { PrimaryButton } from '../../src/components/ui';
import { consentVersionFor } from '../../src/i18n';
import { api } from '../../src/lib/api';
import { snap } from '../../src/lib/haptics';
import { useApp } from '../../src/state/AppContext';
import { useReport } from '../../src/state/ReportContext';
import { font, palette } from '../../src/theme/tokens';
import { CASE_CODE_KEY } from '../(tabs)/status';

export default function ReviewStep() {
  const { t, colors, isDark, locale } = useApp();
  const { draft, reset } = useReport();
  const insets = useSafeAreaInsets();
  const [submitting, setSubmitting] = useState(false);

  const categoryLabel: Record<string, string> = {
    GROOMING: t.report.catGrooming,
    SEXTORTION: t.report.catSextortion,
    BULLYING: t.report.catBullying,
    SELF_HARM: t.report.catSelfHarm,
    COERCION: t.report.catCoercion,
    HARMFUL_EXPOSURE: t.report.catExposure,
    OTHER: t.report.catOther,
  };
  const ageLabel: Record<string, string> = {
    UNDER_10: t.report.ageUnder10,
    AGE_10_12: t.report.age10to12,
    AGE_13_15: t.report.age13to15,
    AGE_16_18: t.report.age16to18,
    UNKNOWN: t.report.agePreferNot,
  };

  const consentVersion = consentVersionFor[locale];

  const submit = async () => {
    if (!draft.incidentType || !draft.reporterType || submitting) return;
    setSubmitting(true);
    snap();
    const intake: IntakeDto = {
      reporterType: draft.reporterType,
      ageBand: draft.ageBand ?? 'UNKNOWN',
      channel: 'WEB',
      incidentType: draft.incidentType,
      // If the child skipped free text, their category choice is what they
      // told us — never fabricate anything beyond it.
      description: draft.description.trim() || (categoryLabel[draft.incidentType] ?? draft.incidentType),
      ...(draft.county ? { county: draft.county } : {}),
      consentVersion,
    };
    try {
      const created = await api.createCase(intake);
      await AsyncStorage.setItem(CASE_CODE_KEY, created.caseCode);
      reset();
      router.replace({ pathname: '/report/success', params: { code: created.caseCode } });
    } catch {
      router.push('/report/error');
    } finally {
      setSubmitting(false);
    }
  };

  const reviewRow = (label: string, value: string, divider: boolean) => (
    <View
      key={label}
      style={{
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: divider ? 1 : 0,
        borderBottomColor: isDark ? palette.darkSurface : 'rgba(5,66,64,0.07)',
      }}
    >
      <Text style={{ fontFamily: font.bodyBold, fontSize: 11, color: colors.faint }}>{label}</Text>
      <Text
        style={{ fontFamily: font.bodySemi, fontSize: 14, color: colors.text, marginTop: 2, lineHeight: 20 }}
      >
        {value}
      </Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StepHeader step={5} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingTop: 18 }}>
        <Text style={{ fontFamily: font.heading, fontSize: 21, color: colors.heading, marginBottom: 14 }}>
          {t.report.reviewTitle}
        </Text>
        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: 18,
            overflow: 'hidden',
            marginBottom: 16,
            shadowColor: palette.ink,
            shadowOpacity: isDark ? 0 : 0.05,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 3 },
            elevation: 2,
          }}
        >
          {reviewRow(t.report.reviewAge, draft.ageBand ? (ageLabel[draft.ageBand] ?? '—') : '—', true)}
          {reviewRow(
            t.report.reviewWhat,
            draft.incidentType ? (categoryLabel[draft.incidentType] ?? '—') : '—',
            true,
          )}
          {reviewRow(t.report.reviewDetails, draft.description.trim() || '—', false)}
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 10,
            backgroundColor: isDark ? palette.darkCard : palette.tealTint,
            borderRadius: 14,
            padding: 14,
          }}
        >
          <View
            style={{
              width: 19,
              height: 19,
              borderRadius: 6,
              backgroundColor: palette.teal,
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 1,
            }}
          >
            <View style={{ width: 7, height: 7, borderRadius: 2, backgroundColor: palette.white }} />
          </View>
          <Text
            style={{ fontFamily: font.body, fontSize: 12.5, color: colors.text, lineHeight: 19, flex: 1 }}
          >
            {t.report.reviewConsent(consentVersion)}
          </Text>
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
        <PrimaryButton label={t.report.submit} disabled={submitting} onPress={() => void submit()} />
      </View>
    </View>
  );
}
