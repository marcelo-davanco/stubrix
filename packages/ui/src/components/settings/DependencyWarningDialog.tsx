import { AlertTriangle, X } from 'lucide-react';

interface DependencyWarningDialogProps {
  open: boolean;
  serviceId: string;
  serviceName: string;
  dependents: string[];
  onCancel: () => void;
  onForceDisable: () => void;
}

export function DependencyWarningDialog({
  open,
  serviceName,
  dependents,
  onCancel,
  onForceDisable,
}: DependencyWarningDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#1e1e2e] border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-2 text-yellow-400">
            <AlertTriangle size={16} />
            <h2 className="text-sm font-semibold">
              Cannot Disable {serviceName}
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-text-secondary hover:text-text-primary transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <div className="px-5 py-4 text-sm text-text-secondary">
          <p className="mb-3">
            The following services depend on{' '}
            <strong className="text-text-primary">{serviceName}</strong> and are
            currently enabled:
          </p>
          <ul className="space-y-1 mb-4">
            {dependents.map((d) => (
              <li key={d} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                {d}
              </li>
            ))}
          </ul>
          <p>Disable these services first, or force disable all.</p>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-white/10">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onForceDisable}
            className="px-4 py-2 text-sm bg-red-600/80 hover:bg-red-600 rounded-lg font-medium transition-colors"
          >
            Disable All
          </button>
        </div>
      </div>
    </div>
  );
}
