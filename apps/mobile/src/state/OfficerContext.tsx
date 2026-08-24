// Officer session. Tokens live in memory for the session; the officer app
// area is unreachable without a successful staff login + TOTP.
// `call()` wraps authenticated requests: on a 401 it refreshes the token
// pair once and retries, so 15-minute access tokens never interrupt work.
import React, { createContext, useContext, useMemo, useRef, useState } from 'react';
import type { Role } from '@childshield/shared';
import { api, ApiError } from '../lib/api';

interface OfficerSession {
  accessToken: string;
  refreshToken: string;
  role: Role;
  displayName: string;
}

interface OfficerState {
  session: OfficerSession | null;
  login: (email: string, password: string, totpCode?: string) => Promise<void>;
  logout: () => void;
  /// Run an authenticated API call with automatic refresh-and-retry on 401.
  call: <T>(fn: (accessToken: string) => Promise<T>) => Promise<T>;
}

const OfficerContext = createContext<OfficerState | null>(null);

export function OfficerProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<OfficerSession | null>(null);
  const sessionRef = useRef<OfficerSession | null>(null);
  sessionRef.current = session;

  const value = useMemo<OfficerState>(
    () => ({
      session,
      login: async (email, password, totpCode) => {
        const pair = await api.login({ email, password, ...(totpCode ? { totpCode } : {}) });
        setSession({
          accessToken: pair.accessToken,
          refreshToken: pair.refreshToken,
          role: pair.role,
          displayName: pair.displayName,
        });
      },
      logout: () => setSession(null),
      call: async (fn) => {
        const current = sessionRef.current;
        if (!current) throw new ApiError(401, 'UNAUTHORIZED', 'No session');
        try {
          return await fn(current.accessToken);
        } catch (e) {
          if (!(e instanceof ApiError) || e.status !== 401) throw e;
          try {
            const pair = await api.refresh(current.refreshToken);
            const next: OfficerSession = {
              accessToken: pair.accessToken,
              refreshToken: pair.refreshToken,
              role: pair.role,
              displayName: pair.displayName,
            };
            setSession(next);
            sessionRef.current = next;
            return await fn(next.accessToken);
          } catch {
            setSession(null);
            throw e;
          }
        }
      },
    }),
    [session],
  );

  return <OfficerContext.Provider value={value}>{children}</OfficerContext.Provider>;
}

export function useOfficer(): OfficerState {
  const ctx = useContext(OfficerContext);
  if (!ctx) throw new Error('useOfficer must be used inside OfficerProvider');
  return ctx;
}
