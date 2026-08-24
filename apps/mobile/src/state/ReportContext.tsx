// In-memory draft of the anonymous report. Never persisted to disk —
// quick-exit wipes it instantly (anonymity + safety UX).
import React, { createContext, useContext, useMemo, useState } from 'react';
import type { AgeBand, IncidentType, ReporterType } from '@childshield/shared';

export interface ReportDraft {
  incidentType: IncidentType | null;
  reporterType: ReporterType | null;
  ageBand: AgeBand | null;
  county: string | null;
  description: string;
  consented: boolean;
}

const emptyDraft: ReportDraft = {
  incidentType: null,
  reporterType: null,
  ageBand: null,
  county: null,
  description: '',
  consented: false,
};

interface ReportState {
  draft: ReportDraft;
  update: (patch: Partial<ReportDraft>) => void;
  reset: () => void;
}

const ReportContext = createContext<ReportState | null>(null);

export function ReportProvider({ children }: { children: React.ReactNode }) {
  const [draft, setDraft] = useState<ReportDraft>(emptyDraft);
  const value = useMemo<ReportState>(
    () => ({
      draft,
      update: (patch) => setDraft((d) => ({ ...d, ...patch })),
      reset: () => setDraft(emptyDraft),
    }),
    [draft],
  );
  return <ReportContext.Provider value={value}>{children}</ReportContext.Provider>;
}

export function useReport(): ReportState {
  const ctx = useContext(ReportContext);
  if (!ctx) throw new Error('useReport must be used inside ReportProvider');
  return ctx;
}
