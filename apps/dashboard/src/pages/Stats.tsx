// Takwimu — live counts computed from the real queue (severity/status/channel).
// Same approach as the mobile officer Stats screen: no dedicated backend
// endpoint needed, computed client-side from GET /cases.
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { CASE_STATUSES, CHANNELS, SEVERITIES } from '@childshield/shared';
import { api } from '../lib/api';
import { sessionStore } from '../lib/session';
import { Sidebar, severityTone } from '../components';
import ofChart from '../assets/of-chart.png';

function Bar({ value, max, colorClass }: { value: number; max: number; colorClass: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="bg-officerbg h-2 flex-1 overflow-hidden rounded-full">
      <div className={`h-2 rounded-full ${colorClass}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

const severityBarColor: Record<string, string> = {
  CRITICAL: 'bg-critical',
  HIGH: 'bg-high',
  MEDIUM: 'bg-medium',
  LOW: 'bg-low',
};

export function StatsPage() {
  const { data: cases } = useQuery({
    queryKey: ['cases'],
    queryFn: () => sessionStore.call((t) => api.listCases(t)),
    refetchInterval: 60_000,
  });

  const rows = cases ?? [];
  const open = rows.filter((c) => c.status !== 'CLOSED').length;

  const bySeverity = SEVERITIES.map((s) => ({
    key: s,
    count: rows.filter((c) => c.severity === s).length,
  }));
  const unrated = rows.filter((c) => c.severity === null).length;
  const maxSev = Math.max(1, ...bySeverity.map((r) => r.count), unrated);

  const byStatus = CASE_STATUSES.map((s) => ({
    key: s,
    count: rows.filter((c) => c.status === s).length,
  })).filter((r) => r.count > 0);

  const byChannel = CHANNELS.map((ch) => ({
    key: ch,
    count: rows.filter((c) => c.channel === ch).length,
  })).filter((r) => r.count > 0);

  return (
    <div className="flex min-h-screen">
      <Sidebar active="stats" />
      <main className="max-w-3xl flex-1 overflow-auto p-6">
        <div className="mb-4 flex items-center gap-2.5">
          <img src={ofChart} alt="" className="h-[26px] w-[26px]" />
          <h1 className="font-heading text-lg font-bold">Takwimu</h1>
        </div>

        <div className="mb-5 flex gap-3">
          <div className="flex-1 rounded-2xl bg-white p-4">
            <div className="font-heading text-teal text-3xl font-extrabold">{open}</div>
            <div className="text-muted mt-0.5 text-[11.5px] font-bold">Kesi zilizo wazi</div>
          </div>
          <div className="flex-1 rounded-2xl bg-white p-4">
            <div className="font-heading text-3xl font-extrabold">{rows.length}</div>
            <div className="text-muted mt-0.5 text-[11.5px] font-bold">Jumla ya kesi</div>
          </div>
        </div>

        <p className="text-muted mb-2 text-[11px] font-extrabold tracking-wide">KWA UKALI</p>
        <div className="mb-5 flex flex-col gap-3 rounded-2xl bg-white p-4">
          {bySeverity.map((r) => (
            <div key={r.key} className="flex items-center gap-2.5">
              <span
                className={`w-[70px] text-[10.5px] font-extrabold ${severityTone[r.key as keyof typeof severityTone].fg}`}
              >
                {r.key}
              </span>
              <Bar value={r.count} max={maxSev} colorClass={severityBarColor[r.key] ?? 'bg-teal'} />
              <span className="w-6 text-right text-[12.5px] font-bold">{r.count}</span>
            </div>
          ))}
          <div className="flex items-center gap-2.5">
            <span className="text-muted w-[70px] text-[10.5px] font-extrabold">BILA UKALI</span>
            <Bar value={unrated} max={maxSev} colorClass="bg-faint" />
            <span className="w-6 text-right text-[12.5px] font-bold">{unrated}</span>
          </div>
        </div>

        <p className="text-muted mb-2 text-[11px] font-extrabold tracking-wide">KWA HALI</p>
        <div className="mb-5 rounded-2xl bg-white px-4">
          {byStatus.map((r, i) => (
            <div
              key={r.key}
              className={`flex items-center justify-between py-3 text-[12.5px] ${i < byStatus.length - 1 ? 'border-b border-ink/6' : ''}`}
            >
              <span className="font-bold">{r.key}</span>
              <span className="text-muted font-bold">{r.count}</span>
            </div>
          ))}
          {byStatus.length === 0 ? (
            <div className="text-muted py-6 text-center text-[12.5px]">Hakuna data bado.</div>
          ) : null}
        </div>

        <p className="text-muted mb-2 text-[11px] font-extrabold tracking-wide">KWA NJIA</p>
        <div className="flex flex-wrap gap-2">
          {byChannel.map((r) => (
            <div key={r.key} className="flex gap-1.5 rounded-full bg-white px-3.5 py-1.5">
              <span className="text-[11.5px] font-bold">{r.key}</span>
              <span className="text-teal text-[11.5px] font-bold">{r.count}</span>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
