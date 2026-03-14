import { useState, useEffect, useCallback } from 'react';
import { Gauge, Plus, Download, BarChart2 } from 'lucide-react';
import { mockApi } from '../lib/mock-api.js';
import type { PerformanceScript, PerformanceBaseline } from '../lib/mock-api.js';
import { InlineAlert } from '../components/InlineAlert.js';
import { EmptyState } from '../components/EmptyState.js';

type PerformancePageProps = {
  t?: (key: string) => string;
  onNavigateBack?: () => void;
};

export function PerformancePage({ t, onNavigateBack }: PerformancePageProps) {
  const T = (key: string, fallback: string) => (t ? t(key) : fallback);
  const [scripts, setScripts] = useState<PerformanceScript[]>([]);
  const [baselines, setBaselines] = useState<PerformanceBaseline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [tab, setTab] = useState<'scripts' | 'baselines'>('scripts');
  const [showScriptForm, setShowScriptForm] = useState(false);
  const [scriptForm, setScriptForm] = useState({ name: '', description: '', script: '' });
  const [saving, setSaving] = useState(false);
  const [compareResult, setCompareResult] = useState<unknown>(null);
  const [comparingId, setComparingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, b] = await Promise.all([mockApi.performance.listScripts(), mockApi.performance.listBaselines()]);
      setScripts(s);
      setBaselines(b);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function createScript() {
    if (!scriptForm.name || !scriptForm.script) return;
    setSaving(true);
    try {
      await mockApi.performance.createScript({ name: scriptForm.name, description: scriptForm.description, script: scriptForm.script });
      setSuccess(T('performance.scriptCreated', 'Script created'));
      setShowScriptForm(false);
      setScriptForm({ name: '', description: '', script: '' });
      void load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function compare(id: string) {
    const baseline = baselines.find((b) => b.id === id);
    if (!baseline) return;
    setComparingId(id);
    try {
      const result = await mockApi.performance.compareBaseline(id, baseline.metrics);
      setCompareResult(result);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setComparingId(null);
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {onNavigateBack && (
            <button onClick={onNavigateBack} className="text-text-secondary hover:text-text-primary text-sm">{T('common.back', '← Back')}</button>
          )}
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Gauge size={22} className="text-pink-400" /> {T('performance.title', 'Performance')}
            </h1>
            <p className="text-text-secondary text-sm">{T('performance.subtitle', 'k6 load test scripts and performance baselines')}</p>
          </div>
        </div>
        {tab === 'scripts' && (
          <button onClick={() => setShowScriptForm(true)}
            className="flex items-center gap-1.5 text-sm bg-pink-400/10 text-pink-400 hover:bg-pink-400/20 px-3 py-1.5 rounded-md">
            <Plus size={14} /> {T('performance.newScript', 'New Script')}
          </button>
        )}
      </div>

      {error && <InlineAlert message={error} onRetry={load} retryLabel={T('common.retry', 'Retry')} />}
      {success && (
        <div className="flex items-center gap-2 rounded-xl border border-green-500/20 bg-green-500/10 p-3 mb-4 text-sm text-green-300">
          {success}<button onClick={() => setSuccess(null)} className="ml-auto text-green-400 hover:text-green-300">✕</button>
        </div>
      )}

      <div className="flex gap-1 mb-6 bg-white/5 rounded-lg p-1 w-fit">
        {(['scripts', 'baselines'] as const).map((tabKey) => (
          <button key={tabKey} onClick={() => setTab(tabKey)}
            className={['px-4 py-1.5 rounded-md text-sm capitalize transition-colors',
              tab === tabKey ? 'bg-pink-400/20 text-pink-400' : 'text-text-secondary hover:text-text-primary'].join(' ')}>
            {tabKey === 'scripts' ? T('performance.scripts', 'Scripts') : T('performance.baselines', 'Baselines')}
          </button>
        ))}
      </div>

      {tab === 'scripts' && showScriptForm && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-6">
          <h3 className="font-medium mb-3">{T('performance.newK6Script', 'New k6 Script')}</h3>
          <div className="space-y-3">
            <input value={scriptForm.name} onChange={(e) => setScriptForm({ ...scriptForm, name: e.target.value })}
              placeholder={T('performance.scriptNamePlaceholder', 'Script name *')}
              className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-pink-400" />
            <input value={scriptForm.description} onChange={(e) => setScriptForm({ ...scriptForm, description: e.target.value })}
              placeholder={T('performance.descriptionPlaceholder', 'Description (optional)')}
              className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-pink-400" />
            <textarea value={scriptForm.script} onChange={(e) => setScriptForm({ ...scriptForm, script: e.target.value })}
              rows={8} placeholder={'import http from \'k6/http\';\nimport { sleep } from \'k6\';\n\nexport default function() {\n  http.get(\'http://localhost:8081/api/users\');\n  sleep(1);\n}'}
              className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-pink-400 resize-none" />
            <div className="flex gap-2">
              <button onClick={() => void createScript()} disabled={saving || !scriptForm.name || !scriptForm.script}
                className="text-sm bg-pink-400/10 text-pink-400 hover:bg-pink-400/20 disabled:opacity-50 px-3 py-1.5 rounded-md">
                {saving ? T('performance.creating', 'Creating…') : T('performance.createScript', 'Create Script')}
              </button>
              <button onClick={() => setShowScriptForm(false)} className="text-sm text-text-secondary hover:text-text-primary px-3 py-1.5">{T('common.cancel', 'Cancel')}</button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center text-text-secondary py-12">{T('performance.loading', 'Loading…')}</div>
      ) : tab === 'scripts' ? (
        scripts.length === 0 ? (
          <EmptyState message={T('performance.emptyScripts', 'No k6 scripts found. Create a custom script or check built-in scripts.')} />
        ) : (
          <div className="space-y-3">
            {scripts.map((s) => (
              <div key={s.id} className="bg-white/5 border border-white/10 rounded-lg p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{s.name}</span>
                    {s.builtIn && <span className="text-xs bg-pink-400/10 text-pink-400 px-1.5 py-0.5 rounded">{T('performance.builtIn', 'built-in')}</span>}
                  </div>
                  {s.description && <p className="text-text-secondary text-sm truncate">{s.description}</p>}
                  {s.options && (
                    <p className="text-xs text-text-secondary mt-0.5">
                      {s.options.vus && `${s.options.vus} VUs`} {s.options.duration && `· ${s.options.duration}`}
                    </p>
                  )}
                </div>
                <a href={mockApi.performance.exportScriptUrl(s.id)} download={`${s.id}.js`}
                  className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-pink-400 hover:bg-pink-400/10 px-2.5 py-1.5 rounded-md">
                  <Download size={12} /> {T('performance.export', 'Export')}
                </a>
              </div>
            ))}
          </div>
        )
      ) : (
        baselines.length === 0 ? (
          <EmptyState message={T('performance.emptyBaselines', 'No performance baselines saved yet.')} />
        ) : (
          <div className="space-y-3">
            {compareResult !== null && (
              <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-sm flex items-center gap-2"><BarChart2 size={14} /> {T('performance.comparisonResult', 'Comparison Result')}</h3>
                  <button onClick={() => setCompareResult(null)} className="text-text-secondary text-xs">✕</button>
                </div>
                <pre className="text-xs text-text-secondary overflow-auto">{JSON.stringify(compareResult as Record<string, unknown>, null, 2)}</pre>
              </div>
            )}
            {baselines.map((b) => (
              <div key={b.id} className="bg-white/5 border border-white/10 rounded-lg p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <span className="font-medium">{b.name}</span>
                  <div className="flex gap-4 mt-1 text-xs text-text-secondary">
                    <span>{T('performance.p95', 'p95:')} <strong className="text-pink-400">{b.metrics.p95}ms</strong></span>
                    <span>{T('performance.p99', 'p99:')} <strong className="text-pink-400">{b.metrics.p99}ms</strong></span>
                    <span>{T('performance.rps', 'RPS:')} <strong className="text-pink-400">{b.metrics.rps}</strong></span>
                    <span>{T('performance.errors', 'Errors:')} <strong className={b.metrics.errorRate > 0.01 ? 'text-red-400' : 'text-green-400'}>{(b.metrics.errorRate * 100).toFixed(1)}%</strong></span>
                  </div>
                </div>
                <button onClick={() => void compare(b.id)} disabled={comparingId === b.id}
                  className="flex items-center gap-1.5 text-xs text-pink-400 bg-pink-400/10 hover:bg-pink-400/20 disabled:opacity-50 px-2.5 py-1.5 rounded-md">
                  <BarChart2 size={12} /> {comparingId === b.id ? T('performance.comparing', 'Comparing…') : T('performance.compare', 'Compare')}
                </button>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
