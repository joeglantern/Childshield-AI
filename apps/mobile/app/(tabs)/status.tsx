import React, { useCallback, useEffect, useState } from 'react';
import { Image, ScrollView, Text, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { CaseStatus } from '@childshield/shared';
import { img } from '../../src/assets';
import { QuickExitButton } from '../../src/components/QuickExitButton';
import { PressableScale } from '../../src/components/PressableScale';
import { PulseGlow } from '../../src/components/PulseGlow';
import { PrimaryButton } from '../../src/components/ui';
import { api, ApiError } from '../../src/lib/api';
import { snap } from '../../src/lib/haptics';
import { useApp } from '../../src/state/AppContext';
import { font, palette, radius } from '../../src/theme/tokens';

export const CASE_CODE_KEY = 'childshield.caseCode';

/// Which of the 5 child-facing steps each backend status reaches.
/// 1 Tumepokea · 2 Inakaguliwa · 3 Inapitiwa kwa kina · 4 Imepelekwa · 5 Msaada
const statusStep: Record<CaseStatus, number> = {
  RECEIVED: 1,
  TRIAGED: 2,
  UNDER_REVIEW: 3,
  REFERRED: 4,
  IN_PROGRESS: 5,
  CLOSED: 5,
  REOPENED: 3,
};

export default function Status() {
  const { t, colors, isDark } = useApp();
  const insets = useSafeAreaInsets();
  const [savedCode, setSavedCode] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<CaseStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (code: string) => {
      setError(null);
      try {
        const res = await api.caseStatus(code.trim().toUpperCase());
        setStatus(res.status);
      } catch (e) {
        setStatus(null);
        setError(e instanceof ApiError && e.status === 404 ? t.status.notFound : t.error.subtitle);
      }
    },
    [t],
  );

  useEffect(() => {
    void AsyncStorage.getItem(CASE_CODE_KEY).then((code) => {
      setSavedCode(code);
      if (!code) setEditing(true);
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      void AsyncStorage.getItem(CASE_CODE_KEY).then((code) => {
        setSavedCode(code);
        if (code) {
          setEditing(false);
          void load(code);
        }
      });
    }, [load]),
  );

  const submitCode = async () => {
    const code = input.trim().toUpperCase();
    if (code.length < 6) return;
    snap();
    await AsyncStorage.setItem(CASE_CODE_KEY, code);
    setSavedCode(code);
    setEditing(false);
    void load(code);
  };

  const steps = [
    { icon: img.st.received, label: t.status.stReceived },
    { icon: img.st.review, label: t.status.stReview },
    { icon: img.st.talking, label: t.status.stDeepReview },
    { icon: img.st.sent, label: t.status.stSent },
    { icon: img.st.care, label: t.status.stCare },
  ];
  const reached = status ? statusStep[status] : 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 28 }}>
        <View
          style={{
            paddingTop: insets.top + 8,
            paddingHorizontal: 20,
            alignItems: 'flex-end',
          }}
        >
          <QuickExitButton />
        </View>
        <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 14,
            }}
          >
            <Text style={{ fontFamily: font.headingX, fontSize: 22, color: colors.heading }}>
              {t.status.title}
            </Text>
            <Image
              source={img.mascot.phone}
              style={{ width: 62, height: 62, resizeMode: 'contain' }}
            />
          </View>

          {editing ? (
            <View
              style={{
                backgroundColor: colors.card,
                borderRadius: 18,
                padding: 16,
                marginBottom: 22,
              }}
            >
              <Text style={{ fontFamily: font.bodySemi, fontSize: 13, color: colors.muted }}>
                {t.status.enterCodeTitle}
              </Text>
              <TextInput
                value={input}
                onChangeText={setInput}
                autoCapitalize="characters"
                autoCorrect={false}
                placeholder={t.status.enterCodePlaceholder}
                placeholderTextColor={colors.faint}
                style={{
                  height: 46,
                  borderRadius: radius.input,
                  borderWidth: 1,
                  borderColor: 'rgba(5,66,64,0.16)',
                  paddingHorizontal: 14,
                  marginTop: 10,
                  marginBottom: 12,
                  fontFamily: font.heading,
                  fontSize: 16,
                  letterSpacing: 1,
                  color: colors.text,
                  backgroundColor: isDark ? palette.darkSurface : palette.white,
                }}
              />
              <PrimaryButton label={t.status.check} onPress={() => void submitCode()} />
            </View>
          ) : (
            <View
              style={{
                backgroundColor: colors.card,
                borderRadius: 18,
                padding: 14,
                paddingHorizontal: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 22,
                shadowColor: palette.ink,
                shadowOpacity: isDark ? 0 : 0.06,
                shadowRadius: 14,
                shadowOffset: { width: 0, height: 4 },
                elevation: 2,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
                <Image
                  source={img.spot.lock}
                  style={{ width: 30, height: 30, resizeMode: 'contain' }}
                />
                <View>
                  <Text style={{ fontFamily: font.body, fontSize: 11, color: colors.muted }}>
                    {t.status.caseCodeLabel}
                  </Text>
                  <Text
                    style={{
                      fontFamily: font.heading,
                      fontSize: 16,
                      color: colors.heading,
                      letterSpacing: 0.5,
                    }}
                  >
                    {savedCode}
                  </Text>
                </View>
              </View>
              <PressableScale
                accessibilityRole="button"
                onPress={() => {
                  setInput(savedCode ?? '');
                  setEditing(true);
                }}
              >
                <Text style={{ fontFamily: font.bodyBold, fontSize: 12.5, color: colors.accent }}>
                  {t.status.change}
                </Text>
              </PressableScale>
            </View>
          )}

          {error ? (
            <Text
              style={{
                fontFamily: font.bodySemi,
                fontSize: 13,
                color: palette.high,
                marginBottom: 16,
              }}
            >
              {error}
            </Text>
          ) : null}

          {/* Timeline */}
          {steps.map((step, i) => {
            const index = i + 1;
            const done = index < reached;
            const active = index === reached && status !== 'CLOSED';
            const future = index > reached;
            const tileBg = active
              ? palette.amberTint
              : future
                ? isDark
                  ? palette.darkCard
                  : '#F0EBDF'
                : isDark
                  ? palette.darkCard
                  : palette.tealTint;
            const tile = (
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 12,
                  backgroundColor: tileBg,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Image
                  source={step.icon}
                  style={{
                    width: 22,
                    height: 22,
                    resizeMode: 'contain',
                    opacity: future ? 0.4 : 1,
                  }}
                />
              </View>
            );
            return (
              <View key={step.label} style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-start' }}>
                <View style={{ alignItems: 'center' }}>
                  {active ? (
                    <PulseGlow size={34} radius={12}>
                      {tile}
                    </PulseGlow>
                  ) : (
                    tile
                  )}
                  {i < steps.length - 1 ? (
                    <View
                      style={{
                        width: 2,
                        minHeight: 24,
                        flex: 1,
                        backgroundColor: done
                          ? colors.accent
                          : active
                            ? palette.amber
                            : colors.track,
                      }}
                    />
                  ) : null}
                </View>
                <View style={{ paddingBottom: 22, paddingTop: future ? 8 : 2, flex: 1 }}>
                  <Text
                    style={{
                      fontFamily: font.bodyBold,
                      fontSize: 14.5,
                      color: future ? palette.disabledText : colors.text,
                      lineHeight: 19,
                    }}
                  >
                    {step.label}
                  </Text>
                  {active ? (
                    <Text
                      style={{
                        fontFamily: font.body,
                        fontSize: 12,
                        color: isDark ? palette.amber : colors.muted,
                        marginTop: 4,
                      }}
                    >
                      {t.status.inProgressNow}
                    </Text>
                  ) : null}
                </View>
              </View>
            );
          })}

          <Text
            style={{
              fontFamily: font.body,
              fontSize: 12,
              color: colors.muted,
              marginTop: 8,
              lineHeight: 18,
            }}
          >
            {t.status.privacyNote}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
