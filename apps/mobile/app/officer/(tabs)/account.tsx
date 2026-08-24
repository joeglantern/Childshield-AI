// Akaunti — officer identity, environment info, sign out.
import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PressableScale } from '../../../src/components/PressableScale';
import { api } from '../../../src/lib/api';
import { snap } from '../../../src/lib/haptics';
import { useApp } from '../../../src/state/AppContext';
import { useOfficer } from '../../../src/state/OfficerContext';
import { font, palette } from '../../../src/theme/tokens';

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function OfficerAccount() {
  const { t } = useApp();
  const { session, logout } = useOfficer();
  const insets = useSafeAreaInsets();

  if (!session) return null;

  const infoRow = (label: string, value: string, divider: boolean) => (
    <View
      key={label}
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 13,
        borderBottomWidth: divider ? 1 : 0,
        borderBottomColor: 'rgba(5,66,64,0.06)',
      }}
    >
      <Text style={{ fontFamily: font.bodyBold, fontSize: 12.5, color: palette.textMuted }}>{label}</Text>
      <Text
        style={{ fontFamily: font.bodySemi, fontSize: 12.5, color: palette.ink, maxWidth: '65%' }}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: palette.officerBg }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 18, paddingBottom: 24 }}
      >
        <Text style={{ fontFamily: font.heading, fontSize: 20, color: palette.ink, marginBottom: 14 }}>
          {t.officer.accountTitle}
        </Text>

        <View
          style={{
            backgroundColor: palette.white,
            borderRadius: 20,
            padding: 18,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
            marginBottom: 16,
          }}
        >
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 26,
              backgroundColor: palette.amber,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontFamily: font.bodyExtra, fontSize: 17, color: palette.ink }}>
              {initialsOf(session.displayName)}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: font.heading, fontSize: 16, color: palette.ink }}>
              {session.displayName}
            </Text>
            <View
              style={{
                alignSelf: 'flex-start',
                backgroundColor: palette.tealTint,
                borderRadius: 6,
                paddingVertical: 3,
                paddingHorizontal: 8,
                marginTop: 5,
              }}
            >
              <Text style={{ fontFamily: font.bodyExtra, fontSize: 10.5, letterSpacing: 0.3, color: palette.tealText }}>
                {session.role}
              </Text>
            </View>
          </View>
        </View>

        <View style={{ backgroundColor: palette.white, borderRadius: 16, paddingHorizontal: 16, marginBottom: 20 }}>
          {infoRow(t.officer.roleLabel, session.role, true)}
          {infoRow(t.officer.serverLabel, api.baseUrl, true)}
          {infoRow(t.officer.versionLabel, '0.1.0', false)}
        </View>

        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={t.officer.logout}
          onPress={() => {
            snap();
            logout();
            router.replace('/officer/login');
          }}
          style={{
            height: 48,
            borderRadius: 14,
            backgroundColor: palette.white,
            borderWidth: 1,
            borderColor: 'rgba(194,59,59,0.3)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontFamily: font.bodyBold, fontSize: 13.5, color: palette.critical }}>
            {t.officer.logout}
          </Text>
        </PressableScale>
      </ScrollView>
    </View>
  );
}
