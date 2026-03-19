import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface LogsModalProps {
  serviceId: string;
  serviceName: string;
  open: boolean;
  onClose: () => void;
  fetchLogs: (serviceId: string, tail: number) => Promise<string>;
}

export function LogsModal({
  serviceId,
  serviceName,
  open,
  onClose,
  fetchLogs,
}: LogsModalProps) {
  const [logs, setLogs] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async (tail: number) => {
    setLoading(true);
    try {
      const result = await fetchLogs(serviceId, tail);
      setLogs(result);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) void load(100);
  }, [open, serviceId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#1e1e2e] border border-white/10 rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h2 className="text-sm font-semibold">{serviceName} — Logs</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="text-text-secondary text-sm animate-pulse">
              Loading logs…
            </div>
          ) : (
            <pre className="bg-black/40 text-green-400 p-4 rounded-lg font-mono text-xs whitespace-pre-wrap break-all">
              {logs || 'No logs available.'}
            </pre>
          )}
        </div>
        <div className="flex items-center gap-2 px-5 py-3 border-t border-white/10">
          {([50, 100, 200] as const).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => void load(n)}
              className="px-3 py-1.5 text-xs rounded-lg border border-white/10 hover:bg-white/8 transition-colors"
            >
              Last {n}
            </button>
          ))}
          <button
            type="button"
            onClick={() => void load(100)}
            className="px-3 py-1.5 text-xs rounded-lg border border-white/10 hover:bg-white/8 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}
