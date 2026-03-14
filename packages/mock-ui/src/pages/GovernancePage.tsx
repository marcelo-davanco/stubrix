import { useState, useEffect } from 'react';
import { ShieldCheck, Upload, AlertTriangle } from 'lucide-react';
import { mockApi } from '../lib/mock-api.js';
import type { LintResult, LintRule } from '../lib/mock-api.js';
import { InlineAlert } from '../components/InlineAlert.js';

type GovernancePageProps = {
  t?: (key: string) => string;
  onNavigateBack?: () => void;
};

function interpolate(s: string, vars: Record<string, string | number>): string {
  return s.replace(/\{\{(\w+)\}\}/g, (_, k) => String(vars[k] ?? ''));
}

export function GovernancePage({ t, onNavigateBack }: GovernancePageProps) {
  const T = (key: string, fallback: string) => (t ? t(key) : fallback);
  const Tvars = (key: string, fallback: string, vars: Record<string, string | number>) => interpolate(T(key, fallback), vars);
  const [specContent, setSpecContent] = useState('');
  const [result, setResult] = useState<LintResult | null>(null);
  const [rules, setRules] = useState<LintRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingRules, setLoadingRules] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'lint' | 'rules'>('lint');

  useEffect(() => {
    if (tab === 'rules' && rules.length === 0) {
      setLoadingRules(true);
      void mockApi.governance.rules()
        .then((res) => setRules(res.rules))
        .catch((e) => setError((e as Error).message))
        .finally(() => setLoadingRules(false));
    }
  }, [tab, rules.length]);

  async function lint() {
    if (!specContent.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      setResult(await mockApi.governance.lint(specContent));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setSpecContent(ev.target?.result as string);
    reader.readAsText(file);
  }

  const errors = result?.errors ?? [];
  const warnings = result?.warnings ?? [];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        {onNavigateBack && (
          <button onClick={onNavigateBack} className="text-text-secondary hover:text-text-primary text-sm">{T('common.back', '← Back')}</button>
        )}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck size={22} className="text-blue-400" /> {T('governance.title', 'Governance & Linting')}
          </h1>
          <p className="text-text-secondary text-sm">{T('governance.subtitle', 'Validate OpenAPI specs with Spectral rules')}</p>
        </div>
      </div>

      {error && <InlineAlert message={error} />}

      <div className="flex gap-1 mb-6 bg-white/5 rounded-lg p-1 w-fit">
        {(['lint', 'rules'] as const).map((tabKey) => (
          <button
            key={tabKey}
            onClick={() => setTab(tabKey)}
            className={[
              'px-4 py-1.5 rounded-md text-sm capitalize transition-colors',
              tab === tabKey ? 'bg-blue-400/20 text-blue-400' : 'text-text-secondary hover:text-text-primary',
            ].join(' ')}
          >
            {tabKey === 'lint' ? T('governance.lintSpec', 'Lint Spec') : T('governance.activeRules', 'Active Rules')}
          </button>
        ))}
      </div>

      {tab === 'lint' && (
        <>
          <div className="bg-white/5 border border-white/10 rounded-lg p-5 mb-6">
            <div className="flex items-center gap-3 mb-3">
              <label className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary cursor-pointer bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-md">
                <Upload size={13} /> {T('coverage.uploadFile', 'Upload file')}
                <input type="file" accept=".yaml,.yml,.json" onChange={onFileChange} className="hidden" />
              </label>
              {specContent && <span className="text-xs text-blue-400">{Tvars('governance.specLoaded', `Spec loaded (${specContent.length} chars)`, { count: specContent.length })}</span>}
            </div>
            <textarea
              value={specContent}
              onChange={(e) => setSpecContent(e.target.value)}
              rows={10}
              placeholder={T('governance.specPlaceholder', 'Paste your OpenAPI spec here (YAML or JSON)…')}
              className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-blue-400 resize-none"
            />
            <button
              onClick={() => void lint()}
              disabled={loading || !specContent.trim()}
              className="mt-3 flex items-center gap-1.5 text-sm bg-blue-400/10 text-blue-400 hover:bg-blue-400/20 disabled:opacity-50 px-4 py-2 rounded-md"
            >
              <ShieldCheck size={13} /> {loading ? T('governance.linting', 'Linting…') : T('governance.lintSpec', 'Lint Spec')}
            </button>
          </div>

          {result && (
            <div className="space-y-4">
              <div className={`flex items-center gap-3 p-4 rounded-lg border ${result.valid ? 'border-green-500/20 bg-green-500/10' : 'border-red-500/20 bg-red-500/10'}`}>
                <ShieldCheck size={18} className={result.valid ? 'text-green-400' : 'text-red-400'} />
                <span className={`font-medium ${result.valid ? 'text-green-300' : 'text-red-300'}`}>
                  {result.valid ? T('governance.validNoIssues', 'Spec is valid — no issues found') : Tvars('governance.errorsWarnings', `${errors.length} error(s), ${warnings.length} warning(s)`, { errors: errors.length, warnings: warnings.length })}
                </span>
              </div>

              {errors.length > 0 && (
                <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
                  <div className="px-4 py-2 border-b border-white/10 flex items-center gap-2 text-sm font-medium text-red-400">
                    <AlertTriangle size={14} /> {T('governance.errors', 'Errors')} ({errors.length})
                  </div>
                  {errors.map((e, i) => (
                    <div key={i} className="px-4 py-3 border-b border-white/5 last:border-0">
                      <div className="text-sm">{e.message}</div>
                      <div className="text-xs text-text-secondary mt-0.5 font-mono">{e.path}</div>
                    </div>
                  ))}
                </div>
              )}

              {warnings.length > 0 && (
                <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
                  <div className="px-4 py-2 border-b border-white/10 flex items-center gap-2 text-sm font-medium text-yellow-400">
                    <AlertTriangle size={14} /> {T('governance.warnings', 'Warnings')} ({warnings.length})
                  </div>
                  {warnings.map((w, i) => (
                    <div key={i} className="px-4 py-3 border-b border-white/5 last:border-0">
                      <div className="text-sm">{w.message}</div>
                      <div className="text-xs text-text-secondary mt-0.5 font-mono">{w.path}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {tab === 'rules' && (
        <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
          {loadingRules ? (
            <div className="text-center text-text-secondary py-12">{T('governance.loadingRules', 'Loading rules…')}</div>
          ) : rules.length === 0 ? (
            <div className="text-center text-text-secondary py-12">{T('governance.noRules', 'No rules found')}</div>
          ) : (
            rules.map((rule, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-white/5 last:border-0">
                <span className={[
                  'shrink-0 text-xs px-1.5 py-0.5 rounded font-mono uppercase',
                  rule.severity === 'error' ? 'bg-red-400/10 text-red-400' :
                    rule.severity === 'warn' ? 'bg-yellow-400/10 text-yellow-400' :
                      'bg-blue-400/10 text-blue-400',
                ].join(' ')}>{rule.severity}</span>
                <div className="min-w-0">
                  <span className="text-sm font-mono">{rule.code}</span>
                  {rule.description && (
                    <p className="text-xs text-text-secondary truncate">{rule.description}</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
