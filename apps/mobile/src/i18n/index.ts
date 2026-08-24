import { sw, type Strings } from './sw';
import { en } from './en';
import { sheng } from './sheng';

export type Locale = 'sw' | 'en' | 'sheng';

export const locales: Record<Locale, Strings> = { sw, en, sheng };

export const localeLabels: Record<Locale, string> = {
  sw: 'Kiswahili',
  en: 'English',
  sheng: 'Sheng',
};

/// Consent versions map 1:1 to locales (seeded in packages/db).
export const consentVersionFor: Record<Locale, string> = {
  sw: 'v1-sw',
  en: 'v1-en',
  sheng: 'v1-sw',
};

export type { Strings };
