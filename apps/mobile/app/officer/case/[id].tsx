// Case detail — timeline of CaseEvents, advisory AI box ("PENDEKEZO LA AI,
// SI UAMUZI" — never auto-applied), presence ("officer X is viewing"),
// guarded transitions, and the add-note sheet.
// B1 wiring note: a note saved here is attached to the next transition call
// (the standalone notes endpoint arrives with B2).
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, ScrollView, Text, TextInput, View } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WS_ROOM_QUEUE, wsCaseRoom } from '@childshield/shared/constants';
import { ALLOWED_TRANSITIONS } from '@childshield/shared/transitions';
import type { CaseDetailDto, CaseStatus } from '@childshield/shared';
import { img } from '../../../src/assets';
import { BottomSheet } from '../../../src/components/BottomSheet';
import { PressableScale } from '../../../src/components/PressableScale';
import { CaretLeftIcon, InfoIcon } from '../../../src/components/icons';
import { api } from '../../../src/lib/api';
import { snap, warn } from '../../../src/lib/haptics';
import { announce, liveRegion } from '../../../src/lib/a11y';
import { useApp } from '../../../src/state/AppContext';
import { useOfficer } from '../../../src/state/OfficerContext';
import { font, palette, severityColor } from '../../../src/theme/tokens';

interface AiPayload {
  labels?: string[];
  suggestedSeverity?: string;
  confidence?: number;
}

