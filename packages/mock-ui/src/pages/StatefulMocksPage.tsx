import { useState, useEffect, useCallback } from 'react';
import { Database, Plus, Trash2, Play, Eye, Pencil } from 'lucide-react';
import { mockApi } from '../lib/mock-api.js';
import type { StatefulMock, CreateStatefulMockDto } from '../lib/mock-api.js';
import { InlineAlert } from '../components/InlineAlert.js';
import { EmptyState } from '../components/EmptyState.js';

type StatefulMocksPageProps = {
  t?: (key: string) => string;
};

function interpolate(s: string, vars: Record<string, string | number>): string {
  return s.replace(/\{\{(\w+)\}\}/g, (_, k) => String(vars[k] ?? ''));
}

const EMPTY_FORM: CreateStatefulMockDto = {
  name: '',
  urlPattern: '',
  method: 'GET',
  stateKey: '',
  responses: {},
};

export function StatefulMocksPage({ t }: StatefulMocksPageProps) {
  const T = useCallback((key: string, fallback: string) => (t ? t(key) : fallback), [t]);
  const Tvars = (key: string, fallback: string, vars: Record<string, string | number>) => interpolate(T(key, fallback), vars);
  const [mocks, setMocks] = useState<StatefulMock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateStatefulMockDto>(EMPTY_FORM);
  const [responsesRaw, setResponsesRaw] = useState('{}');
  const [responsesError, setResponsesError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewData, setPreviewData] = useState<Record<string, unknown> | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setMocks(await mockApi.stateful.list());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function openCreate() {
    setForm(EMPTY_FORM);
    setResponsesRaw('{}');
    setEditingId(null);
    setShowForm(true);
  }

  function openEdit(mock: StatefulMock) {
    setForm({ name: mock.name, urlPattern: mock.urlPattern, method: mock.method, stateKey: mock.stateKey, responses: mock.responses });
    setResponsesRaw(JSON.stringify(mock.responses, null, 2));
    setEditingId(mock.id);
    setShowForm(true);
  }

  async function save() {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(responsesRaw) as Record<string, unknown>;
      setResponsesError(null);
    } catch {
      setResponsesError(T('stateful.responsesError', 'Responses must be valid JSON'));
      return;
    }
    setSaving(true);
    try {
      const dto = { ...form, responses: parsed };
      if (editingId) {
        await mockApi.stateful.update(editingId, dto);
        setSuccess(T('stateful.updatedSuccess', 'Stateful mock updated'));
      } else {
        await mockApi.stateful.create(dto);
        setSuccess(T('stateful.createdSuccess', 'Stateful mock created'));
      }
      setShowForm(false);
      void load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string, name: string) {
    if (!confirm(Tvars('stateful.deleteConfirm', `Delete "${name}"?`, { name }))) return;
    try {
      await mockApi.stateful.delete(id);
      setSuccess(T('stateful.deletedSuccess', 'Deleted'));
      void load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function preview(id: string) {
    try {
      const data = await mockApi.stateful.preview(id);
      setPreviewData(data as Record<string, unknown>);
      setPreviewId(id);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function test(id: string) {
    try {
      const data = await mockApi.stateful.test(id);
      setPreviewData(data as Record<string, unknown>);
      setPreviewId(id);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Database size={22} className="text-primary" /> {T('stateful.title', 'Stateful Mocks')}
            </h1>
            <p className="text-text-secondary text-sm">{T('stateful.subtitle', 'DB-driven dynamic responses with state transitions')}</p>
          </div>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 text-sm bg-primary/20 text-primary hover:bg-primary/30 px-3 py-1.5 rounded-md"
        >
          <Plus size={14} /> {T('stateful.newMock', 'New Stateful Mock')}
        </button>
      </div>

      {error && <InlineAlert message={error} onRetry={load} retryLabel={T('common.retry', 'Retry')} />}
      {success && (
        <div className="flex items-center gap-2 rounded-xl border border-green-500/20 bg-green-500/10 p-3 mb-4 text-sm text-green-300">
          {success}
          <button onClick={() => setSuccess(null)} className="ml-auto text-green-400 hover:text-green-300">✕</button>
        </div>
      )}

      {showForm && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-5 mb-6">
          <h3 className="font-medium mb-4">{editingId ? T('stateful.editMock', 'Edit Stateful Mock') : T('stateful.newMock', 'New Stateful Mock')}</h3>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={T('stateful.namePlaceholder', 'Name *')}
              className="bg-white/5 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-primary"
            />
            <input
              value={form.stateKey}
              onChange={(e) => setForm({ ...form, stateKey: e.target.value })}
              placeholder={T('stateful.stateKeyPlaceholder', 'State key (e.g. user.status) *')}
              className="bg-white/5 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-primary"
            />
            <input
              value={form.urlPattern}
              onChange={(e) => setForm({ ...form, urlPattern: e.target.value })}
              placeholder={T('stateful.urlPatternPlaceholder', 'URL pattern (e.g. /api/users/:id) *')}
              className="bg-white/5 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-primary"
            />
            <select
              value={form.method}
              onChange={(e) => setForm({ ...form, method: e.target.value })}
              className="bg-white/5 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none"
            >
              {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div className="mb-3">
            <label className="text-xs text-text-secondary mb-1 block">{T('stateful.responsesLabel', 'Responses by state (JSON)')}</label>
            <textarea
              value={responsesRaw}
              onChange={(e) => setResponsesRaw(e.target.value)}
              rows={6}
              className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary resize-none"
              placeholder={'{\n  "active": { "status": 200, "body": { "active": true } },\n  "inactive": { "status": 200, "body": { "active": false } }\n}'}
            />
            {responsesError && <p className="text-xs text-red-400 mt-1">{responsesError}</p>}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => void save()}
              disabled={saving || !form.name || !form.urlPattern || !form.stateKey}
              className="text-sm bg-primary/20 text-primary hover:bg-primary/30 disabled:opacity-50 px-3 py-1.5 rounded-md"
            >
              {saving ? T('stateful.saving', 'Saving…') : editingId ? T('stateful.update', 'Update') : T('stateful.create', 'Create')}
            </button>
            <button onClick={() => setShowForm(false)} className="text-sm text-text-secondary hover:text-text-primary px-3 py-1.5">
              {T('common.cancel', 'Cancel')}
            </button>
          </div>
        </div>
      )}

      {previewData && previewId && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-sm">{T('stateful.previewTestResult', 'Preview / Test Result')}</h3>
            <button onClick={() => { setPreviewData(null); setPreviewId(null); }} className="text-text-secondary hover:text-text-primary text-xs">{T('stateful.close', '✕ Close')}</button>
          </div>
          <pre className="text-xs text-text-secondary overflow-auto max-h-48">{JSON.stringify(previewData, null, 2)}</pre>
        </div>
      )}

      {loading ? (
        <div className="text-center text-text-secondary py-12">{T('stateful.loading', 'Loading…')}</div>
      ) : mocks.length === 0 ? (
        <EmptyState message={T('stateful.empty', 'No stateful mocks yet. Create one to serve dynamic responses based on database state.')} />
      ) : (
        <div className="space-y-3">
          {mocks.map((m) => (
            <div key={m.id} className="bg-white/5 border border-white/10 rounded-lg p-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{m.name}</span>
                  <span className="text-xs font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded">{m.method}</span>
                </div>
                <p className="text-text-secondary text-sm font-mono truncate">{m.urlPattern}</p>
                <p className="text-xs text-text-secondary mt-0.5">{T('stateful.stateKeyLabel', 'State key:')} <code className="text-primary">{m.stateKey}</code></p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => void preview(m.id)}
                  title={T('stateful.preview', 'Preview')}
                  className="p-1.5 rounded-md text-text-secondary hover:bg-white/10 hover:text-text-primary"
                >
                  <Eye size={14} />
                </button>
                <button
                  onClick={() => void test(m.id)}
                  title={T('stateful.test', 'Test')}
                  className="p-1.5 rounded-md text-text-secondary hover:bg-white/10 hover:text-text-primary"
                >
                  <Play size={14} />
                </button>
                <button
                  onClick={() => openEdit(m)}
                  title={T('stateful.edit', 'Edit')}
                  className="p-1.5 rounded-md text-text-secondary hover:bg-white/10 hover:text-text-primary"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => void remove(m.id, m.name)}
                  title={T('common.delete', 'Delete')}
                  className="p-1.5 rounded-md text-red-400 hover:bg-red-400/10"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
