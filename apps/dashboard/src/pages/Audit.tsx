// Kumbukumbu za ukaguzi — read-only audit log viewer with hash-chain
// verification badge. AUDITOR/SUPERVISOR/ADMIN only (server-enforced too).
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { AuditLogEntryDto } from '@childshield/shared';
import { api, ApiError } from '../lib/api';
import { sessionStore } from '../lib/session';
import { Sidebar } from '../components';
import ofScroll from '../assets/of-scroll.png';
import ofChain from '../assets/of-chain.png';
import ofWarning from '../assets/of-warning.png';

const ACTION_TONE: Record<string, string> = {
  'case.create': 'bg-mediumbg text-medium',
  'case.transition': 'bg-tealtint text-teal',
  'case.note_add': 'bg-tealtint text-teal',
  'case.sla_warning': 'bg-highbg text-high',
  'case.ai_assessment': 'bg-tealtint text-teal',
  override: 'bg-criticalbg text-critical',
};

function actionBadgeClass(action: string): string {
  for (const [prefix, cls] of Object.entries(ACTION_TONE)) {
    if (action.startsWith(prefix) || action === prefix) return cls;
  }
  return 'bg-officerbg text-ink';
}

function actionLabel(action: string): string {
  const labels: Record<string, string> = {
    'case.create': 'CREATED',
    'case.transition': 'STATUS',
    'case.note_add': 'NOTE',
    'case.sla_warning': 'SLA',
    'case.ai_assessment': 'AI',
  };
  return labels[action] ?? action.toUpperCase();
}

function timeOf(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function actorLabel(entry: AuditLogEntryDto): string {
  if (entry.actorDisplayName) return entry.actorDisplayName;
  if (entry.actorType === 'system') return 'Mfumo';
  if (entry.actorType === 'anonymous') return 'Mtoa ripoti (bila jina)';
  return entry.actorType;
}

export function AuditPage() {
  const [pages, setPages] = useState<AuditLogEntryDto[][]>([]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['audit', 'first'],
    queryFn: () => sessionStore.call((t) => api.listAudit(t, { limit: 50 })),
    refetchInterval: 30_000,
    retry: (count, err) => !(err instanceof ApiError && err.status === 403) && count < 1,
  });

  if (error instanceof ApiError && error.status === 403) {
    return (
      <div className="flex min-h-screen">
        <Sidebar active="audit" />
        <main className="flex flex-1 items-center justify-center p-6">
          <div className="max-w-sm rounded-2xl bg-white p-6 text-center">
            <img src={ofWarning} alt="" className="mx-auto mb-3 h-9 w-9" />
            <p className="font-heading mb-1 font-bold">Huna ruhusa</p>
            <p className="text-muted text-[13px]">
              Ukurasa huu unahitaji jukumu la AUDITOR, SUPERVISOR, au ADMIN.
            </p>
          </div>
        </main>
      </div>
    );
  }

  const first = data?.entries ?? [];
  const allEntries = [...first, ...pages.flat()];
  const chainValid = data?.chainValid ?? true;

  const loadMore = async () => {
    const lastId = allEntries[allEntries.length - 1]?.id;
    if (!lastId) return;
    const next = await sessionStore.call((t) => api.listAudit(t, { limit: 50, before: lastId }));
    setPages((p) => [...p, next.entries]);
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar active="audit" />
      <main className="max-w-5xl flex-1 overflow-auto p-6">
        <div className="mb-1.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src={ofScroll} alt="" className="h-[26px] w-[26px]" />
            <h1 className="font-heading text-lg font-bold">Kumbukumbu za ukaguzi</h1>
          </div>
          <div
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 ${
              chainValid ? 'bg-lowbg' : 'bg-criticalbg'
            }`}
          >
            <img src={chainValid ? ofChain : ofWarning} alt="" className="h-[17px] w-[17px]" />
            <span
              className={`text-[11.5px] font-bold ${chainValid ? 'text-inksoft' : 'text-critical'}`}
            >
              {chainValid ? 'Mnyororo umethibitishwa' : 'ONYO: Mnyororo umevunjika'}
            </span>
          </div>
        </div>
        <p className="text-muted mb-3.5 text-xs">
          Hurekodiwa tu, haifutiki wala kubadilishwa. Jukumu: AUDITOR.
        </p>

        <div className="overflow-hidden rounded-2xl bg-white shadow-[0_4px_14px_rgba(5,66,64,0.06)]">
          <div className="text-muted grid grid-cols-[0.8fr_1.2fr_1fr_1fr_1.3fr] border-b border-ink/8 px-4 py-2.5 text-[11px] font-extrabold tracking-wide">
            <div>MUDA</div>
            <div>MTENDAJI</div>
            <div>KITENDO</div>
            <div>KESI</div>
            <div>HASH YA INGIZO</div>
          </div>

          {isLoading ? (
            <div className="text-muted p-6 text-center text-sm">Inapakia...</div>
          ) : allEntries.length === 0 ? (
            <div className="text-muted p-8 text-center text-sm">Hakuna kumbukumbu bado.</div>
          ) : (
            allEntries.map((e, i) => (
              <div
                key={e.id}
                className={`grid grid-cols-[0.8fr_1.2fr_1fr_1fr_1.3fr] items-center px-4 py-2.5 text-[12px] ${
                  i < allEntries.length - 1 ? 'border-b border-ink/6' : ''
                }`}
              >
                <div>{timeOf(e.createdAt)}</div>
                <div className="font-bold">{actorLabel(e)}</div>
                <div>
                  <span
                    className={`rounded-md px-1.5 py-0.5 text-[10.5px] font-extrabold ${actionBadgeClass(e.action)}`}
                  >
                    {actionLabel(e.action)}
                  </span>
                </div>
                <div>{e.entityLabel ?? '—'}</div>
                <div className="text-muted font-mono text-[11px]">
                  {e.entryHash.slice(0, 4)}…{e.entryHash.slice(-4)} ✓
                </div>
              </div>
            ))
          )}
        </div>

        {allEntries.length >= 50 ? (
          <button
            onClick={() => void loadMore()}
            className="text-teal mt-3 cursor-pointer text-[12.5px] font-bold hover:underline"
          >
            Onyesha zaidi
          </button>
        ) : null}
      </main>
    </div>
  );
}
