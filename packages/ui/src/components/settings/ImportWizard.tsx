import { useState, useRef } from 'react';
import { X, Upload, CheckCircle, AlertTriangle } from 'lucide-react';
import { useTranslation } from '../../lib/i18n';
import { ConflictStrategySelector } from './ConflictStrategySelector';

interface ImportWizardProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

type Step = 1 | 2 | 3;

interface PreviewService {
  serviceId: string;
  serviceName: string;
  status: string;
  changes: {
    key: string;
    action: string;
    currentValue?: string;
    importedValue: string;
    reason?: string;
  }[];
}

interface PreviewResult {
  services: PreviewService[];
  totalChanges: number;
  totalSkipped: number;
  warnings: string[];
  errors: string[];
}

interface ImportResult {
  autoBackupId?: string;
  servicesImported: number;
  configsCreated: number;
  configsUpdated: number;
  configsSkipped: number;
  errors: { serviceId: string; key: string; error: string }[];
}

export function ImportWizard({ open, onClose, onComplete }: ImportWizardProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>(1);
  const [file, setFile] = useState<File | null>(null);
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [masterPassword, setMasterPassword] = useState('');
  const [conflictStrategy, setConflictStrategy] = useState<
    'skip' | 'overwrite' | 'merge'
  >('skip');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep(1);
    setFile(null);
    setIsEncrypted(false);
    setMasterPassword('');
    setConflictStrategy('skip');
    setSelectedServices([]);
    setPreview(null);
    setResult(null);
    setError('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFile = (f: File) => {
    const ext = f.name.split('.').pop()?.toLowerCase();
    if (!['json', 'yaml', 'yml'].includes(ext ?? '')) {
      setError('Accepts: .json, .yaml, .yml');
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError('File too large (max 10 MB)');
      return;
    }
    setFile(f);
    setError('');
  };

  const handlePreview = async () => {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('conflictStrategy', conflictStrategy);
      if (isEncrypted && masterPassword)
        fd.append('masterPassword', masterPassword);

      const res = await fetch('/api/settings/import/preview', {
        method: 'POST',
        body: fd,
      });
      if (!res.ok) {
        const err = (await res.json()) as { message?: string };
        throw new Error(err.message ?? 'Preview failed');
      }
      const data = (await res.json()) as PreviewResult;
      setPreview(data);
      setSelectedServices(
        data.services
          .filter(
            (s) => s.status !== 'unchanged' && s.status !== 'unknown-service',
          )
          .map((s) => s.serviceId),
      );
      setStep(2);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const handleApply = async () => {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('conflictStrategy', conflictStrategy);
      fd.append('createAutoBackup', 'true');
      selectedServices.forEach((id) => fd.append('serviceIds', id));
      if (isEncrypted && masterPassword)
        fd.append('masterPassword', masterPassword);

      const res = await fetch('/api/settings/import', {
        method: 'POST',
        body: fd,
      });
      if (!res.ok) {
        const err = (await res.json()) as { message?: string };
        throw new Error(err.message ?? 'Import failed');
      }
      const data = (await res.json()) as ImportResult;
      setResult(data);
      setStep(3);
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
      <div className="bg-[#1e1e2e] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 flex-shrink-0">
          <div>
            <h2 className="text-sm font-semibold">
              {t('backups.importTitle')}
            </h2>
            <p className="text-xs text-text-secondary mt-0.5">
              {t('backups.stepOf3', { step })}
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

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          {/* ── Step 1: Upload ── */}
          {step === 1 && (
            <>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const f = e.dataTransfer.files[0];
                  if (f) handleFile(f);
                }}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                  dragOver
                    ? 'border-primary/60 bg-primary/5'
                    : 'border-white/20 hover:border-white/40'
                }`}
              >
                <Upload
                  size={28}
                  className="mx-auto mb-3 text-text-secondary"
                />
                {file ? (
                  <p className="text-sm font-medium text-text-primary">
                    {file.name}
                  </p>
                ) : (
                  <>
                    <p className="text-sm text-text-secondary">
                      Drop file here or click to browse
                    </p>
                    <p className="text-xs text-text-secondary/60 mt-1">
                      Accepts: .json, .yaml, .yml
                    </p>
                  </>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".json,.yaml,.yml"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isEncrypted}
                  onChange={(e) => setIsEncrypted(e.target.checked)}
                  className="accent-primary mt-0.5"
                />
                <div className="flex-1">
                  <p className="text-sm">{t('backups.fileEncrypted')}</p>
                  {isEncrypted && (
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

          {/* ── Step 2: Preview & Select ── */}
          {step === 2 && preview && (
            <>
              <div className="bg-white/5 rounded-xl p-3 text-sm space-y-1">
                <p>
                  <span className="text-text-secondary">File:</span>{' '}
                  <span className="font-mono text-xs">{file?.name}</span>
                </p>
                <p>
                  <span className="text-text-secondary">Services:</span>{' '}
                  {preview.services.length} |{' '}
                  <span className="text-text-secondary">Changes:</span>{' '}
                  {preview.totalChanges}
                </p>
              </div>

              {preview.warnings.length > 0 && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3">
                  <p className="text-xs font-semibold text-yellow-400 mb-1">
                    ⚠ {preview.warnings.length} warning
                    {preview.warnings.length > 1 ? 's' : ''}
                  </p>
                  {preview.warnings.map((w, i) => (
                    <p key={i} className="text-xs text-yellow-300/80">
                      • {w}
                    </p>
                  ))}
                </div>
              )}

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-2">
                  Select services to import
                </p>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {preview.services.map((svc) => {
                    const changeCount = svc.changes.filter(
                      (c) => c.action !== 'skip',
                    ).length;
                    const isDisabled =
                      svc.status === 'unchanged' ||
                      svc.status === 'unknown-service';
                    return (
                      <label
                        key={svc.serviceId}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${isDisabled ? 'opacity-40' : 'cursor-pointer hover:bg-white/5'}`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            disabled={isDisabled}
                            checked={selectedServices.includes(svc.serviceId)}
                            onChange={() => {
                              setSelectedServices((prev) =>
                                prev.includes(svc.serviceId)
                                  ? prev.filter((id) => id !== svc.serviceId)
                                  : [...prev, svc.serviceId],
                              );
                            }}
                            className="accent-primary"
                          />
                          <span className="text-sm">{svc.serviceName}</span>
                        </div>
                        <span className="text-xs text-text-secondary">
                          {svc.status === 'unchanged'
                            ? 'unchanged'
                            : `${changeCount} change${changeCount !== 1 ? 's' : ''}`}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-2">
                  Conflict Strategy
                </p>
                <ConflictStrategySelector
                  value={conflictStrategy}
                  onChange={setConflictStrategy}
                />
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-xs text-blue-300">
                ⚠ A safety backup will be created before import.
              </div>

              {error && <p className="text-red-400 text-xs">{error}</p>}
            </>
          )}

          {/* ── Step 3: Result ── */}
          {step === 3 && result && (
            <div className="text-center py-4 space-y-4">
              <CheckCircle size={40} className="mx-auto text-green-400" />
              <h3 className="font-semibold">Import Complete</h3>
              <div className="text-sm text-text-secondary space-y-1.5 text-left max-w-xs mx-auto">
                <p className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>{' '}
                  {result.servicesImported} services imported
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>{' '}
                  {result.configsUpdated} configs updated
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>{' '}
                  {result.configsCreated} configs created
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-text-secondary">⊘</span>{' '}
                  {result.configsSkipped} configs skipped
                </p>
                {result.errors.length > 0 && (
                  <p className="flex items-center gap-2 text-red-400">
                    <AlertTriangle size={14} /> {result.errors.length} error
                    {result.errors.length > 1 ? 's' : ''}
                  </p>
                )}
                {result.autoBackupId && (
                  <p className="text-xs text-text-secondary mt-2">
                    Safety backup:{' '}
                    <span className="font-mono">{result.autoBackupId}</span>
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center px-5 py-4 border-t border-white/10 flex-shrink-0">
          {step === 3 ? (
            <div />
          ) : (
            <button
              type="button"
              onClick={() => (step === 1 ? handleClose() : setStep(1))}
              className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              {step === 1 ? t('common.cancel') : t('common.back')}
            </button>
          )}

          {step === 1 && (
            <button
              type="button"
              onClick={() => void handlePreview()}
              disabled={!file || busy || (isEncrypted && !masterPassword)}
              className="px-4 py-2 text-sm bg-primary/80 hover:bg-primary rounded-lg font-medium transition-colors disabled:opacity-40"
            >
              {busy ? t('common.loading') : t('backups.previewNext')}
            </button>
          )}

          {step === 2 && (
            <button
              type="button"
              onClick={() => void handleApply()}
              disabled={busy || selectedServices.length === 0}
              className="px-4 py-2 text-sm bg-primary/80 hover:bg-primary rounded-lg font-medium transition-colors disabled:opacity-40"
            >
              {busy
                ? t('backups.importing')
                : t('backups.importWithChanges', {
                    count: preview?.totalChanges ?? 0,
                  })}
            </button>
          )}

          {step === 3 && (
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm bg-primary/80 hover:bg-primary rounded-lg font-medium transition-colors"
            >
              {t('common.done')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
