import { useState } from 'react';
import { X, Download } from 'lucide-react';
import { useSettings } from '../../hooks/useSettings';
import { useTranslation } from '../../lib/i18n';
import type { ServiceOption } from './ServiceSelector';
import { ServiceSelector } from './ServiceSelector';

interface ExportWizardProps {
  open: boolean;
  onClose: () => void;
}

type Step = 1 | 2;

export function ExportWizard({ open, onClose }: ExportWizardProps) {
  const { t } = useTranslation();
  const { services } = useSettings();
  const [step, setStep] = useState<Step>(1);
  const [allServices, setAllServices] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [format, setFormat] = useState<'json' | 'yaml'>('json');
  const [includeSensitive, setIncludeSensitive] = useState(false);
  const [encrypted, setEncrypted] = useState(false);
  const [masterPassword, setMasterPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const serviceOptions: ServiceOption[] = services.map((s) => ({
    serviceId: s.serviceId,
    name: s.name,
    category: s.category,
  }));

  const reset = () => {
    setStep(1);
    setAllServices(true);
    setSelectedIds([]);
    setFormat('json');
    setIncludeSensitive(false);
    setEncrypted(false);
    setMasterPassword('');
    setError('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleExport = async () => {
    setBusy(true);
    setError('');
    try {
      const body = {
        serviceIds: allServices ? undefined : selectedIds,
        format,
        includeSensitive,
        encrypted,
        masterPassword: encrypted ? masterPassword : undefined,
      };
      const res = await fetch('/api/settings/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = (await res.json()) as { message?: string };
        throw new Error(err.message ?? 'Export failed');
      }
      const contentDisposition = res.headers.get('Content-Disposition') ?? '';
      const filename =
        contentDisposition.match(/filename="([^"]+)"/)?.[1] ??
        `stubrix-config.${format}`;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      handleClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#1e1e2e] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div>
            <h2 className="text-sm font-semibold">
              {t('backups.exportTitle')}
            </h2>
            <p className="text-xs text-text-secondary mt-0.5">
              {t('backups.stepOf', { step })}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-text-secondary hover:text-text-primary transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4">
          {step === 1 && (
            <>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 rounded-lg border border-white/10 cursor-pointer hover:border-white/20 transition-colors">
                  <input
                    type="radio"
                    checked={allServices}
                    onChange={() => setAllServices(true)}
                    className="accent-primary"
                  />
                  <span className="text-sm">
                    All services ({services.length})
                  </span>
                </label>
                <label className="flex items-center gap-3 p-3 rounded-lg border border-white/10 cursor-pointer hover:border-white/20 transition-colors">
                  <input
                    type="radio"
                    checked={!allServices}
                    onChange={() => setAllServices(false)}
                    className="accent-primary"
                  />
                  <span className="text-sm">Select services</span>
                </label>
              </div>
              {!allServices && (
                <ServiceSelector
                  services={serviceOptions}
                  selected={selectedIds}
                  onChange={setSelectedIds}
                />
              )}
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-2">
                  Format
                </p>
                <div className="flex gap-2">
                  {(['json', 'yaml'] as const).map((f) => (
                    <label
                      key={f}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors ${format === f ? 'border-primary/50 bg-primary/10' : 'border-white/10 hover:border-white/20'}`}
                    >
                      <input
                        type="radio"
                        checked={format === f}
                        onChange={() => setFormat(f)}
                        className="accent-primary"
                      />
                      <span className="text-sm font-mono uppercase">{f}</span>
                    </label>
                  ))}
                </div>
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeSensitive}
                  onChange={(e) => setIncludeSensitive(e.target.checked)}
                  className="accent-primary mt-0.5"
                />
                <div>
                  <p className="text-sm">{t('backups.includeSensitive')}</p>
                  <p className="text-xs text-yellow-400/80 mt-0.5">
                    {t('backups.includeSensitiveWarning')}
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={encrypted}
                  onChange={(e) => setEncrypted(e.target.checked)}
                  className="accent-primary mt-0.5"
                />
                <div className="flex-1">
                  <p className="text-sm">{t('backups.encryptExport')}</p>
                  {encrypted && (
                    <input
                      type="password"
                      placeholder={t('backups.masterPassword')}
                      value={masterPassword}
                      onChange={(e) => setMasterPassword(e.target.value)}
                      className="mt-2 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
                    />
                  )}
                </div>
              </label>

              {error && <p className="text-red-400 text-xs">{error}</p>}
            </>
          )}
        </div>

        <div className="flex justify-between items-center px-5 py-4 border-t border-white/10">
          <button
            type="button"
            onClick={() => (step === 1 ? handleClose() : setStep(1))}
            className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            {step === 1 ? t('common.cancel') : t('common.back')}
          </button>
          {step === 1 ? (
            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={!allServices && selectedIds.length === 0}
              className="px-4 py-2 text-sm bg-primary/80 hover:bg-primary rounded-lg font-medium transition-colors disabled:opacity-40"
            >
              {t('backups.next')}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void handleExport()}
              disabled={busy || (encrypted && !masterPassword)}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-primary/80 hover:bg-primary rounded-lg font-medium transition-colors disabled:opacity-40"
            >
              <Download size={14} />
              {busy ? t('backups.exporting') : t('backups.exportDownload')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
