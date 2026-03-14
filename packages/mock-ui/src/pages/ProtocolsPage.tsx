import { useState, useEffect, useCallback } from 'react';
import { Network, Plus, Trash2, Code } from 'lucide-react';
import { mockApi } from '../lib/mock-api.js';
import type { ProtocolMock } from '../lib/mock-api.js';
import { InlineAlert } from '../components/InlineAlert.js';
import { EmptyState } from '../components/EmptyState.js';

type ProtocolsPageProps = {
  t?: (key: string) => string;
  onNavigateBack?: () => void;
};

function interpolate(s: string, vars: Record<string, string | number>): string {
  return s.replace(/\{\{(\w+)\}\}/g, (_, k) => String(vars[k] ?? ''));
}

const PROTOCOL_COLORS: Record<string, string> = {
  graphql: 'text-pink-400 bg-pink-400/10',
  grpc: 'text-blue-400 bg-blue-400/10',
  rest: 'text-green-400 bg-green-400/10',
};

export function ProtocolsPage({ t, onNavigateBack }: ProtocolsPageProps) {
  const T = (key: string, fallback: string) => (t ? t(key) : fallback);
  const Tvars = (key: string, fallback: string, vars: Record<string, string | number>) => interpolate(T(key, fallback), vars);
  const [mocks, setMocks] = useState<ProtocolMock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ protocol: 'graphql', name: '', schema: '', endpoint: '', protoFile: '', grpcService: '' });
  const [saving, setSaving] = useState(false);
  const [grpcAvailable, setGrpcAvailable] = useState<boolean | null>(null);
  const [parseResult, setParseResult] = useState<unknown>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [m, h] = await Promise.all([
        mockApi.protocols.list(filter || undefined),
        mockApi.protocols.grpcHealth(),
      ]);
      setMocks(m);
      setGrpcAvailable((h as { available?: boolean })?.available ?? false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { void load(); }, [load]);

  async function create() {
    if (!form.name) return;
    setSaving(true);
    try {
      await mockApi.protocols.create({
        protocol: form.protocol,
        name: form.name,
        schema: form.schema || undefined,
        endpoint: form.endpoint || undefined,
        protoFile: form.protoFile || undefined,
        grpcService: form.grpcService || undefined,
      });
      setSuccess(T('protocols.protocolMockCreated', 'Protocol mock created'));
      setShowForm(false);
      setForm({ protocol: 'graphql', name: '', schema: '', endpoint: '', protoFile: '', grpcService: '' });
      void load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string, name: string) {
    if (!confirm(Tvars('protocols.deleteConfirm', 'Delete mock "{{name}}"?' , { name }))) return;
    try {
      await mockApi.protocols.delete(id);
      setSuccess(T('protocols.deleted', 'Deleted'));
      void load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function parseSchema() {
    if (!form.schema) return;
    try {
      setParseResult(await mockApi.protocols.parseGraphQL(form.schema));
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
              <Network size={22} className="text-indigo-400" /> {T('protocols.title', 'Protocols')}
            </h1>
            <p className="text-text-secondary text-sm">{T('protocols.subtitle', 'GraphQL, gRPC and multi-protocol mocks')}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {grpcAvailable !== null && (
            <span className={`text-xs px-2 py-1 rounded-full ${grpcAvailable ? 'bg-green-400/10 text-green-400' : 'bg-red-400/10 text-red-400'}`}>
              {grpcAvailable ? T('protocols.gripMockOk', '● GripMock OK') : T('protocols.gripMockUnavailable', '● GripMock unavailable')}
            </span>
          )}
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 text-sm bg-indigo-400/10 text-indigo-400 hover:bg-indigo-400/20 px-3 py-1.5 rounded-md">
            <Plus size={14} /> {T('protocols.newMock', 'New Mock')}
          </button>
        </div>
      </div>

      {error && <InlineAlert message={error} onRetry={load} retryLabel={T('common.retry', 'Retry')} />}
      {success && (
        <div className="flex items-center gap-2 rounded-xl border border-green-500/20 bg-green-500/10 p-3 mb-4 text-sm text-green-300">
          {success}<button onClick={() => setSuccess(null)} className="ml-auto">✕</button>
        </div>
      )}

      <div className="flex gap-2 mb-4">
        {['', 'graphql', 'grpc', 'rest'].map((p) => (
          <button key={p} onClick={() => setFilter(p)}
            className={['px-3 py-1.5 rounded-md text-sm transition-colors',
              filter === p ? 'bg-indigo-400/20 text-indigo-400' : 'text-text-secondary hover:text-text-primary bg-white/5'].join(' ')}>
            {p === '' ? T('protocols.all', 'All') : p.toUpperCase()}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-6">
          <h3 className="font-medium mb-3">{T('protocols.newProtocolMock', 'New Protocol Mock')}</h3>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <select value={form.protocol} onChange={(e) => setForm({ ...form, protocol: e.target.value })}
              className="bg-white/5 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none">
              {['graphql', 'grpc', 'rest'].map((p) => <option key={p} value={p}>{p.toUpperCase()}</option>)}
            </select>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={T('protocols.mockNamePlaceholder', 'Mock name *')}
              className="bg-white/5 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-400" />
            <input value={form.endpoint} onChange={(e) => setForm({ ...form, endpoint: e.target.value })}
              placeholder={T('protocols.endpointPlaceholder', 'Endpoint (optional)')}
              className="bg-white/5 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-400" />
            {form.protocol === 'grpc' && (
              <>
                <input value={form.grpcService} onChange={(e) => setForm({ ...form, grpcService: e.target.value })}
                  placeholder={T('protocols.grpcServicePlaceholder', 'gRPC service name')}
                  className="bg-white/5 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-400" />
                <input value={form.protoFile} onChange={(e) => setForm({ ...form, protoFile: e.target.value })}
                  placeholder={T('protocols.protoFilePlaceholder', '.proto file path')}
                  className="col-span-2 bg-white/5 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-400" />
              </>
            )}
          </div>
          {form.protocol === 'graphql' && (
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-text-secondary">{T('protocols.graphqlSchemaLabel', 'GraphQL Schema (SDL)')}</label>
                <button onClick={() => void parseSchema()} className="text-xs text-indigo-400 hover:text-indigo-300">{T('protocols.parseSchema', 'Parse schema')}</button>
              </div>
              <textarea value={form.schema} onChange={(e) => setForm({ ...form, schema: e.target.value })}
                rows={6} placeholder={'type Query {\n  hello: String\n}'}
                className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-indigo-400 resize-none" />
              {parseResult !== null && (
                <pre className="mt-2 text-xs text-text-secondary bg-white/5 rounded p-2 overflow-auto max-h-32">
                  {JSON.stringify(parseResult as Record<string, unknown>, null, 2)}
                </pre>
              )}
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={() => void create()} disabled={saving || !form.name}
              className="text-sm bg-indigo-400/10 text-indigo-400 hover:bg-indigo-400/20 disabled:opacity-50 px-3 py-1.5 rounded-md">
              {saving ? T('protocols.creating', 'Creating…') : T('protocols.create', 'Create')}
            </button>
            <button onClick={() => setShowForm(false)} className="text-sm text-text-secondary hover:text-text-primary px-3 py-1.5">{T('common.cancel', 'Cancel')}</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center text-text-secondary py-12">{T('protocols.loading', 'Loading…')}</div>
      ) : mocks.length === 0 ? (
        <EmptyState message={T('protocols.empty', 'No protocol mocks. Create a GraphQL or gRPC mock to get started.')} />
      ) : (
        <div className="space-y-3">
          {mocks.map((m) => (
            <div key={m.id} className="bg-white/5 border border-white/10 rounded-lg p-4 flex items-center justify-between gap-4">
              <div className="min-w-0 flex items-center gap-3">
                <span className={`text-xs px-2 py-0.5 rounded font-mono uppercase shrink-0 ${PROTOCOL_COLORS[m.protocol] ?? ''}`}>
                  {m.protocol}
                </span>
                <div className="min-w-0">
                  <span className="font-medium">{m.name}</span>
                  {m.endpoint && <p className="text-text-secondary text-sm font-mono truncate">{m.endpoint}</p>}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                {m.schema && (
                  <button title={T('protocols.viewSchema', 'View schema')}
                    className="p-1.5 rounded-md text-text-secondary hover:text-indigo-400 hover:bg-indigo-400/10">
                    <Code size={14} />
                  </button>
                )}
                <button onClick={() => void remove(m.id, m.name)}
                  className="p-1.5 rounded-md text-red-400 hover:bg-red-400/10">
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
