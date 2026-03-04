import { useEffect, useRef, useState } from 'react';
import { Trash2, Pause, Play } from 'lucide-react';
import type { LogEntry } from '@stubrix/shared';
import { api } from '../lib/api';
import { connectLogs } from '../lib/ws';
import { Badge } from '../components/ui/Badge';
import { cn } from '../lib/utils';

const METHOD_COLORS: Record<string, string> = {
  GET: 'text-green-400',
  POST: 'text-blue-400',
  PUT: 'text-yellow-400',
  PATCH: 'text-orange-400',
  DELETE: 'text-red-400',
};

export function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [paused, setPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const pausedRef = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void api.logs.get(100).then((res) => {
      setLogs(res.requests);
      setLoading(false);
    });

    const disconnect = connectLogs((newEntries) => {
      if (!pausedRef.current) {
        setLogs((prev) => [...newEntries.reverse(), ...prev].slice(0, 500));
      }
    });

    return disconnect;
  }, []);

  const togglePause = () => {
    pausedRef.current = !pausedRef.current;
    setPaused(pausedRef.current);
  };

  const handleClear = async () => {
    await api.logs.clear();
    setLogs([]);
  };

  if (loading) return <div className="flex items-center justify-center h-full text-text-secondary">Loading...</div>;

  return (
    <div className="flex flex-col h-full p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Request Logs</h1>
          <p className="text-text-secondary text-sm">{logs.length} entries</p>
        </div>
        <div className="flex items-center gap-2">
          {!paused && <Badge variant="danger">🔴 Live</Badge>}
          {paused && <Badge variant="default">⏸ Paused</Badge>}
          <button
            onClick={togglePause}
            className="flex items-center gap-1.5 text-sm bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-md text-text-secondary"
          >
            {paused ? <Play size={14} /> : <Pause size={14} />}
            {paused ? 'Resume' : 'Pause'}
          </button>
          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 text-sm bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-md text-text-secondary"
          >
            <Trash2 size={14} /> Clear
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-white/5 border border-white/10 rounded-lg">
        {logs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-text-secondary">
            No requests yet. Make some requests to see them here.
          </div>
        ) : (
          <table className="w-full text-xs font-mono">
            <thead className="sticky top-0 bg-[#1a1a2e] border-b border-white/10">
              <tr className="text-left text-text-secondary">
                <th className="px-4 py-2">Timestamp</th>
                <th className="px-4 py-2 w-16">Method</th>
                <th className="px-4 py-2">URL</th>
                <th className="px-4 py-2 w-16">Status</th>
                <th className="px-4 py-2 w-16">ms</th>
                <th className="px-4 py-2 w-16">Matched</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => (
                <tr
                  key={i}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors"
                >
                  <td className="px-4 py-2 text-text-secondary">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </td>
                  <td className={cn('px-4 py-2 font-bold', METHOD_COLORS[log.method] ?? 'text-text-secondary')}>
                    {log.method}
                  </td>
                  <td className="px-4 py-2 text-text-primary truncate max-w-xs">{log.url}</td>
                  <td className="px-4 py-2">
                    <span className={cn(log.status < 400 ? 'text-green-400' : 'text-red-400')}>
                      {log.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-text-secondary">{log.responseTime}</td>
                  <td className="px-4 py-2">
                    {log.matched ? (
                      <span className="text-green-400">✓</span>
                    ) : (
                      <span className="text-red-400">✗</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
