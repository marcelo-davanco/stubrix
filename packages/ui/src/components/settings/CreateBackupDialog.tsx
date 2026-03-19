import { useState } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from '../../lib/i18n';
import { ServiceSelector } from './ServiceSelector';
import type { ServiceOption } from './ServiceSelector';

interface CreateBackupDialogProps {
  open: boolean;
  services: ServiceOption[];
  onClose: () => void;
  onComplete: () => void;
}

type Step = 1 | 2;

export function CreateBackupDialog({
  open,
  services,
  onClose,
  onComplete,
}: CreateBackupDialogProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>(1);
  const [fullScope, setFullScope] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [encrypted, setEncrypted] = useState(false);
  const [masterPassword, setMasterPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setStep(1);
    setFullScope(true);
    setSelectedIds([]);
    setName('');
    setDescription('');
    setEncrypted(false);
    setMasterPassword('');
    setError('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleCreate = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/settings/backups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name || undefined,
          description: description || undefined,
          serviceIds: fullScope ? undefined : selectedIds,
          encrypted,
          masterPassword: encrypted ? masterPassword : undefined,
        }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { message?: string };
        throw new Error(err.message ?? 'Backup failed');
      }
      reset();
      onComplete();
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
              {t('backups.createBackup')}
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
                    checked={fullScope}
                    onChange={() => setFullScope(true)}
                    className="accent-primary"
                  />
                  <span className="text-sm">
                    {t('backups.fullBackup', { count: services.length })}
                  </span>
                </label>
                <label className="flex items-center gap-3 p-3 rounded-lg border border-white/10 cursor-pointer hover:border-white/20 transition-colors">
                  <input
                    type="radio"
                    checked={!fullScope}
                    onChange={() => setFullScope(false)}
                    className="accent-primary"
                  />
                  <span className="text-sm">{t('backups.partialBackup')}</span>
                </label>
              </div>

              {!fullScope && (
                <ServiceSelector
                  services={services}
                  selected={selectedIds}
                  onChange={setSelectedIds}
                />
              )}

              <input
                type="text"
                placeholder={t('backups.nameOptional')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
              />
              <input
                type="text"
                placeholder={t('backups.descriptionOptional')}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
              />
            </>
          )}

          {step === 2 && (
            <>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={encrypted}
                  onChange={(e) => setEncrypted(e.target.checked)}
                  className="accent-primary mt-0.5"
                />
                <div className="flex-1">
                  <p className="text-sm">{t('backups.encryptBackup')}</p>
                  <p className="text-xs text-text-secondary mt-0.5">
                    {t('backups.masterPasswordRequired')}
                  </p>
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
              disabled={!fullScope && selectedIds.length === 0}
              className="px-4 py-2 text-sm bg-primary/80 hover:bg-primary rounded-lg font-medium transition-colors disabled:opacity-40"
            >
              {t('backups.next')}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void handleCreate()}
              disabled={busy || (encrypted && !masterPassword)}
              className="px-4 py-2 text-sm bg-primary/80 hover:bg-primary rounded-lg font-medium transition-colors disabled:opacity-40"
            >
              {busy ? t('backups.creating') : t('backups.createBackup')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
