// Case detail — AI advisory box ("PENDEKEZO LA AI, SI UAMUZI"), description,
// event timeline, guarded transitions, audited notes.
import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from '@tanstack/react-router';
import { ALLOWED_TRANSITIONS, type CaseStatus } from '@childshield/shared';
import { api } from '../lib/api';
import { sessionStore } from '../lib/session';
import { Sidebar, SeverityBadge, categoryIcon } from '../components';
import navShield from '../assets/nav-shield.png';
import ofScroll from '../assets/of-scroll.png';
import stReceived from '../assets/st-received.png';
import ofChecklist from '../assets/of-checklist.png';
import ofWarning from '../assets/of-warning.png';

interface AiPayload {
  labels?: string[];
  suggestedSeverity?: string;
  confidence?: number;
  explanation?: string[];
}

const NOTE_TAGS = ['Uchunguzi', 'Mawasiliano', 'Nyingine'];

function timeOf(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function CaseDetailPage() {
  const { id } = useParams({ from: '/case/$id' });
  const queryClient = useQueryClient();
  const [noteText, setNoteText] = useState('');
  const [noteTag, setNoteTag] = useState(0);

  const { data: detail } = useQuery({
    queryKey: ['case', id],
    queryFn: () => sessionStore.call((t) => api.caseDetail(t, id)),
    refetchInterval: 15_000,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['case', id] });
    void queryClient.invalidateQueries({ queryKey: ['cases'] });
  };

  const transition = useMutation({
    mutationFn: (to: CaseStatus) => sessionStore.call((t) => api.transition(t, id, to)),
    onSettled: invalidate, // optimistic UI allowed, but server state wins
  });

  const addNote = useMutation({
    mutationFn: () =>
      sessionStore.call((t) => api.addNote(t, id, noteText.trim(), NOTE_TAGS[noteTag])),
    onSuccess: () => setNoteText(''),
    onSettled: invalidate,
  });

  const ai = useMemo<AiPayload | null>(() => {
    const evt = detail?.events.find((e) => e.kind === 'AI_ASSESSMENT');
    return evt ? (evt.payload as AiPayload) : null;
  }, [detail]);

  const eventIcon = (kind: string) =>
    kind === 'CASE_CREATED'
      ? stReceived
      : kind === 'AI_ASSESSMENT'
        ? navShield
        : kind === 'SLA_WARNING'
          ? ofWarning
          : kind === 'NOTE_ADDED'
            ? ofScroll
            : ofChecklist;

  const eventLabel = (kind: string, payload: unknown): string => {
    if (kind === 'CASE_CREATED') return 'Kesi imeundwa';
    if (kind === 'AI_ASSESSMENT') return 'Tathmini ya AI imepokelewa';
    if (kind === 'SLA_WARNING') return 'Onyo la SLA';
    if (kind === 'NOTE_ADDED') {
      const p = payload as { tag?: string | null };
      return p.tag ? `Dokezo · ${p.tag}` : 'Dokezo';
    }
    if (kind === 'STATUS_CHANGED') {
      const p = payload as { from?: string; to?: string };
      return `Imehamishwa: ${p.from ?? '?'} → ${p.to ?? '?'}`;
    }
    return kind;
  };

  const nextOptions: readonly CaseStatus[] = detail
    ? ALLOWED_TRANSITIONS[detail.status as CaseStatus]
    : [];

  return (
    <div className="flex min-h-screen">
      <Sidebar active="queue" />
      <main className="max-w-4xl flex-1 overflow-auto p-6">
        <Link to="/" className="text-muted text-xs font-bold hover:text-teal">
          ← Foleni ya kesi
        </Link>

        {detail ? (
          <>
            <div className="mt-2 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-tealtint">
                  <img src={categoryIcon[detail.incidentType]} alt="" className="h-7 w-7" />
                </div>
                <div>
                  <h1 className="font-heading text-lg font-bold">{detail.caseCode}</h1>
                  <p className="text-muted text-xs">
                    {detail.incidentType} · {detail.channel} · {timeOf(detail.createdAt)}
                  </p>
                </div>
              </div>
              <SeverityBadge severity={detail.severity} />
            </div>

            {ai ? (
              <div className="mb-4 rounded-2xl border border-dashed border-teal bg-tealtint p-3.5">
                <div className="mb-1 flex items-center gap-1.5">
                  <img src={navShield} alt="" className="h-4 w-4" />
                  <span className="text-[11px] font-extrabold tracking-wide text-teal">
                    PENDEKEZO LA AI, SI UAMUZI
                  </span>
                </div>
                <p className="text-[13.5px] font-semibold">
                  {(ai.labels ?? []).join(', ') || '—'}, uwezekano{' '}
                  {Math.round((ai.confidence ?? 0) * 100)}%
                </p>
                <p className="text-inksoft text-[12.5px]">
                  Ukali unaopendekezwa: {ai.suggestedSeverity ?? '—'}. Afisa ndiye anayeamua.
                </p>
              </div>
            ) : null}

            <div className="mb-4 rounded-2xl bg-white p-4 text-[13.5px] leading-relaxed shadow-[0_4px_14px_rgba(5,66,64,0.06)]">
              {detail.description}
            </div>

            <div className="mb-5 rounded-2xl bg-white p-4 shadow-[0_4px_14px_rgba(5,66,64,0.06)]">
              {detail.events.map((e, i) => (
                <div key={e.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <img src={eventIcon(e.kind)} alt="" className="h-5 w-5" />
                    {i < detail.events.length - 1 ? (
                      <div className="min-h-4 w-0.5 flex-1 bg-track" />
                    ) : null}
                  </div>
                  <div className="pb-3.5">
                    <p className="text-[13px] font-bold">{eventLabel(e.kind, e.payload)}</p>
                    <p className="text-muted text-[11.5px]">{timeOf(e.createdAt)}</p>
                    {e.kind === 'NOTE_ADDED' ? (
                      <p className="text-inksoft mt-1 text-[12.5px]">
                        {(e.payload as { text?: string }).text}
                      </p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>

            {nextOptions.length > 0 ? (
              <div className="mb-5 flex gap-2">
                {nextOptions.map((to) => (
                  <button
                    key={to}
                    disabled={transition.isPending}
                    onClick={() => transition.mutate(to)}
                    className="h-11 cursor-pointer rounded-[13px] bg-teal px-5 text-[12.5px] font-bold text-white disabled:opacity-60"
                  >
                    Sogeza: {to}
                  </button>
                ))}
              </div>
            ) : null}

            <div className="rounded-2xl bg-white p-4 shadow-[0_4px_14px_rgba(5,66,64,0.06)]">
              <div className="mb-1 flex items-center gap-2">
                <img src={ofScroll} alt="" className="h-5 w-5" />
                <h2 className="font-heading text-[15px] font-bold">Ongeza dokezo</h2>
              </div>
              <p className="text-muted mb-3 text-xs">
                Litaonekana kwenye ratiba ya kesi na kumbukumbu za ukaguzi.
              </p>
              <div className="mb-2.5 flex gap-1.5">
                {NOTE_TAGS.map((tag, i) => (
                  <button
                    key={tag}
                    onClick={() => setNoteTag(i)}
                    className={`cursor-pointer rounded-full px-3 py-1.5 text-[11.5px] font-bold ${
                      noteTag === i ? 'bg-teal text-white' : 'bg-officerbg text-ink'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                rows={3}
                maxLength={2000}
                placeholder="Andika dokezo hapa..."
                className="w-full rounded-[15px] border border-ink/12 bg-warmbg p-3 text-[13px] outline-none focus:border-teal"
              />
              <p className="text-faint mt-1.5 text-[11px]">
                Usiweke jina, simu, au anwani ya mtoto kwenye dokezo.
              </p>
              <button
                disabled={!noteText.trim() || addNote.isPending}
                onClick={() => addNote.mutate()}
                className="mt-3 h-11 cursor-pointer rounded-[13px] bg-teal px-6 text-[13px] font-bold text-white disabled:opacity-50"
              >
                Hifadhi dokezo
              </button>
            </div>
          </>
        ) : (
          <div className="mt-4 flex flex-col gap-2.5">
            <div className="h-14 animate-pulse rounded-2xl bg-white" />
            <div className="h-32 animate-pulse rounded-2xl bg-white" />
          </div>
        )}
      </main>
    </div>
  );
}
