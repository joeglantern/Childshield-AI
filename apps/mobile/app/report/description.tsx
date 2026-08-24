// Step 4 — Unaweza kutuelezea zaidi? Free text, skippable.
// SAFEGUARDING (zero-content): words only — there is no media picker
// anywhere in this app, and the copy says so.
import React from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { img } from '../../src/assets';
import { StepHeader } from '../../src/components/StepHeader';
import { PressableScale } from '../../src/components/PressableScale';
import { PrimaryButton } from '../../src/components/ui';
import { snap } from '../../src/lib/haptics';
import { useApp } from '../../src/state/AppContext';
import { useReport } from '../../src/state/ReportContext';
import { font, palette } from '../../src/theme/tokens';

export default function DescriptionStep() {
  const { t, colors, isDark } = useApp();
  const { draft, update } = useReport();
  const insets = useSafeAreaInsets();

  const next = () => {
    snap();
    router.push('/report/review');
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StepHeader step={4} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingTop: 18 }}>
          <Text style={{ fontFamily: font.heading, fontSize: 21, color: colors.heading, marginBottom: 6 }}>
            {t.report.descriptionTitle}
          </Text>
          <Text
            style={{ fontFamily: font.body, fontSize: 13.5, color: colors.muted, marginBottom: 16, lineHeight: 20 }}
          >
            {t.report.descriptionSubtitle}
          </Text>

          <TextInput
            accessibilityLabel={t.report.descriptionTitle}
            accessibilityHint={t.report.descriptionSubtitle}
            multiline
            value={draft.description}
            onChangeText={(v) => update({ description: v })}
            placeholder={t.report.descriptionPlaceholder}
            placeholderTextColor={colors.faint}
            maxLength={10000}
            style={{
              backgroundColor: colors.card,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: 'rgba(5,66,64,0.1)',
              height: 160,
              padding: 14,
              paddingHorizontal: 16,
              fontFamily: font.body,
              fontSize: 14,
              color: colors.text,
              textAlignVertical: 'top',
            }}
          />

          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 14 }}>
            <View
              style={{ width: 5, height: 5, borderRadius: 2, backgroundColor: colors.accent, marginTop: 6 }}
            />
            <Text style={{ fontFamily: font.body, fontSize: 12, color: colors.muted, lineHeight: 18 }}>
              {t.report.noMedia}
            </Text>
          </View>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              backgroundColor: colors.card,
              borderRadius: 18,
              paddingVertical: 12,
              paddingHorizontal: 16,
              marginTop: 18,
              shadowColor: palette.ink,
              shadowOpacity: isDark ? 0 : 0.05,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 3 },
              elevation: 2,
            }}
          >
            <Image source={img.mascot.listen} style={{ width: 52, height: 52, resizeMode: 'contain' }} />
            <Text
              style={{
                fontFamily: font.body,
                fontSize: 12.5,
                color: isDark ? palette.darkTextMuted : palette.inkSoft,
                lineHeight: 19,
                flex: 1,
              }}
            >
              {t.report.mascotReassure}
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
          <PrimaryButton label={t.common.continue} onPress={next} />
          <PressableScale accessibilityRole="button" onPress={next} style={{ paddingVertical: 12 }}>
            <Text
              style={{
                fontFamily: font.bodyBold,
                fontSize: 12.5,
                color: colors.accent,
                textAlign: 'center',
              }}
            >
              {t.report.skipStep}
            </Text>
          </PressableScale>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
