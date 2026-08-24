// Takwimu — live counts computed from the real queue (severity/status/channel).
import React, { useCallback, useState } from 'react';
import { Image, ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CASE_STATUSES, CHANNELS, SEVERITIES } from '@childshield/shared/constants';
import type { CaseSummaryDto } from '@childshield/shared';
import { img } from '../../../src/assets';
import { api } from '../../../src/lib/api';
import { useApp } from '../../../src/state/AppContext';
import { useOfficer } from '../../../src/state/OfficerContext';
import { font, palette, severityColor } from '../../../src/theme/tokens';

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <View style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: palette.officerBg, overflow: 'hidden' }}>
      <View
        style={{
          width: `${max > 0 ? Math.round((value / max) * 100) : 0}%`,
          height: 8,
          borderRadius: 4,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

export default function OfficerStats() {
  const { t } = useApp();
  const { call } = useOfficer();
  const insets = useSafeAreaInsets();
  const [cases, setCases] = useState<CaseSummaryDto[]>([]);

  useFocusEffect(
    useCallback(() => {
      void call((token) => api.listCases(token))
        .then(setCases)
        .catch(() => undefined);
    }, [call]),
  );

  const open = cases.filter((c) => c.status !== 'CLOSED').length;
  const bySeverity = SEVERITIES.map((s) => ({
    key: s,
    count: cases.filter((c) => c.severity === s).length,
    tone: severityColor[s],
  }));
  const unrated = cases.filter((c) => c.severity === null).length;
  const maxSev = Math.max(1, ...bySeverity.map((r) => r.count), unrated);
  const byStatus = CASE_STATUSES.map((s) => ({
    key: s,
    count: cases.filter((c) => c.status === s).length,
  })).filter((r) => r.count > 0);
  const byChannel = CHANNELS.map((ch) => ({
    key: ch,
    count: cases.filter((c) => c.channel === ch).length,
  })).filter((r) => r.count > 0);

  return (
    <View style={{ flex: 1, backgroundColor: palette.officerBg }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingHorizontal: 18,
          paddingBottom: 24,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 14 }}>
          <Image source={img.of.chart} style={{ width: 26, height: 26, resizeMode: 'contain' }} />
          <Text style={{ fontFamily: font.heading, fontSize: 20, color: palette.ink }}>
            {t.officer.statsTitle}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
          <View style={{ flex: 1, backgroundColor: palette.white, borderRadius: 16, padding: 16 }}>
            <Text style={{ fontFamily: font.headingX, fontSize: 28, color: palette.teal }}>{open}</Text>
            <Text style={{ fontFamily: font.bodyBold, fontSize: 11.5, color: palette.textMuted, marginTop: 2 }}>
              {t.officer.statsOpen}
            </Text>
          </View>
          <View style={{ flex: 1, backgroundColor: palette.white, borderRadius: 16, padding: 16 }}>
            <Text style={{ fontFamily: font.headingX, fontSize: 28, color: palette.ink }}>
              {cases.length}
            </Text>
            <Text style={{ fontFamily: font.bodyBold, fontSize: 11.5, color: palette.textMuted, marginTop: 2 }}>
              {t.officer.statsTotal}
            </Text>
          </View>
        </View>

        <Text style={{ fontFamily: font.bodyExtra, fontSize: 11, letterSpacing: 0.4, color: palette.textMuted, marginBottom: 8 }}>
          {t.officer.statsBySeverity}
        </Text>
        <View style={{ backgroundColor: palette.white, borderRadius: 16, padding: 16, gap: 12, marginBottom: 16 }}>
          {bySeverity.map((r) => (
            <View key={r.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: r.tone.fg }} />
              <Text style={{ fontFamily: font.bodyExtra, fontSize: 10.5, color: r.tone.fg, width: 70 }}>
                {r.key}
              </Text>
              <Bar value={r.count} max={maxSev} color={r.tone.fg} />
              <Text style={{ fontFamily: font.bodyBold, fontSize: 12.5, color: palette.ink, width: 24, textAlign: 'right' }}>
                {r.count}
              </Text>
            </View>
          ))}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: palette.caretFaint }} />
            <Text style={{ fontFamily: font.bodyExtra, fontSize: 10.5, color: palette.textMuted, width: 70 }}>
              {t.officer.statsUnrated}
            </Text>
            <Bar value={unrated} max={maxSev} color={palette.caretFaint} />
            <Text style={{ fontFamily: font.bodyBold, fontSize: 12.5, color: palette.ink, width: 24, textAlign: 'right' }}>
              {unrated}
            </Text>
          </View>
        </View>

        <Text style={{ fontFamily: font.bodyExtra, fontSize: 11, letterSpacing: 0.4, color: palette.textMuted, marginBottom: 8 }}>
          {t.officer.statsByStatus}
        </Text>
        <View style={{ backgroundColor: palette.white, borderRadius: 16, paddingHorizontal: 16, marginBottom: 16 }}>
          {byStatus.map((r, i) => (
            <View
              key={r.key}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                paddingVertical: 12,
                borderBottomWidth: i < byStatus.length - 1 ? 1 : 0,
                borderBottomColor: 'rgba(5,66,64,0.06)',
              }}
            >
              <Text style={{ fontFamily: font.bodyBold, fontSize: 12.5, color: palette.ink }}>{r.key}</Text>
              <Text style={{ fontFamily: font.bodyBold, fontSize: 12.5, color: palette.textMuted }}>
                {r.count}
              </Text>
            </View>
          ))}
        </View>

        <Text style={{ fontFamily: font.bodyExtra, fontSize: 11, letterSpacing: 0.4, color: palette.textMuted, marginBottom: 8 }}>
          {t.officer.statsByChannel}
        </Text>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {byChannel.map((r) => (
            <View
              key={r.key}
              style={{
                backgroundColor: palette.white,
                borderRadius: 999,
                paddingVertical: 7,
                paddingHorizontal: 14,
                flexDirection: 'row',
                gap: 7,
              }}
            >
              <Text style={{ fontFamily: font.bodyBold, fontSize: 11.5, color: palette.ink }}>{r.key}</Text>
              <Text style={{ fontFamily: font.bodyBold, fontSize: 11.5, color: palette.teal }}>{r.count}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
