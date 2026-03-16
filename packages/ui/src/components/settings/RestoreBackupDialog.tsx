import { useState, useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { ConflictStrategySelector } from './ConflictStrategySelector';

interface RestorePreviewChange {
  key: string;
  currentValue?: string;
  backupValue: string;
  action: 'CREATE' | 'UPDATE' | 'SKIP';
}

interface RestorePreviewService {
  serviceId: string;
  changes: RestorePreviewChange[];
}

interface RestorePreview {
  services: RestorePreviewService[];
  totalChanges: number;
}

interface RestoreBackupDialogProps {
  backupId: string;
  backupName: string;
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function RestoreBackupDialog({
  backupId,
  backupName,
  open,
  onClose,
  onComplete,
}: RestoreBackupDialogProps) {
  const [preview, setPreview] = useState<RestorePreview | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [strategy, setStrategy] = useState<'skip' | 'overwrite' | 'merge'>(
    'overwrite',
  );
  const [masterPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !backupId) return;
    setLoading(true);
    setError('');
    void fetch(
      `/api/settings/backups/${backupId}/preview${masterPassword ? `?masterPassword=${encodeURIComponent(masterPassword)}` : ''}`,
    )
      .then(async (res) => {
        if (!res.ok)
          throw new Error(
            ((await res.json()) as { message?: string }).message ??
              'Preview failed',
          );
        return res.json() as Promise<RestorePreview>;
      })
      .then((data) => {
        setPreview(data);
        setSelected(
          data.services
            .filter((s) => s.changes.length > 0)
            .map((s) => s.serviceId),
        );
      })
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : String(e)),
      )
      .finally(() => setLoading(false));
  }, [open, backupId, masterPassword]);

  const handleRestore = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/settings/backups/${backupId}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceIds: selected,
          conflictStrategy: strategy,
          createAutoBackup: true,
          masterPassword: masterPassword || undefined,
        }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { message?: string };
        throw new Error(err.message ?? 'Restore failed');
      }
      onComplete();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  const totalChanges =
    preview?.services
      .filter((s) => selected.includes(s.serviceId))
      .flatMap((s) => s.changes.filter((c) => c.action !== 'SKIP')).length ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#1e1e2e] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 flex-shrink-0">
          <h2 className="text-sm font-semibold truncate">
            Restore: {backupName}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary transition-colors flex-shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 text-xs text-yellow-300">
            <AlertTriangle size={14} className="flex-shrink-0" />A safety backup
            will be created before restoring.
          </div>

          {loading && (
            <p className="text-sm text-text-secondary animate-pulse">
              Loading preview…
            </p>
          )}

          {preview && !loading && (
            <>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-2">
                  Services to restore
                </p>
                <div className="space-y-1 max-h-36 overflow-y-auto">
                  {preview.services.map((svc) => {
                    const changes = svc.changes.filter(
                      (c) => c.action !== 'SKIP',
                    ).length;
                    return (
                      <label
                        key={svc.serviceId}
                        className="flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer hover:bg-white/5 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={selected.includes(svc.serviceId)}
                            onChange={() =>
                              setSelected((prev) =>
                                prev.includes(svc.serviceId)
                                  ? prev.filter((id) => id !== svc.serviceId)
                                  : [...prev, svc.serviceId],
                              )
                            }
                            className="accent-primary"
                          />
                          <span className="text-sm">{svc.serviceId}</span>
                        </div>
                        <span className="text-xs text-text-secondary">
                          {changes} change{changes !== 1 ? 's' : ''}
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
                  value={strategy}
                  onChange={setStrategy}
                />
              </div>

              {preview.services.some((s) => selected.includes(s.serviceId)) && (
                <div className="border border-white/10 rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-white/5 text-text-secondary">
                        <th className="px-3 py-2 text-left font-medium">Key</th>
                        <th className="px-3 py-2 text-left font-medium">
                          Current
                        </th>
                        <th className="px-3 py-2 text-left font-medium">
                          Backup
                        </th>
                        <th className="px-3 py-2 text-left font-medium">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.services
                        .filter((s) => selected.includes(s.serviceId))
                        .flatMap((s) => s.changes)
                        .slice(0, 10)
                        .map((c, i) => (
                          <tr key={i} className="border-t border-white/5">
                            <td className="px-3 py-2 font-mono">{c.key}</td>
                            <td className="px-3 py-2 text-text-secondary truncate max-w-20">
                              {c.currentValue ?? '—'}
                            </td>
                            <td className="px-3 py-2 text-text-secondary truncate max-w-20">
                              {c.backupValue}
                            </td>
                            <td
                              className={`px-3 py-2 font-medium ${c.action === 'CREATE' ? 'text-green-400' : c.action === 'UPDATE' ? 'text-blue-400' : 'text-text-secondary'}`}
                            >
                              {c.action}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}

              <p className="text-sm text-text-secondary">
                Total:{' '}
                <strong className="text-text-primary">
                  {totalChanges} changes
                </strong>
              </p>
            </>
          )}

          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>

        <div className="flex justify-between items-center px-5 py-4 border-t border-white/10 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleRestore()}
            disabled={
              busy || loading || selected.length === 0 || totalChanges === 0
            }
            className="px-4 py-2 text-sm bg-primary/80 hover:bg-primary rounded-lg font-medium transition-colors disabled:opacity-40"
          >
            {busy ? 'Restoring…' : `Restore (${totalChanges} changes)`}
          </button>
        </div>
      </div>
    </div>
  );
}