function timeOf(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function CaseDetail() {
  const { t } = useApp();
  const { session, call } = useOfficer();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [detail, setDetail] = useState<CaseDetailDto | null>(null);
  const [viewers, setViewers] = useState<string[]>([]);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteTag, setNoteTag] = useState(0);
  const [noteText, setNoteText] = useState('');
  const [chooseOpen, setChooseOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!session || !id) return;
    try {
      setDetail(await call((token) => api.caseDetail(token, id)));
    } catch {
      // stays on last data
    }
  }, [session, id, call]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  // Case-room socket: presence + live updates for this case.
  useEffect(() => {
    if (!session || !id) return;
    let ws: WebSocket | null = null;
    let closed = false;
    void (async () => {
      try {
        const { ticket } = await call((token) => api.wsTicket(token));
        if (closed) return;
        ws = new WebSocket(`${api.baseUrl.replace(/^http/, 'ws')}/ws?ticket=${ticket}`);
        ws.onopen = () => {
          ws?.send(JSON.stringify({ type: 'subscribe', room: wsCaseRoom(id) }));
          ws?.send(JSON.stringify({ type: 'subscribe', room: WS_ROOM_QUEUE }));
        };
        ws.onmessage = (evt) => {
          try {
            const frame = JSON.parse(String(evt.data)) as {
              event?: string;
              room?: string;
              viewers?: string[];
            };
            if (frame.event === 'presence' && frame.room === wsCaseRoom(id)) {
              setViewers(frame.viewers ?? []);
            } else if (
              frame.event === 'case.transitioned' ||
              frame.event === 'sla.warning' ||
              frame.event === 'ai.assessed'
            ) {
              void refetch();
            }
          } catch {
            // ignore malformed frames
          }
        };
      } catch {
        // presence is a nicety; REST remains the source of truth
      }
    })();
    return () => {
      closed = true;
      ws?.close();
    };
  }, [session, id, refetch, call]);

  const ai = useMemo<AiPayload | null>(() => {
    const evt = detail?.events.find((e) => e.kind === 'AI_ASSESSMENT');
    return evt ? (evt.payload as AiPayload) : null;
  }, [detail]);

  if (!session) return <Redirect href="/officer/login" />;

  const status = detail?.status;
  const nextOptions: readonly CaseStatus[] = status ? ALLOWED_TRANSITIONS[status] : [];
  const sevTone = detail?.severity ? severityColor[detail.severity] : null;

  const doTransition = async (to: CaseStatus) => {
    if (!detail || busy) return;
    setBusy(true);
    setActionError(null);
    snap();
    try {
      await call((token) => api.transition(token, detail.id, to));
      await refetch();
    } catch {
      warn();
      // ACCESSIBILITY: a haptic is not feedback when the phone is on a desk,
      // and a silent failure on a safeguarding action is a triage risk.
      setActionError(t.officer.actionFailed);
      announce(t.officer.actionFailed);
      await refetch(); // server state wins
    } finally {
      setBusy(false);
      setChooseOpen(false);
    }
  };

  const saveNote = async () => {
    const text = noteText.trim();
    if (!text || !id || busy) return;
    const tags = [t.officer.noteTagInvestigation, t.officer.noteTagContact, t.officer.noteTagOther];
    setBusy(true);
    setActionError(null);
    snap();
    try {
      await call((token) => api.addNote(token, id, text, tags[noteTag]));
      setNoteText('');
      setNoteOpen(false);
      await refetch();
    } catch {
      warn();
      setActionError(t.officer.actionFailed);
      announce(t.officer.actionFailed);
    } finally {
      setBusy(false);
    }
  };

  const eventLabel = (kind: string, payload: unknown): string => {
    if (kind === 'CASE_CREATED') return t.officer.caseCreated;
    if (kind === 'AI_ASSESSMENT') return t.officer.aiReceived;
    if (kind === 'SLA_WARNING') return t.officer.slaWarning;
    if (kind === 'NOTE_ADDED') {
      const p = payload as { tag?: string | null };
      return p.tag ? `${t.officer.noteLabel} · ${p.tag}` : t.officer.noteLabel;
    }
    if (kind === 'STATUS_CHANGED') {
      const p = payload as { from?: string; to?: string };
      return t.officer.moved(p.from ?? '?', p.to ?? '?');
    }
    return kind;
  };
  const eventIcon = (kind: string) => {
    if (kind === 'CASE_CREATED') return img.st.received;
    if (kind === 'AI_ASSESSMENT') return img.nav.shield;
    if (kind === 'SLA_WARNING') return img.of.warning;
    if (kind === 'NOTE_ADDED') return img.of.scroll;
    return img.of.checklist;
  };
  const eventNoteText = (kind: string, payload: unknown): string | null => {
    if (kind !== 'NOTE_ADDED') return null;
    const p = payload as { text?: string };
    return p.text ?? null;
  };

  return (
    <View style={{ flex: 1, backgroundColor: palette.officerBg }}>
      <View style={{ paddingTop: insets.top + 10, paddingHorizontal: 16, paddingBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => router.back()}
            style={{
              width: 34,
              height: 34,
              borderRadius: 12,
              backgroundColor: palette.white,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CaretLeftIcon size={16} color={palette.ink} />
          </PressableScale>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: font.heading, fontSize: 17, color: palette.ink }}>
              {detail?.caseCode ?? '—'}
            </Text>
            <Text style={{ fontFamily: font.body, fontSize: 12, color: palette.textMuted, marginTop: 2 }}>
              {detail
                ? `${t.incidentTypes[detail.incidentType]} · ${detail.channel} · ${t.officer.today} ${timeOf(detail.createdAt)}`
                : ''}
            </Text>
          </View>
          {detail?.severity && sevTone ? (
            <View
              style={{
                backgroundColor: detail.severity === 'HIGH' ? palette.highBadge : sevTone.fg,
                borderRadius: 8,
                paddingVertical: 5,
                paddingHorizontal: 9,
              }}
            >
              <Text
                style={{
                  fontFamily: font.bodyExtra,
                  fontSize: 11,
                  letterSpacing: 0.4,
                  color: palette.white,
                }}
              >
                {detail.severity}
              </Text>
            </View>
          ) : null}
        </View>
        {viewers.length > 0 ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 }}>
            <View style={{ flexDirection: 'row' }}>
              {viewers.slice(0, 3).map((v, i) => (
                <View
                  key={v}
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    backgroundColor: i % 2 === 0 ? palette.teal : palette.amber,
                    borderWidth: 2,
                    borderColor: palette.officerBg,
                    marginLeft: i > 0 ? -7 : 0,
                  }}
                />
              ))}
            </View>
            <Text style={{ fontFamily: font.body, fontSize: 11.5, color: palette.textMuted }}>
              {t.officer.viewing(viewers.length)}
            </Text>
          </View>
        ) : null}
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}>
        {actionError ? (
          <View
            {...liveRegion(true)}
            style={{
              backgroundColor: palette.criticalBgSoft,
              borderRadius: 14,
              paddingVertical: 12,
              paddingHorizontal: 14,
              marginTop: 12,
            }}
          >
            <Text style={{ fontFamily: font.bodySemi, fontSize: 13, color: palette.criticalInk }}>
              {actionError}
            </Text>
          </View>
        ) : null}
        {ai ? (
          <View
            style={{
              backgroundColor: palette.tealTint,
              borderWidth: 1,
              borderStyle: 'dashed',
              borderColor: palette.teal,
              borderRadius: 16,
              padding: 14,
              marginBottom: 16,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 5 }}>
              <Image source={img.nav.shield} style={{ width: 18, height: 18, resizeMode: 'contain' }} />
              <Text
                style={{
                  fontFamily: font.bodyExtra,
                  fontSize: 11,
                  letterSpacing: 0.4,
                  color: palette.tealText,
                }}
              >
                {t.officer.aiLabel}
              </Text>
            </View>
            <Text style={{ fontFamily: font.bodySemi, fontSize: 13.5, color: palette.ink }}>
              {t.officer.aiSuggestion(
                ai.labels?.join(', ') ?? '—',
                Math.round((ai.confidence ?? 0) * 100),
              )}
            </Text>
            <Text style={{ fontFamily: font.body, fontSize: 12.5, color: palette.inkSoft, marginTop: 3 }}>
              {t.officer.aiSeverity(ai.suggestedSeverity ?? '—')}
            </Text>
          </View>
        ) : null}

        {/* Description (officer view only) */}
        {detail ? (
          <View style={{ backgroundColor: palette.white, borderRadius: 16, padding: 14, marginBottom: 16 }}>
            <Text style={{ fontFamily: font.body, fontSize: 13.5, color: palette.ink, lineHeight: 20 }}>
              {detail.description}
            </Text>
          </View>
        ) : null}

        {/* Timeline */}
        <View>
          {(detail?.events ?? []).map((e, i, arr) => (
            <View key={e.id} style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ alignItems: 'center' }}>
                <Image
                  source={eventIcon(e.kind)}
                  style={{ width: 20, height: 20, resizeMode: 'contain' }}
                />
                {i < arr.length - 1 ? (
                  <View style={{ width: 2, flex: 1, minHeight: 20, backgroundColor: palette.track }} />
                ) : null}
              </View>
              <View style={{ paddingBottom: 14, flex: 1 }}>
                <Text style={{ fontFamily: font.bodyBold, fontSize: 13, color: palette.ink }}>
                  {eventLabel(e.kind, e.payload)}
                </Text>
                <Text style={{ fontFamily: font.body, fontSize: 11.5, color: palette.textMuted }}>
                  {timeOf(e.createdAt)}
                  {e.kind === 'CASE_CREATED' && detail ? ` · ${detail.channel}` : ''}
                </Text>
                {eventNoteText(e.kind, e.payload) ? (
                  <Text
                    style={{
                      fontFamily: font.body,
                      fontSize: 12.5,
                      color: palette.inkSoft,
                      marginTop: 4,
                      lineHeight: 18,
                    }}
                  >
                    {eventNoteText(e.kind, e.payload)}
                  </Text>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Actions */}
      <View
        style={{
          flexDirection: 'row',
          gap: 8,
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: insets.bottom + 12,
          borderTopWidth: 1,
          borderTopColor: 'rgba(5,66,64,0.1)',
        }}
      >
        <PressableScale
          accessibilityRole="button"
          onPress={() => setNoteOpen(true)}
          style={{
            flex: 1,
            height: 44,
            borderRadius: 13,
            backgroundColor: palette.white,
            borderWidth: 1,
            borderColor: 'rgba(5,66,64,0.18)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontFamily: font.bodyBold, fontSize: 12.5, color: palette.ink }}>
            {t.officer.addNote}
          </Text>
        </PressableScale>
        {nextOptions.length > 0 ? (
          <PressableScale
            accessibilityRole="button"
            disabled={busy}
            onPress={() => {
              if (nextOptions.length === 1 && nextOptions[0]) void doTransition(nextOptions[0]);
              else setChooseOpen(true);
            }}
            style={{
              flex: 1.4,
              height: 44,
              borderRadius: 13,
              backgroundColor: palette.teal,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: busy ? 0.6 : 1,
            }}
          >
            <Text style={{ fontFamily: font.bodyBold, fontSize: 12.5, color: palette.white }}>
              {t.officer.move(nextOptions.length === 1 ? (nextOptions[0] ?? '') : '…')}
            </Text>
          </PressableScale>
        ) : null}
      </View>

      {/* Transition chooser (UNDER_REVIEW -> REFERRED | CLOSED) */}
      <BottomSheet closeLabel={t.common.cancel} open={chooseOpen} onClose={() => setChooseOpen(false)}>
        <View style={{ gap: 8 }}>
          {nextOptions.map((to) => (
            <PressableScale
              key={to}
              accessibilityRole="button"
              onPress={() => void doTransition(to)}
              style={{
                height: 46,
                borderRadius: 14,
                backgroundColor: palette.teal,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontFamily: font.bodyBold, fontSize: 13, color: palette.white }}>
                {t.officer.move(to)}
              </Text>
            </PressableScale>
          ))}
        </View>
      </BottomSheet>

      {/* Note sheet */}
      <BottomSheet closeLabel={t.common.cancel} open={noteOpen} onClose={() => setNoteOpen(false)}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
          <Image source={img.of.scroll} style={{ width: 24, height: 24, resizeMode: 'contain' }} />
          <Text style={{ fontFamily: font.heading, fontSize: 17, color: palette.ink }}>
            {t.officer.addNote}
          </Text>
        </View>
        <Text style={{ fontFamily: font.body, fontSize: 12, color: palette.textMuted, marginTop: 3 }}>
          {t.officer.noteSheetSub}
        </Text>
        <View style={{ flexDirection: 'row', gap: 7, marginTop: 14 }}>
          {[t.officer.noteTagInvestigation, t.officer.noteTagContact, t.officer.noteTagOther].map(
            (tag, i) => (
              <PressableScale
                key={tag}
                accessibilityRole="button"
                accessibilityState={{ selected: noteTag === i }}
                onPress={() => setNoteTag(i)}
                style={{
                  backgroundColor: noteTag === i ? palette.teal : palette.officerBg,
                  borderRadius: 999,
                  paddingVertical: 7,
                  paddingHorizontal: 13,
                }}
              >
                <Text
                  style={{
                    fontFamily: font.bodyBold,
                    fontSize: 11.5,
                    color: noteTag === i ? palette.white : palette.ink,
                  }}
                >
                  {tag}
                </Text>
              </PressableScale>
            ),
          )}
        </View>
        <TextInput
          accessibilityLabel={t.officer.notePlaceholder}
          multiline
          value={noteText}
          onChangeText={setNoteText}
          placeholder={t.officer.notePlaceholder}
          placeholderTextColor={palette.textFaint}
          style={{
            backgroundColor: palette.cream,
            borderWidth: 1,
            borderColor: 'rgba(5,66,64,0.12)',
            borderRadius: 15,
            padding: 13,
            paddingHorizontal: 15,
            marginTop: 12,
            minHeight: 84,
            fontFamily: font.body,
            fontSize: 13,
            color: palette.ink,
            textAlignVertical: 'top',
          }}
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
          <InfoIcon size={14} color={palette.textFaint} />
          <Text style={{ fontFamily: font.body, fontSize: 11, color: palette.textFaint, flex: 1 }}>
            {t.officer.notePiiWarning}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
          <PressableScale
            accessibilityRole="button"
            onPress={() => setNoteOpen(false)}
            style={{
              flex: 1,
              height: 46,
              borderRadius: 14,
              backgroundColor: palette.officerBg,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontFamily: font.bodyBold, fontSize: 13, color: palette.ink }}>
              {t.common.cancel}
            </Text>
          </PressableScale>
          <PressableScale
            accessibilityRole="button"
            disabled={busy || !noteText.trim()}
            onPress={() => void saveNote()}
            style={{
              flex: 1.5,
              height: 46,
              borderRadius: 14,
              backgroundColor: palette.teal,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: busy || !noteText.trim() ? 0.6 : 1,
            }}
          >
            <Text style={{ fontFamily: font.bodyBold, fontSize: 13, color: palette.white }}>
              {t.officer.saveNote}
            </Text>
          </PressableScale>
        </View>
      </BottomSheet>
    </View>
  );
}
