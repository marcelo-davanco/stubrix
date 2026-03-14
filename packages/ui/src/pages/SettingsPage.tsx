import { useState, useRef, useEffect } from 'react';
import { useTranslation, type Locale } from '../lib/i18n';
import { Settings, ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';

const localeOptions: { value: Locale; label: string }[] = [
  { value: 'pt', label: 'Português (Brasil)' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
];

export function SettingsPage() {
  const { t, locale, setLocale } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const current = localeOptions.find((o) => o.value === locale);

  return (
    <div className="p-6 max-w-xl">
      <div className="flex items-center gap-3 mb-6">
        <Settings size={24} className="text-primary" />
        <div>
          <h1 className="text-2xl font-bold">{t('settings.title')}</h1>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-lg p-4">
        <label className="block text-sm font-medium mb-2">{t('settings.language')}</label>
        <div className="relative w-full max-w-xs" ref={ref}>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className={cn(
              'w-full flex items-center justify-between gap-2 bg-white/5 border rounded-md px-3 py-2 text-sm text-left transition-colors',
              open ? 'border-primary' : 'border-white/10 focus:border-primary focus:outline-none',
            )}
          >
            <span>{current?.label}</span>
            <ChevronDown size={16} className={cn('text-text-secondary', open && 'rotate-180')} />
          </button>
          {open && (
            <ul className="absolute z-10 mt-1 w-full rounded-md border border-white/10 bg-main-bg py-1 shadow-lg">
              {localeOptions.map((opt) => (
                <li key={opt.value}>
                  <button
                    type="button"
                    onClick={() => {
                      setLocale(opt.value);
                      setOpen(false);
                    }}
                    className={cn(
                      'w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-white/10',
                      opt.value === locale && 'bg-primary/20 text-primary',
                    )}
                  >
                    {opt.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
