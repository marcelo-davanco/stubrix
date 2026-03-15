import { useState, useEffect, useCallback } from 'react';
import { GitBranch, Search, ChevronDown, ChevronRight, RefreshCw } from 'lucide-react';
import { mockApi } from '../lib/mock-api.js';
import type { Trace } from '../lib/mock-api.js';
import { InlineAlert } from '../components/InlineAlert.js';
import { EmptyState } from '../components/EmptyState.js';

type TracingPageProps = {
  t?: (key: string) => string;
};

export function TracingPage({ t }: TracingPageProps) {
  const T = useCallback((key: string, fallback: string) => (t ? t(key) : fallback), [t]);
  const [traces, setTraces] = useState<Trace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [serviceFilter, setServiceFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [jaegerAvailable, setJaegerAvailable] = useState<boolean | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [tracesList, h] = await Promise.all([
        mockApi.tracing.list(serviceFilter || undefined, 50),
        mockApi.tracing.health(),
      ]);
      setTraces(tracesList);
      setJaegerAvailable((h as { available?: boolean })?.available ?? false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [serviceFilter]);

  useEffect(() => { void load(); }, [load]);

  const services = [...new Set(traces.flatMap((tr) => tr.services))];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <GitBranch size={22} className="text-cyan-400" /> {T('tracing.title', 'Distributed Tracing')}
            </h1>
            <p className="text-text-secondary text-sm">{T('tracing.subtitle', 'OpenTelemetry traces via Jaeger')}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {jaegerAvailable !== null && (
            <span className={`text-xs px-2 py-1 rounded-full ${jaegerAvailable ? 'bg-green-400/10 text-green-400' : 'bg-red-400/10 text-red-400'}`}>
              {jaegerAvailable ? T('tracing.jaegerConnected', '● Jaeger connected') : T('tracing.jaegerUnavailable', '● Jaeger unavailable')}
            </span>
          )}
          <button onClick={load} className="p-2 rounded-md text-text-secondary hover:text-text-primary hover:bg-white/5">
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {error && <InlineAlert message={error} onRetry={load} retryLabel={T('common.retry', 'Retry')} />}

      <div className="flex gap-2 mb-6">
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <select
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded pl-8 pr-3 py-2 text-sm focus:outline-none focus:border-cyan-400"
          >
            <option value="">{T('tracing.allServices', 'All services')}</option>
            {services.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-text-secondary py-12">{T('tracing.loading', 'Loading…')}</div>
      ) : traces.length === 0 ? (
        <EmptyState message={T('tracing.empty', 'No traces found. Make sure Jaeger is running and requests are being traced.')} />
      ) : (
        <div className="space-y-2">
          {traces.map((trace) => (
            <div key={trace.traceId} className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
              <div
                className="p-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-white/5"
                onClick={() => setExpandedId(expandedId === trace.traceId ? null : trace.traceId)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {expandedId === trace.traceId ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <span className="font-mono text-xs text-text-secondary shrink-0">{trace.traceId.slice(0, 16)}…</span>
                  <div className="flex gap-1 flex-wrap">
                    {trace.services.map((s) => (
                      <span key={s} className="text-xs bg-cyan-400/10 text-cyan-400 px-1.5 py-0.5 rounded">{s}</span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <span className="text-xs text-text-secondary">{trace.spans.length} {T('tracing.spans', 'spans')}</span>
                  <span className="text-xs text-text-secondary">{trace.duration}ms</span>
                  <span className="text-xs text-text-secondary">{new Date(trace.startTime).toLocaleTimeString()}</span>
                </div>
              </div>
              {expandedId === trace.traceId && (
                <div className="border-t border-white/10 p-4">
                  <div className="space-y-2">
                    {trace.spans.map((span, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm">
                        <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />
                        <span className="font-mono text-xs text-text-secondary w-24 shrink-0">{span.service}</span>
                        <span className="flex-1 truncate">{span.operationName}</span>
                        <span className="text-xs text-text-secondary shrink-0">{span.duration}ms</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
