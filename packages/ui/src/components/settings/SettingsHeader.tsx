import { useState, useRef, useEffect } from 'react';
import {
  Archive,
  Download,
  Upload,
  Settings,
  ChevronDown,
  Languages,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation, type Locale } from '../../lib/i18n';
import { cn } from '../../lib/utils';

const localeOptions: { value: Locale; label: string }[] = [
  { value: 'pt', label: 'Português' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
];

interface SettingsHeaderProps {
  onExport: () => void;
  onImport: () => void;
}

export function SettingsHeader({ onExport, onImport }: SettingsHeaderProps) {
  const navigate = useNavigate();
  const { t, locale, setLocale } = useTranslation();
  const [localeOpen, setLocaleOpen] = useState(false);
  const localeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (localeRef.current && !localeRef.current.contains(e.target as Node))
        setLocaleOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentLocale = localeOptions.find((o) => o.value === locale);

  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div className="flex items-center gap-3">
        <Settings size={22} className="text-primary flex-shrink-0" />
        <div>
          <h1 className="text-xl font-bold">{t('settings.title')}</h1>
          <p className="text-sm text-text-secondary">
            {t('settings.subtitle')}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="relative" ref={localeRef}>
          <button
            type="button"
            onClick={() => setLocaleOpen((v) => !v)}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border transition-colors',
              localeOpen
                ? 'border-primary bg-primary/10'
                : 'border-white/10 hover:bg-white/8',
            )}
          >
            <Languages size={14} />
            <span className="min-w-[4.5rem] text-left">
              {currentLocale?.label}
            </span>
            <ChevronDown
              size={12}
              className={cn('text-text-secondary', localeOpen && 'rotate-180')}
            />
          </button>
          {localeOpen && (
            <ul className="absolute right-0 top-full z-50 mt-1 min-w-[10rem] rounded-lg border border-white/10 bg-main-bg py-1 shadow-xl">
              {localeOptions.map((opt) => (
                <li key={opt.value}>
                  <button
                    type="button"
                    onClick={() => {
                      setLocale(opt.value);
                      setLocaleOpen(false);
                    }}
                    className={cn(
                      'w-full px-3 py-2 text-left text-sm hover:bg-white/8',
                      opt.value === locale
                        ? 'bg-primary/20 text-primary'
                        : 'text-text-primary',
                    )}
                  >
                    {opt.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button
          type="button"
          onClick={() => navigate('/settings/backups')}
          className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border border-white/10 hover:bg-white/8 transition-colors"
        >
          <Archive size={14} />
          {t('settings.backups')}
        </button>
        <button
          type="button"
          onClick={onExport}
          className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border border-white/10 hover:bg-white/8 transition-colors"
        >
          <Download size={14} />
          {t('settings.export')}
        </button>
        <button
          type="button"
          onClick={onImport}
          className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border border-white/10 hover:bg-white/8 transition-colors"
        >
          <Upload size={14} />
          {t('settings.import')}
        </button>
      </div>
    </div>
  );
}
