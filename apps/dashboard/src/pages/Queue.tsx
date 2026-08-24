// Foleni ya kesi hai — dense live queue table (mockup parity). WS events
// invalidate the query; the officer sees new/updated cases instantly.
import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import type { CaseStatus, CaseSummaryDto, Severity } from '@childshield/shared';
import { api } from '../lib/api';
import { sessionStore } from '../lib/session';
import { connectQueueSocket, type WsState } from '../lib/ws';
import { Sidebar, SeverityBadge } from '../components';
import officerQueue from '../assets/officer-queue.png';

type Filter = 'ALL' | CaseStatus | `SEV:${Severity}`;

const severityRank: Record<Severity, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

function minutesSince(iso: string): number {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
}

export function QueuePage() {
  const queryClient = useQueryClient();
  const [wsState, setWsState] = useState<WsState>('connecting');
  const [filter, setFilter] = useState<Filter>('ALL');

  const { data: cases } = useQuery({
    queryKey: ['cases'],
    queryFn: () => sessionStore.call((t) => api.listCases(t)),
    refetchInterval: 60_000,
  });

  useEffect(() => {
    const disconnect = connectQueueSocket({
      onState: setWsState,
      onEvent: () => void queryClient.invalidateQueries({ queryKey: ['cases'] }),
    });
    return disconnect;
  }, [queryClient]);

  const rows = useMemo(() => {
    const filtered = (cases ?? []).filter((c) => {
      if (filter === 'ALL') return true;
      if (filter.startsWith('SEV:')) return c.severity === filter.slice(4);
      return c.status === filter;
    });
    return [...filtered].sort((a, b) => {
      const ra = a.severity ? severityRank[a.severity] : 4;
      const rb = b.severity ? severityRank[b.severity] : 4;
      if (ra !== rb) return ra - rb;
      return a.createdAt.localeCompare(b.createdAt);
    });
  }, [cases, filter]);

  const chip = (key: Filter, label: string, danger?: 'critical' | 'high') => (
    <button
      key={key}
      onClick={() => setFilter(filter === key ? 'ALL' : key)}
      className={`cursor-pointer rounded-lg px-3 py-1.5 text-[11.5px] font-bold ${
        filter === key
          ? 'bg-teal text-white'
          : danger === 'critical'
            ? 'bg-criticalbg text-critical'
            : danger === 'high'
              ? 'bg-highbg text-high'
              : 'border border-ink/14 bg-white text-ink'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex min-h-screen">
      <Sidebar active="queue" />
      <main className="flex-1 overflow-auto p-6">
        <div className="mb-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src={officerQueue} alt="" className="h-[26px] w-[30px]" />
            <h1 className="font-heading text-lg font-bold">Foleni ya kesi hai</h1>
          </div>
          <div className="text-inksoft flex items-center gap-1.5 text-xs">
            <span
              className={`h-2 w-2 rounded-full ${
                wsState === 'live' ? 'bg-teal' : wsState === 'connecting' ? 'bg-track' : 'bg-high'
              }`}
            />
            {wsState === 'live' ? 'Live · queue room' : wsState === 'connecting' ? 'Inaunganisha…' : 'Haiko mtandaoni'}
          </div>
        </div>

        <div className="mb-3.5 flex flex-wrap items-center gap-2">
          {chip('ALL', 'Zote')}
          {chip('RECEIVED', 'RECEIVED')}
          {chip('TRIAGED', 'TRIAGED')}
          {chip('UNDER_REVIEW', 'UNDER_REVIEW')}
          <span className="mx-0.5 h-6 w-px bg-ink/15" />
          {chip('SEV:CRITICAL', 'CRITICAL', 'critical')}
          {chip('SEV:HIGH', 'HIGH', 'high')}
        </div>

        <div className="overflow-hidden rounded-2xl bg-white shadow-[0_4px_14px_rgba(5,66,64,0.06)]">
          <div className="text-muted grid grid-cols-[1.2fr_1.3fr_0.9fr_1.1fr_1fr_0.9fr] border-b border-ink/8 px-4 py-2.5 text-[11px] font-extrabold tracking-wide">
            <div>KESI</div>
            <div>AINA</div>
            <div>UKALI</div>
            <div>HALI</div>
            <div>SLA</div>
            <div>NJIA</div>
          </div>
          {rows.length === 0 ? (
            <div className="text-muted px-4 py-10 text-center text-sm">
              Hakuna kesi kwenye foleni sasa hivi. Kesi mpya itatokea hapa papo hapo.
            </div>
          ) : (
            rows.map((c: CaseSummaryDto) => {
              const mins = minutesSince(c.createdAt);
              const urgent = c.severity === 'CRITICAL' || c.severity === 'HIGH';
              return (
                <Link
                  key={c.id}
                  to="/case/$id"
                  params={{ id: c.id }}
                  className="grid grid-cols-[1.2fr_1.3fr_0.9fr_1.1fr_1fr_0.9fr] items-center border-b border-ink/6 px-4 py-3 text-[12.5px] transition-colors last:border-b-0 hover:bg-tealtint/60"
                >
                  <div className="font-heading font-bold">{c.caseCode}</div>
                  <div>{c.incidentType}</div>
                  <div>
                    <SeverityBadge severity={c.severity} />
                  </div>
                  <div>{c.status}</div>
                  <div className={urgent ? 'text-critical font-bold' : ''}>Dakika {mins}</div>
                  <div>{c.channel}</div>
                </Link>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
