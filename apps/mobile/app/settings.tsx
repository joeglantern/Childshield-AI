// Settings — theme flipper (Mchana/Usiku/Otomatiki), language, notifications.
// SAFEGUARDING: everything here stays on the phone; nothing syncs to a server.
import React, { useEffect, useState } from 'react';
import { Image, Platform, ScrollView, Switch, Text, View } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { img } from '../src/assets';
import { PressableScale } from '../src/components/PressableScale';
import { QuickExitButton } from '../src/components/QuickExitButton';
import { CaretLeftIcon, CaretRightIcon } from '../src/components/icons';
import { SectionLabel } from '../src/components/ui';
import { localeLabels, type Locale } from '../src/i18n';
import { snap } from '../src/lib/haptics';
import { useApp, type ThemeMode } from '../src/state/AppContext';
import { font, palette } from '../src/theme/tokens';

const themeOptions: Array<{ mode: ThemeMode; icon: number; labelKey: 'light' | 'dark' | 'auto' }> = [
  { mode: 'light', icon: img.tm.sun, labelKey: 'light' },
  { mode: 'dark', icon: img.tm.moon, labelKey: 'dark' },
  { mode: 'auto', icon: img.tm.sunmoon, labelKey: 'auto' },
];

const localeOrder: Locale[] = ['sw', 'en', 'sheng'];

export default function Settings() {
  const {
    t,
    colors,
    isDark,
    themeMode,
    setThemeMode,
    locale,
    setLocale,
    notifsEnabled,
    setNotifsEnabled,
    appLockEnabled,
    setAppLockEnabled,
  } = useApp();
  const insets = useSafeAreaInsets();
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') return; // expo-local-authentication has no web implementation
    void (async () => {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricsAvailable(hasHardware && enrolled);
    })();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Image
        source={img.shape.textureDots}
        style={{
          position: 'absolute',
          width: 170,
          height: 170,
          top: 90,
          right: -50,
          opacity: 0.18,
          resizeMode: 'contain',
        }}
      />
      <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
        <View
          style={{
            paddingTop: insets.top + 8,
            paddingHorizontal: 20,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
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
            }}
          >
            <CaretLeftIcon size={16} color={colors.heading} />
          </PressableScale>
          <QuickExitButton />
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
          <Text style={{ fontFamily: font.headingX, fontSize: 22, color: colors.heading }}>
            {t.settings.title}
          </Text>
          <Image
            source={img.shape.squiggleTeal}
            style={{ width: 78, height: 11, marginTop: 4 }}
            resizeMode="stretch"
          />

          <View style={{ marginTop: 20 }}>
            <SectionLabel>{t.settings.appearance}</SectionLabel>
          </View>
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 20,
              padding: 6,
              flexDirection: 'row',
              gap: 6,
            }}
          >
            {themeOptions.map((opt) => {
              const selected = themeMode === opt.mode;
              return (
                <PressableScale
                  key={opt.mode}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    snap();
                    setThemeMode(opt.mode);
                  }}
                  style={{
                    flex: 1,
                    borderRadius: 15,
                    padding: 12,
                    alignItems: 'center',
                    gap: 6,
                    borderWidth: 2,
                    borderColor: selected ? colors.accent : 'transparent',
                    backgroundColor: selected
                      ? isDark
                        ? palette.darkCardAlt
                        : palette.tealTint
                      : 'transparent',
                  }}
                >
                  <Image source={opt.icon} style={{ width: 34, height: 34, resizeMode: 'contain' }} />
                  <Text
                    style={{
                      fontFamily: font.bodyBold,
                      fontSize: 12,
                      color: selected ? colors.heading : colors.muted,
                    }}
                  >
                    {t.settings[opt.labelKey]}
                  </Text>
                </PressableScale>
              );
            })}
          </View>

          <View style={{ marginTop: 20 }}>
            <SectionLabel>{t.settings.language}</SectionLabel>
          </View>
          <PressableScale
            accessibilityRole="button"
            onPress={() => {
              snap();
              const next = localeOrder[(localeOrder.indexOf(locale) + 1) % localeOrder.length];
              if (next) setLocale(next);
            }}
            style={{
              backgroundColor: colors.card,
              borderRadius: 18,
              paddingVertical: 14,
              paddingHorizontal: 16,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <Image source={img.tm.globe} style={{ width: 30, height: 30, resizeMode: 'contain' }} />
            <Text
              style={{ fontFamily: font.bodySemi, fontSize: 14, color: colors.text, flex: 1 }}
            >
              {localeLabels[locale]}
            </Text>
            <CaretRightIcon size={14} color={colors.faint} />
          </PressableScale>

          <View style={{ marginTop: 20 }}>
            <SectionLabel>{t.settings.notifications}</SectionLabel>
          </View>
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 18,
              paddingVertical: 14,
              paddingHorizontal: 16,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <Image source={img.tm.bell} style={{ width: 30, height: 30, resizeMode: 'contain' }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: font.bodySemi, fontSize: 14, color: colors.text }}>
                {t.settings.caseNotifs}
              </Text>
              <Text
                style={{ fontFamily: font.body, fontSize: 11.5, color: colors.muted, marginTop: 2 }}
              >
                {t.settings.caseNotifsSub}
              </Text>
            </View>
            <Switch
              value={notifsEnabled}
              onValueChange={(v) => {
                snap();
                setNotifsEnabled(v);
              }}
              trackColor={{ true: palette.teal, false: colors.track }}
              thumbColor={palette.white}
            />
          </View>

          <View style={{ marginTop: 20 }}>
            <SectionLabel>{t.settings.security}</SectionLabel>
          </View>
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 18,
              paddingVertical: 14,
              paddingHorizontal: 16,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <Image source={img.spot.lock} style={{ width: 30, height: 30, resizeMode: 'contain' }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: font.bodySemi, fontSize: 14, color: colors.text }}>
                {t.settings.appLock}
              </Text>
              <Text
                style={{ fontFamily: font.body, fontSize: 11.5, color: colors.muted, marginTop: 2 }}
              >
                {biometricsAvailable ? t.settings.appLockSub : t.settings.appLockUnavailable}
              </Text>
            </View>
            <Switch
              value={appLockEnabled && biometricsAvailable}
              disabled={!biometricsAvailable}
              onValueChange={(v) => {
                snap();
                setAppLockEnabled(v);
              }}
              trackColor={{ true: palette.teal, false: colors.track }}
              thumbColor={palette.white}
            />
          </View>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 11,
              backgroundColor: isDark ? palette.darkCard : palette.tealTint,
              borderRadius: 16,
              paddingVertical: 13,
              paddingHorizontal: 15,
              marginTop: 20,
            }}
          >
            <Image source={img.spot.lock} style={{ width: 26, height: 26, resizeMode: 'contain' }} />
            <Text
              style={{
                fontFamily: font.body,
                fontSize: 12,
                color: isDark ? palette.darkTextMuted : palette.inkSoft,
                lineHeight: 18,
                flex: 1,
              }}
            >
              {t.settings.localOnly}
            </Text>
          </View>

          {/* Staff entry point — deliberately quiet, at the very bottom. */}
          <PressableScale
            accessibilityRole="button"
            onPress={() => router.push('/officer/login')}
            style={{ marginTop: 28, alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 16 }}
          >
            <Text style={{ fontFamily: font.bodySemi, fontSize: 12, color: colors.faint }}>
              {t.officer.loginTitle}
            </Text>
          </PressableScale>
        </View>
      </ScrollView>
    </View>
  );
}
