import { createContext, useContext, useCallback, useState } from 'react';
import en from '../locales/en.json';
import pt from '../locales/pt.json';
import es from '../locales/es.json';

export type Locale = 'pt' | 'en' | 'es';

const messages: Record<Locale, Record<string, string>> = { en, pt, es };

const STORAGE_KEY = 'stubrix-locale';

function getStoredLocale(): Locale {
  if (typeof window === 'undefined') return 'en';
  const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
  if (stored && (stored === 'pt' || stored === 'en' || stored === 'es')) return stored;
  const lang = navigator.language?.toLowerCase();
  if (lang?.startsWith('pt')) return 'pt';
  if (lang?.startsWith('es')) return 'es';
  return 'en';
}

export const I18nContext = createContext<{
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
} | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => getStoredLocale());

  const setLocale = useCallback((next: Locale) => {
    localStorage.setItem(STORAGE_KEY, next);
    setLocaleState(next);
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>): string => {
      let msg = messages[locale]?.[key] ?? messages.en?.[key] ?? key;
      if (vars) Object.entries(vars).forEach(([k, v]) => { msg = msg.replaceAll(`{{${k}}}`, String(v)); });
      return msg;
    },
    [locale],
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useTranslation must be used within I18nProvider');
  return ctx;
}
