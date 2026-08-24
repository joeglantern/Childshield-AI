// App-wide settings: theme mode, locale, notification preference.
// SAFEGUARDING: saved on-device only (AsyncStorage), never on a server —
// "Mipangilio huhifadhiwa kwenye simu yako tu, si kwenye seva."
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { locales, type Locale, type Strings } from '../i18n';
import { darkColors, lightColors, type ThemeColors } from '../theme/tokens';

export type ThemeMode = 'light' | 'dark' | 'auto';

interface AppState {
  themeMode: ThemeMode;
  setThemeMode: (m: ThemeMode) => void;
  isDark: boolean;
  colors: ThemeColors;
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: Strings;
  notifsEnabled: boolean;
  setNotifsEnabled: (v: boolean) => void;
  appLockEnabled: boolean;
  setAppLockEnabled: (v: boolean) => void;
}

const AppContext = createContext<AppState | null>(null);

const STORAGE_KEY = 'childshield.settings.v1';

interface Persisted {
  themeMode?: ThemeMode;
  locale?: Locale;
  notifsEnabled?: boolean;
  appLockEnabled?: boolean;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('auto');
  const [locale, setLocaleState] = useState<Locale>('sw');
  const [notifsEnabled, setNotifsEnabledState] = useState(true);
  const [appLockEnabled, setAppLockEnabledState] = useState(false);

  useEffect(() => {
    void AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (!raw) return;
      try {
        const saved = JSON.parse(raw) as Persisted;
        if (saved.themeMode) setThemeModeState(saved.themeMode);
        if (saved.locale) setLocaleState(saved.locale);
        if (typeof saved.notifsEnabled === 'boolean') setNotifsEnabledState(saved.notifsEnabled);
        if (typeof saved.appLockEnabled === 'boolean') setAppLockEnabledState(saved.appLockEnabled);
      } catch {
        // corrupted settings are simply reset
      }
    });
  }, []);

  const persist = (patch: Persisted) => {
    void AsyncStorage.mergeItem(STORAGE_KEY, JSON.stringify(patch)).catch(() =>
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(patch)),
    );
  };

  const value = useMemo<AppState>(() => {
    const isDark = themeMode === 'dark' || (themeMode === 'auto' && system === 'dark');
    return {
      themeMode,
      setThemeMode: (m) => {
        setThemeModeState(m);
        persist({ themeMode: m });
      },
      isDark,
      colors: isDark ? darkColors : lightColors,
      locale,
      setLocale: (l) => {
        setLocaleState(l);
        persist({ locale: l });
      },
      t: locales[locale],
      notifsEnabled,
      setNotifsEnabled: (v) => {
        setNotifsEnabledState(v);
        persist({ notifsEnabled: v });
      },
      appLockEnabled,
      setAppLockEnabled: (v) => {
        setAppLockEnabledState(v);
        persist({ appLockEnabled: v });
      },
    };
  }, [themeMode, locale, notifsEnabled, appLockEnabled, system]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
