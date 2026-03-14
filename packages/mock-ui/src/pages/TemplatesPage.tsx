import { useState, useEffect, useCallback } from 'react';
import { LayoutTemplate, Plus, Trash2, Play, ChevronDown, ChevronRight } from 'lucide-react';
import { mockApi } from '../lib/mock-api.js';
import type { MockTemplate, TemplateVariable } from '../lib/mock-api.js';
import { InlineAlert } from '../components/InlineAlert.js';
import { EmptyState } from '../components/EmptyState.js';

type TemplatesPageProps = {
  onNavigateBack?: () => void;
};

export function TemplatesPage({ onNavigateBack }: TemplatesPageProps) {
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
      setSuccess(`Applied — ${res.applied} mock file(s) generated`);
      setExpandedId(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setApplyingId(null);
    }
  }

  async function remove(id: string, name: string) {
    if (!confirm(`Delete template "${name}"?`)) return;
    try {
      await mockApi.templates.delete(id);
      setSuccess('Template deleted');
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
            <button onClick={onNavigateBack} className="text-text-secondary hover:text-text-primary text-sm">← Back</button>
          )}
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <LayoutTemplate size={22} className="text-primary" /> Templates
            </h1>
            <p className="text-text-secondary text-sm">Reusable environment templates with parameterized mock sets</p>
          </div>
        </div>
      </div>

      {error && <InlineAlert message={error} onRetry={load} />}
      {success && (
        <div className="flex items-center gap-2 rounded-xl border border-green-500/20 bg-green-500/10 p-3 mb-4 text-sm text-green-300">
          {success}
          <button onClick={() => setSuccess(null)} className="ml-auto text-green-400 hover:text-green-300">✕</button>
        </div>
      )}

      {loading ? (
        <div className="text-center text-text-secondary py-12">Loading…</div>
      ) : templates.length === 0 ? (
        <EmptyState message="No templates found. Built-in templates will appear here automatically." />
      ) : (
        <div className="space-y-3">
          {templates.map((t) => (
            <div key={t.id} className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
              <div
                className="p-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-white/5"
                onClick={() => toggleExpand(t.id, t.variables)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {expandedId === t.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{t.name}</span>
                      {t.builtIn && (
                        <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">built-in</span>
                      )}
                    </div>
                    {t.description && <p className="text-text-secondary text-sm truncate">{t.description}</p>}
                    <p className="text-xs text-text-secondary mt-0.5">{t.mocks.length} mock(s) · {t.variables.length} variable(s)</p>
                  </div>
                </div>
                {!t.builtIn && (
                  <button
                    onClick={(e) => { e.stopPropagation(); void remove(t.id, t.name); }}
                    className="p-1.5 rounded-md text-red-400 hover:bg-red-400/10 shrink-0"
                    title="Delete template"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>

              {expandedId === t.id && (
                <div className="border-t border-white/10 p-4">
                  {t.variables.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium mb-2 flex items-center gap-1.5">
                        <Plus size={13} /> Variables
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        {t.variables.map((v) => (
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
                    <h4 className="text-sm font-medium mb-2">Mock Files</h4>
                    <div className="space-y-1">
                      {t.mocks.map((m, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-text-secondary">
                          <span className="font-mono bg-white/5 px-1.5 py-0.5 rounded">{m.filename}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => void applyTemplate(t.id)}
                    disabled={applyingId === t.id}
                    className="flex items-center gap-1.5 text-sm bg-primary/20 text-primary hover:bg-primary/30 disabled:opacity-50 px-4 py-2 rounded-md"
                  >
                    <Play size={13} /> {applyingId === t.id ? 'Applying…' : 'Apply Template'}
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
