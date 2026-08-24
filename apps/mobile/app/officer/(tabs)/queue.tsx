// Foleni ya kesi — live, WebSocket-driven, severity-sorted. Cards stagger in.
// WS is a delivery optimization: every event triggers a REST refetch (server
// state wins). Skeleton while connecting; offline banner + empty state.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Redirect, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { CaseStatus, CaseSummaryDto, Severity } from '@childshield/shared';
import { img } from '../../../src/assets';
import { PressableScale } from '../../../src/components/PressableScale';
import { StaggerIn } from '../../../src/components/StaggerIn';
import { CaretRightIcon, RefreshIcon, TimerIcon, WifiOffIcon } from '../../../src/components/icons';
import { api } from '../../../src/lib/api';
import { connectQueueSocket, type WsState } from '../../../src/lib/ws';
import { useApp } from '../../../src/state/AppContext';
import { useOfficer } from '../../../src/state/OfficerContext';
import { font, palette, severityColor } from '../../../src/theme/tokens';

type Filter = 'ALL' | 'RECEIVED' | 'TRIAGED' | 'CRITICAL';

function minutesSince(iso: string): number {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
}

const severityRank: Record<Severity, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

function QueueCard({ item, index }: { item: CaseSummaryDto; index: number }) {
  const { t } = useApp();
  const sev = item.severity;
  const sevTone = sev ? severityColor[sev] : null;
  const mins = minutesSince(item.createdAt);
  const urgent = sev === 'CRITICAL' || sev === 'HIGH';

  return (
    <StaggerIn index={Math.min(index, 8)}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`${item.caseCode}, ${item.incidentType}`}
        onPress={() => router.push({ pathname: '/officer/case/[id]', params: { id: item.id } })}
        style={{
          backgroundColor: palette.white,
          borderRadius: 22,
          padding: 15,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 13,
          marginBottom: 12,
          shadowColor: palette.ink,
          shadowOpacity: 0.07,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 8 },
          elevation: 3,
        }}
      >
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 16,
            backgroundColor: sevTone?.tile ?? palette.tealTint,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Image
            source={img.category[item.incidentType]}
            style={{ width: 28, height: 28, resizeMode: 'contain' }}
          />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontFamily: font.heading, fontSize: 15, color: palette.ink }}>
              {item.caseCode}
            </Text>
            {sev && sevTone ? (
              <>
                <View
                  style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: sevTone.fg }}
                />
                <Text
                  style={{
                    fontFamily: font.bodyExtra,
                    fontSize: 10.5,
                    letterSpacing: 0.3,
                    color: sevTone.fg,
                  }}
                >
                  {sev}
                </Text>
              </>
            ) : null}
          </View>
          <Text style={{ fontFamily: font.body, fontSize: 12, color: palette.textMuted, marginTop: 2 }}>
            {t.incidentTypes[item.incidentType]} · {item.channel}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                backgroundColor: urgent && sevTone ? sevTone.bg : palette.officerBg,
                borderRadius: 999,
                paddingVertical: 4,
                paddingHorizontal: 10,
              }}
            >
              <TimerIcon size={13} color={urgent && sevTone ? sevTone.fg : palette.textMuted} />
              <Text
                style={{
                  fontFamily: font.bodyBold,
                  fontSize: 11,
                  color: urgent && sevTone ? sevTone.fg : palette.textMuted,
                }}
              >
                {t.officer.minutes(mins)}
              </Text>
            </View>
            <View
              style={{
                backgroundColor: palette.officerBg,
                borderRadius: 999,
                paddingVertical: 4,
                paddingHorizontal: 10,
              }}
            >
              <Text style={{ fontFamily: font.bodyBold, fontSize: 11, color: palette.textMuted }}>
                {item.status}
              </Text>
            </View>
          </View>
        </View>
        <CaretRightIcon size={15} color={palette.caretFaint} />
      </PressableScale>
    </StaggerIn>
  );
}

function SkeletonCard() {
  return (
    <View style={{ backgroundColor: palette.white, borderRadius: 16, padding: 16, gap: 8, marginBottom: 10 }}>
      <View style={{ width: '40%', height: 12, borderRadius: 4, backgroundColor: palette.skeletonA }} />
      <View style={{ width: '65%', height: 10, borderRadius: 4, backgroundColor: palette.skeletonB }} />
    </View>
  );
}

