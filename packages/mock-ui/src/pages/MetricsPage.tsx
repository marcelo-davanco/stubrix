import { useState, useEffect, useCallback } from 'react';
import { BarChart2, RefreshCw } from 'lucide-react';
import { mockApi } from '../lib/mock-api.js';
import type { MetricsSummary } from '../lib/mock-api.js';
import { InlineAlert } from '../components/InlineAlert.js';

type MetricsPageProps = {
  t?: (key: string) => string;
};

const TAB_LABELS: Record<string, [string, string]> = {
  summary: ['metrics.summary', 'Summary'],
  health: ['metrics.health', 'Health'],
  prometheus: ['metrics.prometheus', 'Prometheus'],
};

export function MetricsPage({ t }: MetricsPageProps) {
  const T = useCallback((key: string, fallback: string) => (t ? t(key) : fallback), [t]);
  const [summary, setSummary] = useState<MetricsSummary | null>(null);
  const [health, setHealth] = useState<unknown>(null);
  const [prometheus, setPrometheus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'summary' | 'health' | 'prometheus'>('summary');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, h] = await Promise.all([mockApi.metrics.summary(), mockApi.metrics.health()]);
      setSummary(s);
      setHealth(h);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function loadPrometheus() {
    try {
      setPrometheus(await mockApi.metrics.prometheus());
    } catch (e) {
      setError((e as Error).message);
    }
  }

  useEffect(() => {
    if (tab === 'prometheus' && !prometheus) void loadPrometheus();
  }, [tab, prometheus]);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart2 size={22} className="text-orange-400" /> {T('metrics.title', 'Metrics')}
            </h1>
            <p className="text-text-secondary text-sm">{T('metrics.subtitle', 'Prometheus counters, histograms and service health')}</p>
          </div>
        </div>
        <button onClick={load} className="p-2 rounded-md text-text-secondary hover:text-text-primary hover:bg-white/5" title={T('metrics.refresh', 'Refresh')}>
          <RefreshCw size={15} />
        </button>
      </div>

      {error && <InlineAlert message={error} onRetry={load} retryLabel={T('common.retry', 'Retry')} />}

      <div className="flex gap-1 mb-6 bg-white/5 rounded-lg p-1 w-fit">
        {(['summary', 'health', 'prometheus'] as const).map((tabKey) => (
          <button key={tabKey} onClick={() => setTab(tabKey)}
            className={['px-4 py-1.5 rounded-md text-sm capitalize transition-colors',
              tab === tabKey ? 'bg-orange-400/20 text-orange-400' : 'text-text-secondary hover:text-text-primary'].join(' ')}>
            {(() => { const [k, fb] = TAB_LABELS[tabKey] ?? [tabKey, tabKey]; return T(k, fb); })()}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center text-text-secondary py-12">{T('metrics.loading', 'Loading…')}</div>
      ) : tab === 'summary' && summary ? (
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-medium text-text-secondary mb-3 uppercase tracking-wide">{T('metrics.counters', 'Counters')}</h3>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(summary.counters).map(([k, v]) => (
                <div key={k} className="bg-white/5 border border-white/10 rounded-lg p-4 flex items-center justify-between">
                  <span className="text-sm font-mono text-text-secondary truncate">{k}</span>
                  <span className="text-lg font-bold text-orange-400 shrink-0 ml-2">{v}</span>
                </div>
              ))}
            </div>
          </div>
          {Object.keys(summary.histograms).length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-text-secondary mb-3 uppercase tracking-wide">{T('metrics.histograms', 'Histograms')}</h3>
              <pre className="bg-white/5 border border-white/10 rounded-lg p-4 text-xs text-text-secondary overflow-auto max-h-64">
                {JSON.stringify(summary.histograms, null, 2)}
              </pre>
            </div>
          )}
        </div>
      ) : tab === 'health' ? (
        <pre className="bg-white/5 border border-white/10 rounded-lg p-4 text-xs text-text-secondary overflow-auto max-h-96">
          {JSON.stringify(health, null, 2)}
        </pre>
      ) : tab === 'prometheus' ? (
        prometheus ? (
          <pre className="bg-white/5 border border-white/10 rounded-lg p-4 text-xs text-green-300 overflow-auto max-h-[600px] font-mono">
            {prometheus}
          </pre>
        ) : (
          <div className="text-center text-text-secondary py-12">{T('metrics.loadingPrometheus', 'Loading Prometheus text…')}</div>
        )
      ) : null}
    </div>
  );
}
