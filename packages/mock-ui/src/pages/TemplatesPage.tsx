import { useState, useEffect, useCallback } from 'react';
import { LayoutTemplate, Plus, Trash2, Play, ChevronDown, ChevronRight } from 'lucide-react';
import { mockApi } from '../lib/mock-api.js';
import type { MockTemplate, TemplateVariable } from '../lib/mock-api.js';
import { InlineAlert } from '../components/InlineAlert.js';
import { EmptyState } from '../components/EmptyState.js';

type TemplatesPageProps = {
  t?: (key: string) => string;
  onNavigateBack?: () => void;
};

function interpolate(s: string, vars: Record<string, string | number>): string {
  return s.replace(/\{\{(\w+)\}\}/g, (_, k) => String(vars[k] ?? ''));
}

export function TemplatesPage({ t, onNavigateBack }: TemplatesPageProps) {
  const T = (key: string, fallback: string) => (t ? t(key) : fallback);
  const Tvars = (key: string, fallback: string, vars: Record<string, string | number>) => interpolate(T(key, fallback), vars);
  const [templates, setTemplates] = useState<MockTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [applyVars, setApplyVars] = useState<Record<string, string>>({});
  const [applyingId, setApplyingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setTemplates(await mockApi.templates.list());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function toggleExpand(id: string, variables: TemplateVariable[]) {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    const defaults: Record<string, string> = {};
    variables.forEach((v) => { defaults[v.name] = v.default ?? ''; });
    setApplyVars(defaults);
  }

  async function applyTemplate(id: string) {
    setApplyingId(id);
    setError(null);
    try {
      const res = await mockApi.templates.apply(id, applyVars);
      setSuccess(Tvars('templates.appliedSuccess', `Applied — ${res.applied} mock file(s) generated`, { count: res.applied }));
      setExpandedId(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setApplyingId(null);
    }
  }

  async function remove(id: string, name: string) {
    if (!confirm(Tvars('templates.deleteConfirm', `Delete template "${name}"?`, { name }))) return;
    try {
      await mockApi.templates.delete(id);
      setSuccess(T('templates.deletedSuccess', 'Template deleted'));
      void load();
    } catch (e) {
      setError((e as Error).message);
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
              <LayoutTemplate size={22} className="text-primary" /> {T('templates.title', 'Templates')}
            </h1>
            <p className="text-text-secondary text-sm">{T('templates.subtitle', 'Reusable environment templates with parameterized mock sets')}</p>
          </div>
        </div>
      </div>

      {error && <InlineAlert message={error} onRetry={load} retryLabel={T('common.retry', 'Retry')} />}
      {success && (
        <div className="flex items-center gap-2 rounded-xl border border-green-500/20 bg-green-500/10 p-3 mb-4 text-sm text-green-300">
          {success}
          <button onClick={() => setSuccess(null)} className="ml-auto text-green-400 hover:text-green-300">✕</button>
        </div>
      )}

      {loading ? (
        <div className="text-center text-text-secondary py-12">{T('templates.loading', 'Loading…')}</div>
      ) : templates.length === 0 ? (
        <EmptyState message={T('templates.empty', 'No templates found. Built-in templates will appear here automatically.')} />
      ) : (
        <div className="space-y-3">
          {templates.map((tmpl) => (
            <div key={tmpl.id} className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
              <div
                className="p-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-white/5"
                onClick={() => toggleExpand(tmpl.id, tmpl.variables)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {expandedId === tmpl.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{tmpl.name}</span>
                      {tmpl.builtIn && (
                        <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">{T('templates.builtIn', 'built-in')}</span>
                      )}
                    </div>
                    {tmpl.description && <p className="text-text-secondary text-sm truncate">{tmpl.description}</p>}
                    <p className="text-xs text-text-secondary mt-0.5">{tmpl.mocks.length} {T('templates.mocksCount', 'mock(s)')} · {tmpl.variables.length} {T('templates.variablesCount', 'variable(s)')}</p>
                  </div>
                </div>
                {!tmpl.builtIn && (
                  <button
                    onClick={(e) => { e.stopPropagation(); void remove(tmpl.id, tmpl.name); }}
                    className="p-1.5 rounded-md text-red-400 hover:bg-red-400/10 shrink-0"
                    title={T('templates.deleteTemplate', 'Delete template')}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>

              {expandedId === tmpl.id && (
                <div className="border-t border-white/10 p-4">
                  {tmpl.variables.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium mb-2 flex items-center gap-1.5">
                        <Plus size={13} /> {T('templates.variables', 'Variables')}
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        {tmpl.variables.map((v) => (
                          <div key={v.name}>
                            <label className="text-xs text-text-secondary mb-0.5 block">
                              {v.name}{v.description && ` — ${v.description}`}
                            </label>
                            <input
                              value={applyVars[v.name] ?? ''}
                              onChange={(e) => setApplyVars({ ...applyVars, [v.name]: e.target.value })}
                              placeholder={v.default ?? v.name}
                              className="w-full bg-white/5 border border-white/10 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-primary"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mb-4">
                    <h4 className="text-sm font-medium mb-2">{T('templates.mockFiles', 'Mock Files')}</h4>
                    <div className="space-y-1">
                      {tmpl.mocks.map((m, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-text-secondary">
                          <span className="font-mono bg-white/5 px-1.5 py-0.5 rounded">{m.filename}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => void applyTemplate(tmpl.id)}
                    disabled={applyingId === tmpl.id}
                    className="flex items-center gap-1.5 text-sm bg-primary/20 text-primary hover:bg-primary/30 disabled:opacity-50 px-4 py-2 rounded-md"
                  >
                    <Play size={13} /> {applyingId === tmpl.id ? T('templates.applying', 'Applying…') : T('templates.applyTemplate', 'Apply Template')}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