export default function OfficerQueue() {
  const { t } = useApp();
  const { session, call } = useOfficer();
  const insets = useSafeAreaInsets();
  const [cases, setCases] = useState<CaseSummaryDto[] | null>(null);
  const [wsState, setWsState] = useState<WsState>('connecting');
  const [filter, setFilter] = useState<Filter>('ALL');

  const refetch = useCallback(async () => {
    try {
      const rows = await call((token) => api.listCases(token));
      setCases(rows);
    } catch {
      // keep last data; the offline banner communicates the state
    }
  }, [call]);

  useEffect(() => {
    if (!session) return;
    void refetch();
    const disconnect = connectQueueSocket(
      () => call((token) => api.wsTicket(token)).then((r) => r.ticket),
      {
        onState: (s) => {
          setWsState(s);
          if (s === 'live') void refetch();
        },
        onEvent: () => void refetch(),
      },
    );
    return disconnect;
    // reconnect only when the session identity changes, not on every refresh
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.displayName]);

  const filtered = useMemo(() => {
    if (!cases) return null;
    const rows = cases.filter((c) => {
      if (filter === 'ALL') return true;
      if (filter === 'CRITICAL') return c.severity === 'CRITICAL';
      return c.status === filter;
    });
    return [...rows].sort((a, b) => {
      const ra = a.severity ? severityRank[a.severity] : 4;
      const rb = b.severity ? severityRank[b.severity] : 4;
      if (ra !== rb) return ra - rb;
      return a.createdAt.localeCompare(b.createdAt);
    });
  }, [cases, filter]);

  if (!session) return <Redirect href="/officer/login" />;

  const filters: Array<{ key: Filter; label: string; danger?: boolean }> = [
    { key: 'ALL', label: t.officer.filterAll },
    { key: 'RECEIVED', label: 'RECEIVED' satisfies CaseStatus },
    { key: 'TRIAGED', label: 'TRIAGED' satisfies CaseStatus },
    { key: 'CRITICAL', label: 'CRITICAL', danger: true },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: palette.officerBg }}>
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 18, paddingBottom: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
            <Image source={img.of.inbox} style={{ width: 26, height: 26, resizeMode: 'contain' }} />
            <Text style={{ fontFamily: font.heading, fontSize: 20, color: palette.ink }}>
              {t.officer.queueTitle}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor:
                  wsState === 'live'
                    ? palette.teal
                    : wsState === 'connecting'
                      ? palette.track
                      : palette.high,
              }}
            />
            <Text style={{ fontFamily: font.bodySemi, fontSize: 11.5, color: palette.inkSoft }}>
              {wsState === 'live'
                ? t.common.live
                : wsState === 'connecting'
                  ? t.officer.connecting
                  : t.officer.offline}
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 7, marginTop: 12 }}>
          {filters.map((f) => {
            const selected = filter === f.key;
            return (
              <PressableScale
                key={f.key}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setFilter(f.key)}
                style={{
                  backgroundColor: selected ? palette.teal : palette.white,
                  borderRadius: 8,
                  paddingVertical: 6,
                  paddingHorizontal: 11,
                  borderWidth: selected ? 0 : 1,
                  borderColor: f.danger ? 'rgba(194,59,59,0.3)' : 'rgba(5,66,64,0.12)',
                }}
              >
                <Text
                  style={{
                    fontFamily: font.bodyBold,
                    fontSize: 11,
                    color: selected ? palette.white : f.danger ? palette.critical : palette.ink,
                  }}
                >
                  {f.label}
                </Text>
              </PressableScale>
            );
          })}
        </View>
      </View>

      {wsState === 'offline' ? (
        <View style={{ paddingHorizontal: 18, paddingBottom: 8 }}>
          <View
            style={{
              backgroundColor: palette.white,
              borderRadius: 18,
              padding: 13,
              paddingHorizontal: 14,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 13,
                backgroundColor: palette.amberTint,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <WifiOffIcon size={18} color={palette.high} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontFamily: font.bodyBold, fontSize: 12.5, color: palette.ink }}>
                {t.officer.offline}
              </Text>
              <Text style={{ fontFamily: font.body, fontSize: 11.5, color: palette.textMuted, marginTop: 1 }}>
                {t.officer.offlineSub}
              </Text>
            </View>
            <PressableScale
              accessibilityRole="button"
              onPress={() => void refetch()}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                backgroundColor: 'rgba(0,156,156,0.1)',
                borderRadius: 999,
                paddingVertical: 8,
                paddingHorizontal: 13,
              }}
            >
              <RefreshIcon size={13} color={palette.teal} />
              <Text style={{ fontFamily: font.bodyBold, fontSize: 11.5, color: palette.tealText }}>
                {t.common.retry}
              </Text>
            </PressableScale>
          </View>
        </View>
      ) : null}

      {filtered === null ? (
        <View style={{ paddingHorizontal: 18, paddingTop: 8 }}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : filtered.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 44, paddingBottom: 40 }}>
          <Image
            source={img.emptyNest}
            style={{ width: 190, height: 140, resizeMode: 'contain', marginBottom: 4 }}
          />
          <Text style={{ fontFamily: font.heading, fontSize: 18, color: palette.ink }}>
            {t.officer.emptyTitle}
          </Text>
          <Text
            style={{
              fontFamily: font.body,
              fontSize: 13,
              color: palette.textMuted,
              textAlign: 'center',
              marginTop: 7,
              lineHeight: 21,
            }}
          >
            {t.officer.emptySub}
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              marginTop: 18,
              backgroundColor: palette.white,
              borderRadius: 999,
              paddingVertical: 7,
              paddingHorizontal: 14,
            }}
          >
            <View
              style={{
                width: 7,
                height: 7,
                borderRadius: 4,
                backgroundColor: wsState === 'live' ? palette.teal : palette.caretFaint,
              }}
            />
            <Text style={{ fontFamily: font.bodyBold, fontSize: 11.5, color: palette.textFaint }}>
              {wsState === 'live' ? t.common.live : t.officer.waitingConn}
            </Text>
          </View>
        </View>
      ) : (
        <FlashList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 4, paddingBottom: insets.bottom + 16 }}
          renderItem={({ item, index }) => <QueueCard item={item} index={index} />}
        />
      )}
    </View>
  );
}
