import React, { useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import type { IncidentType, Role, Severity } from '@childshield/shared';
import { sessionStore, useSession } from './lib/session';
import logo from './assets/logo.png';
import ofInbox from './assets/of-inbox.png';
import ofChecklist from './assets/of-checklist.png';
import ofChart from './assets/of-chart.png';
import ofScroll from './assets/of-scroll.png';

const AUDIT_ROLES: readonly Role[] = ['AUDITOR', 'SUPERVISOR', 'ADMIN'];
import grooming from './assets/grooming.png';
import sextortion from './assets/sextortion.png';
import bullying from './assets/bullying.png';
import selfharm from './assets/selfharm.png';
import coercion from './assets/coercion.png';
import exposure from './assets/exposure.png';
import other from './assets/other.png';

export const categoryIcon: Record<IncidentType, string> = {
  GROOMING: grooming,
  SEXTORTION: sextortion,
  BULLYING: bullying,
  SELF_HARM: selfharm,
  COERCION: coercion,
  HARMFUL_EXPOSURE: exposure,
  OTHER: other,
};

export const severityTone: Record<Severity, { fg: string; bg: string }> = {
  CRITICAL: { fg: 'text-critical', bg: 'bg-criticalbg' },
  HIGH: { fg: 'text-high', bg: 'bg-highbg' },
  MEDIUM: { fg: 'text-medium', bg: 'bg-mediumbg' },
  LOW: { fg: 'text-low', bg: 'bg-lowbg' },
};

export function SeverityBadge({ severity }: { severity: Severity | null }) {
  if (!severity) return <span className="text-faint text-xs">—</span>;
  const tone = severityTone[severity];
  return (
    <span
      className={`${tone.fg} ${tone.bg} rounded-md px-2 py-0.5 text-[10.5px] font-extrabold tracking-wide`}
    >
      {severity}
    </span>
  );
}

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

type SidebarSection = 'queue' | 'stats' | 'audit';

/// Left rail from the mockups: logo, section icons, avatar.
/// - Foleni (queue) and Takwimu (stats) are live for every staff role.
/// - Ukaguzi (audit) is live, gated to AUDITOR/SUPERVISOR/ADMIN — the server
///   enforces this too; a lower-privilege role sees a clear "not permitted"
///   toast rather than a silently-dead icon.
/// - Rufaa (referrals) needs the B4 referral backend — shows a "coming soon"
///   toast on click instead of doing nothing.
export function Sidebar({ active }: { active: SidebarSection }) {
  const session = useSession();
  const navigate = useNavigate();
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2600);
  };

  const canSeeAudit = session ? AUDIT_ROLES.includes(session.role) : false;

  const iconButtonClass = (isActive: boolean) =>
    `flex h-[42px] w-[42px] items-center justify-center rounded-[14px] transition-colors ${
      isActive ? 'bg-teal/12' : 'hover:bg-officerbg'
    }`;

  return (
    <aside className="relative m-4 mr-0 flex w-16 shrink-0 flex-col items-center gap-1.5 rounded-[20px] bg-white py-3.5 shadow-[0_10px_30px_rgba(5,66,64,0.1)]">
      <img src={logo} alt="ChildShield" className="mb-2.5 h-[34px] w-[34px]" />

      <Link to="/" title="Foleni ya kesi" className={iconButtonClass(active === 'queue')}>
        <img src={ofInbox} alt="" className={`h-6 w-6 ${active === 'queue' ? '' : 'opacity-40 grayscale'}`} />
      </Link>

      <Link to="/stats" title="Takwimu" className={iconButtonClass(active === 'stats')}>
        <img src={ofChart} alt="" className={`h-6 w-6 ${active === 'stats' ? '' : 'opacity-40 grayscale'}`} />
      </Link>

      <button
        type="button"
        title={canSeeAudit ? 'Kumbukumbu za ukaguzi' : 'Inahitaji jukumu la AUDITOR/SUPERVISOR/ADMIN'}
        onClick={() => {
          if (canSeeAudit) void navigate({ to: '/audit' });
          else showToast('Huna ruhusa ya kuona ukaguzi (AUDITOR/SUPERVISOR/ADMIN pekee).');
        }}
        className={`${iconButtonClass(active === 'audit')} cursor-pointer border-0 bg-transparent p-0`}
      >
        <img
          src={ofScroll}
          alt=""
          className={`h-6 w-6 ${active === 'audit' ? '' : canSeeAudit ? 'opacity-40 grayscale' : 'opacity-25 grayscale'}`}
        />
      </button>

      <button
        type="button"
        title="Rufaa — inakuja hivi karibuni"
        onClick={() => showToast('Rufaa kwa washirika inakuja hivi karibuni (Milestone B4).')}
        className={`${iconButtonClass(false)} cursor-pointer border-0 bg-transparent p-0`}
      >
        <img src={ofChecklist} alt="" className="h-6 w-6 opacity-25 grayscale" />
      </button>

      <div className="flex-1" />
      <button
        title={`${session?.displayName ?? ''} — Ondoka`}
        onClick={() => {
          sessionStore.logout();
          void navigate({ to: '/login' });
        }}
        className="flex h-[34px] w-[34px] cursor-pointer items-center justify-center rounded-full bg-amber text-xs font-extrabold text-ink"
      >
        {session ? initialsOf(session.displayName) : '?'}
      </button>

      {toast ? (
        <div className="pointer-events-none absolute top-4 left-full ml-3 w-64 rounded-xl bg-ink px-3.5 py-2.5 text-[12.5px] leading-snug text-white shadow-lg">
          {toast}
        </div>
      ) : null}
    </aside>
  );
}
