// Officer session (memory only — tokens never touch localStorage) with
// refresh-and-retry on 401, mirroring the mobile client.
import { useSyncExternalStore } from 'react';
import type { Role, TokenPair } from '@childshield/shared';
import { api, ApiError } from './api';

export interface Session {
  accessToken: string;
  refreshToken: string;
  role: Role;
  displayName: string;
}

let session: Session | null = null;
const listeners = new Set<() => void>();

function set(next: Session | null) {
  session = next;
  listeners.forEach((l) => l());
}

function fromPair(pair: TokenPair): Session {
  return {
    accessToken: pair.accessToken,
    refreshToken: pair.refreshToken,
    role: pair.role,
    displayName: pair.displayName,
  };
}

export const sessionStore = {
  get: () => session,
  subscribe: (l: () => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  login: async (email: string, password: string, totpCode?: string) => {
    set(fromPair(await api.login({ email, password, ...(totpCode ? { totpCode } : {}) })));
  },
  logout: () => set(null),
  /// Authenticated call with one refresh-and-retry on 401.
  call: async <T>(fn: (token: string) => Promise<T>): Promise<T> => {
    const current = session;
    if (!current) throw new ApiError(401, 'UNAUTHORIZED', 'No session');
    try {
      return await fn(current.accessToken);
    } catch (e) {
      if (!(e instanceof ApiError) || e.status !== 401) throw e;
      try {
        const next = fromPair(await api.refresh(current.refreshToken));
        set(next);
        return await fn(next.accessToken);
      } catch {
        set(null);
        throw e;
      }
    }
  },
};

export function useSession(): Session | null {
  return useSyncExternalStore(sessionStore.subscribe, sessionStore.get);
}
