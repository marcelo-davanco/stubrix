import React, { useState, useEffect, useCallback } from 'react';
import {
  Network,
  Plus,
  Trash2,
  Code,
  FileCode,
  Layers,
  RefreshCw,
  X,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { mockApi } from '../lib/mock-api.js';
import type { ProtocolMock, ProtoFileInfo, GrpcStub } from '../lib/mock-api.js';
import { InlineAlert } from '../components/InlineAlert.js';
import { EmptyState } from '../components/EmptyState.js';

type ProtocolsPageProps = {
  t?: (key: string) => string;
};

function interpolate(s: string, vars: Record<string, string | number>): string {
  return s.replace(/\{\{(\w+)\}\}/g, (_, k) => String(vars[k] ?? ''));
}

const PROTOCOL_COLORS: Record<string, string> = {
  graphql: 'text-pink-400 bg-pink-400/10',
  grpc: 'text-blue-400 bg-blue-400/10',
  rest: 'text-green-400 bg-green-400/10',
};

type Tab = 'mocks' | 'protos' | 'stubs';

const STUB_TEMPLATE = JSON.stringify(
  {
    service: 'MyService',
    method: 'MyMethod',
    input: { equals: {} },
    output: { data: {} },
  },
  null,
  2,
);

export function ProtocolsPage({ t }: ProtocolsPageProps) {
  const T = useCallback(
    (key: string, fallback: string) => (t ? t(key) : fallback),
    [t],
  );
  const Tvars = (
    key: string,
    fallback: string,
    vars: Record<string, string | number>,
  ) => interpolate(T(key, fallback), vars);

  const [activeTab, setActiveTab] = useState<Tab>('mocks');
  const [grpcAvailable, setGrpcAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // ── Mocks tab ──
  const [mocks, setMocks] = useState<ProtocolMock[]>([]);
  const [mocksLoading, setMocksLoading] = useState(false);
  const [filter, setFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    protocol: 'graphql',
    name: '',
    schema: '',
    endpoint: '',
    protoFile: '',
    grpcService: '',
  });
  const [saving, setSaving] = useState(false);
  const [parseResult, setParseResult] = useState<unknown>(null);

  // ── Proto Files tab ──
  const [protos, setProtos] = useState<ProtoFileInfo[]>([]);
  const [protosLoading, setProtosLoading] = useState(false);
  const [protoEditor, setProtoEditor] = useState<{
    name: string;
    content: string;
  } | null>(null);
  const [protoSaving, setProtoSaving] = useState(false);

  // ── gRPC Stubs tab ──
  const [stubs, setStubs] = useState<GrpcStub[]>([]);
  const [stubsLoading, setStubsLoading] = useState(false);
  const [stubEditor, setStubEditor] = useState('');
  const [stubSaving, setStubSaving] = useState(false);
  const [expandedStub, setExpandedStub] = useState<string | null>(null);

  const loadHealth = useCallback(async () => {
    const h = await mockApi.protocols
      .grpcHealth()
      .catch(() => ({ available: false }));
    setGrpcAvailable((h as { available?: boolean })?.available ?? false);
  }, []);

  const loadMocks = useCallback(async () => {
    setMocksLoading(true);
    try {
      setMocks(await mockApi.protocols.list(filter || undefined));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setMocksLoading(false);
    }
  }, [filter]);

  const loadProtos = useCallback(async () => {
    setProtosLoading(true);
    try {
      setProtos(await mockApi.protocols.listProtos());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setProtosLoading(false);
    }
  }, []);

  const loadStubs = useCallback(async () => {
    setStubsLoading(true);
    try {
      setStubs(await mockApi.protocols.listStubs());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setStubsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHealth();
  }, [loadHealth]);
  useEffect(() => {
    if (activeTab === 'mocks') void loadMocks();
  }, [activeTab, loadMocks]);
  useEffect(() => {
    if (activeTab === 'protos') void loadProtos();
  }, [activeTab, loadProtos]);
  useEffect(() => {
    if (activeTab === 'stubs') void loadStubs();
  }, [activeTab, loadStubs]);

  async function createMock() {
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
      setForm({
        protocol: 'graphql',
        name: '',
        schema: '',
        endpoint: '',
        protoFile: '',
        grpcService: '',
      });
      void loadMocks();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function removeMock(id: string, name: string) {
    if (
      !confirm(
        Tvars('protocols.deleteConfirm', 'Delete mock "{{name}}"?', { name }),
      )
    )
      return;
    try {
      await mockApi.protocols.delete(id);
      setSuccess(T('protocols.deleted', 'Deleted'));
      void loadMocks();
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

  async function openProtoEditor(name: string) {
    try {
      const file = await mockApi.protocols.getProto(name);
      setProtoEditor(file);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function newProtoEditor() {
    setProtoEditor({
      name: 'service.proto',
      content:
        'syntax = "proto3";\n\npackage myservice;\n\nservice MyService {\n  rpc MyMethod (MyRequest) returns (MyResponse);\n}\n\nmessage MyRequest {\n  string id = 1;\n}\n\nmessage MyResponse {\n  string result = 1;\n}\n',
    });
  }

  async function saveProto() {
    if (!protoEditor) return;
    setProtoSaving(true);
    try {
      await mockApi.protocols.saveProto(protoEditor.name, protoEditor.content);
      setSuccess(T('protocols.protoSaved', 'Proto file saved'));
      setProtoEditor(null);
      void loadProtos();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setProtoSaving(false);
    }
  }

  async function deleteProto(name: string) {
    if (!confirm(`Delete ${name}?`)) return;
    try {
      await mockApi.protocols.deleteProto(name);
      setSuccess(T('protocols.deleted', 'Deleted'));
      void loadProtos();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function addStub() {
    setStubSaving(true);
    try {
      const parsed = JSON.parse(stubEditor) as Record<string, unknown>;
      await mockApi.protocols.addStub(parsed);
      setSuccess(T('protocols.stubAdded', 'Stub added to GripMock'));
      setStubEditor('');
      void loadStubs();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setStubSaving(false);
    }
  }

  async function clearStubs() {
    if (!confirm(T('protocols.clearStubsConfirm', 'Clear all gRPC stubs?')))
      return;
    try {
      await mockApi.protocols.clearStubs();
      setSuccess(T('protocols.stubsCleared', 'All stubs cleared'));
      void loadStubs();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    {
      id: 'mocks',
      label: T('protocols.tabMocks', 'Mocks'),
      icon: <Network size={14} />,
    },
    {
      id: 'protos',
      label: T('protocols.tabProtos', 'Proto Files'),
      icon: <FileCode size={14} />,
    },
    {
      id: 'stubs',
      label: T('protocols.tabStubs', 'gRPC Stubs'),
      icon: <Layers size={14} />,
    },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Network size={22} className="text-indigo-400" />{' '}
            {T('protocols.title', 'Protocols')}
          </h1>
          <p className="text-text-secondary text-sm">
            {T('protocols.subtitle', 'GraphQL, gRPC and multi-protocol mocks')}
          </p>
        </div>
        {grpcAvailable !== null && (
          <span
            className={`text-xs px-2 py-1 rounded-full ${grpcAvailable ? 'bg-green-400/10 text-green-400' : 'bg-red-400/10 text-red-400'}`}
          >
            {grpcAvailable
              ? T('protocols.gripMockOk', '● GripMock OK')
              : T('protocols.gripMockUnavailable', '● GripMock unavailable')}
          </span>
        )}
      </div>

      {error && (
        <InlineAlert
          message={error}
          onRetry={() => setError(null)}
          retryLabel="✕"
        />
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-xl border border-green-500/20 bg-green-500/10 p-3 mb-4 text-sm text-green-300">
          {success}
          <button onClick={() => setSuccess(null)} className="ml-auto">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-white/10">
        {tabs.map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={[
              'flex items-center gap-1.5 px-4 py-2 text-sm border-b-2 -mb-px transition-colors',
              activeTab === id
                ? 'border-indigo-400 text-indigo-400'
                : 'border-transparent text-text-secondary hover:text-text-primary',
            ].join(' ')}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {/* ── Mocks tab ── */}
      {activeTab === 'mocks' && (
        <>
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-2">
              {['', 'graphql', 'grpc', 'rest'].map((p) => (
                <button
                  key={p}
                  onClick={() => setFilter(p)}
                  className={[
                    'px-3 py-1.5 rounded-md text-sm transition-colors',
                    filter === p
                      ? 'bg-indigo-400/20 text-indigo-400'
                      : 'text-text-secondary hover:text-text-primary bg-white/5',
                  ].join(' ')}
                >
                  {p === '' ? T('protocols.all', 'All') : p.toUpperCase()}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 text-sm bg-indigo-400/10 text-indigo-400 hover:bg-indigo-400/20 px-3 py-1.5 rounded-md"
            >
              <Plus size={14} /> {T('protocols.newMock', 'New Mock')}
            </button>
          </div>

          {showForm && (
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-6">
              <h3 className="font-medium mb-3">
                {T('protocols.newProtocolMock', 'New Protocol Mock')}
              </h3>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <select
                  value={form.protocol}
                  onChange={(e) =>
                    setForm({ ...form, protocol: e.target.value })
                  }
                  className="bg-white/5 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none"
                >
                  {['graphql', 'grpc', 'rest'].map((p) => (
                    <option key={p} value={p}>
                      {p.toUpperCase()}
                    </option>
                  ))}
                </select>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder={T(
                    'protocols.mockNamePlaceholder',
                    'Mock name *',
                  )}
                  className="bg-white/5 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                />
                <input
                  value={form.endpoint}
                  onChange={(e) =>
                    setForm({ ...form, endpoint: e.target.value })
                  }
                  placeholder={T(
                    'protocols.endpointPlaceholder',
                    'Endpoint (optional)',
                  )}
                  className="bg-white/5 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                />
                {form.protocol === 'grpc' && (
                  <>
                    <input
                      value={form.grpcService}
                      onChange={(e) =>
                        setForm({ ...form, grpcService: e.target.value })
                      }
                      placeholder={T(
                        'protocols.grpcServicePlaceholder',
                        'gRPC service name',
                      )}
                      className="bg-white/5 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                    />
                    <input
                      value={form.protoFile}
                      onChange={(e) =>
                        setForm({ ...form, protoFile: e.target.value })
                      }
                      placeholder={T(
                        'protocols.protoFilePlaceholder',
                        '.proto file path',
                      )}
                      className="col-span-2 bg-white/5 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                    />
                  </>
                )}
              </div>
              {form.protocol === 'graphql' && (
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-text-secondary">
                      {T(
                        'protocols.graphqlSchemaLabel',
                        'GraphQL Schema (SDL)',
                      )}
                    </label>
                    <button
                      onClick={() => void parseSchema()}
                      className="text-xs text-indigo-400 hover:text-indigo-300"
                    >
                      {T('protocols.parseSchema', 'Parse schema')}
                    </button>
                  </div>
                  <textarea
                    value={form.schema}
                    onChange={(e) =>
                      setForm({ ...form, schema: e.target.value })
                    }
                    rows={6}
                    placeholder={'type Query {\n  hello: String\n}'}
                    className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-indigo-400 resize-none"
                  />
                  {parseResult !== null && (
                    <pre className="mt-2 text-xs text-text-secondary bg-white/5 rounded p-2 overflow-auto max-h-32">
                      {JSON.stringify(
                        parseResult as Record<string, unknown>,
                        null,
                        2,
                      )}
                    </pre>
                  )}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => void createMock()}
                  disabled={saving || !form.name}
                  className="text-sm bg-indigo-400/10 text-indigo-400 hover:bg-indigo-400/20 disabled:opacity-50 px-3 py-1.5 rounded-md"
                >
                  {saving
                    ? T('protocols.creating', 'Creating…')
                    : T('protocols.create', 'Create')}
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="text-sm text-text-secondary hover:text-text-primary px-3 py-1.5"
                >
                  {T('common.cancel', 'Cancel')}
                </button>
              </div>
            </div>
          )}

          {mocksLoading ? (
            <div className="text-center text-text-secondary py-12">
              {T('protocols.loading', 'Loading…')}
            </div>
          ) : mocks.length === 0 ? (
            <EmptyState
              message={T(
                'protocols.empty',
                'No protocol mocks. Create a GraphQL or gRPC mock to get started.',
              )}
            />
          ) : (
            <div className="space-y-3">
              {mocks.map((m) => (
                <div
                  key={m.id}
                  className="bg-white/5 border border-white/10 rounded-lg p-4 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0 flex items-center gap-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-mono uppercase shrink-0 ${PROTOCOL_COLORS[m.protocol] ?? ''}`}
                    >
                      {m.protocol}
                    </span>
                    <div className="min-w-0">
                      <span className="font-medium">{m.name}</span>
                      {m.endpoint && (
                        <p className="text-text-secondary text-sm font-mono truncate">
                          {m.endpoint}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {m.schema && (
                      <button
                        title={T('protocols.viewSchema', 'View schema')}
                        className="p-1.5 rounded-md text-text-secondary hover:text-indigo-400 hover:bg-indigo-400/10"
                      >
                        <Code size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => void removeMock(m.id, m.name)}
                      className="p-1.5 rounded-md text-red-400 hover:bg-red-400/10"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Proto Files tab ── */}
      {activeTab === 'protos' && (
        <>
          {protoEditor ? (
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <input
                  value={protoEditor.name}
                  onChange={(e) =>
                    setProtoEditor({ ...protoEditor, name: e.target.value })
                  }
                  className="flex-1 bg-white/5 border border-white/10 rounded px-3 py-1.5 text-sm font-mono focus:outline-none focus:border-indigo-400"
                />
                <button
                  onClick={() => void saveProto()}
                  disabled={protoSaving}
                  className="text-sm bg-indigo-400/10 text-indigo-400 hover:bg-indigo-400/20 disabled:opacity-50 px-3 py-1.5 rounded-md"
                >
                  {protoSaving
                    ? T('common.saving', 'Saving…')
                    : T('common.save', 'Save')}
                </button>
                <button
                  onClick={() => setProtoEditor(null)}
                  className="p-1.5 rounded-md text-text-secondary hover:text-text-primary"
                >
                  <X size={16} />
                </button>
              </div>
              <textarea
                value={protoEditor.content}
                onChange={(e) =>
                  setProtoEditor({ ...protoEditor, content: e.target.value })
                }
                rows={20}
                spellCheck={false}
                className="w-full bg-black/30 border border-white/10 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-indigo-400 resize-y"
              />
            </div>
          ) : (
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-text-secondary">
                {T(
                  'protocols.protosHint',
                  'Files in mocks/proto/ — mounted read-only into GripMock container',
                )}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => void loadProtos()}
                  className="p-1.5 rounded-md text-text-secondary hover:text-text-primary"
                >
                  <RefreshCw size={14} />
                </button>
                <button
                  onClick={newProtoEditor}
                  className="flex items-center gap-1.5 text-sm bg-indigo-400/10 text-indigo-400 hover:bg-indigo-400/20 px-3 py-1.5 rounded-md"
                >
                  <Plus size={14} /> {T('protocols.newProto', 'New Proto')}
                </button>
              </div>
            </div>
          )}

          {!protoEditor &&
            (protosLoading ? (
              <div className="text-center text-text-secondary py-12">
                {T('protocols.loading', 'Loading…')}
              </div>
            ) : protos.length === 0 ? (
              <EmptyState
                message={T(
                  'protocols.protosEmpty',
                  'No .proto files. Click "New Proto" to create one.',
                )}
              />
            ) : (
              <div className="space-y-2">
                {protos.map((p) => (
                  <div
                    key={p.name}
                    className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <FileCode size={16} className="text-blue-400 shrink-0" />
                      <span className="font-mono text-sm">{p.name}</span>
                      <span className="text-xs text-text-secondary">
                        {(p.size / 1024).toFixed(1)} KB
                      </span>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => void openProtoEditor(p.name)}
                        className="text-xs text-indigo-400 hover:text-indigo-300 px-2 py-1 rounded-md hover:bg-indigo-400/10"
                      >
                        {T('common.edit', 'Edit')}
                      </button>
                      <button
                        onClick={() => void deleteProto(p.name)}
                        className="p-1.5 rounded-md text-red-400 hover:bg-red-400/10"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
        </>
      )}

      {/* ── gRPC Stubs tab ── */}
      {activeTab === 'stubs' && (
        <>
          <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium">
                {T('protocols.addStub', 'Add Stub')}
              </h3>
              <button
                onClick={() => setStubEditor(STUB_TEMPLATE)}
                className="text-xs text-text-secondary hover:text-indigo-400"
              >
                {T('protocols.loadTemplate', 'Load template')}
              </button>
            </div>
            <textarea
              value={stubEditor}
              onChange={(e) => setStubEditor(e.target.value)}
              rows={8}
              placeholder={STUB_TEMPLATE}
              spellCheck={false}
              className="w-full bg-black/30 border border-white/10 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-indigo-400 resize-y mb-2"
            />
            <button
              onClick={() => void addStub()}
              disabled={stubSaving || !stubEditor.trim()}
              className="text-sm bg-indigo-400/10 text-indigo-400 hover:bg-indigo-400/20 disabled:opacity-50 px-3 py-1.5 rounded-md"
            >
              {stubSaving
                ? T('protocols.adding', 'Adding…')
                : T('protocols.addStubBtn', 'Add to GripMock')}
            </button>
          </div>

          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-text-secondary">
              {T('protocols.liveStubs', 'Live stubs in GripMock')}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => void loadStubs()}
                className="p-1.5 rounded-md text-text-secondary hover:text-text-primary"
              >
                <RefreshCw size={14} />
              </button>
              {stubs.length > 0 && (
                <button
                  onClick={() => void clearStubs()}
                  className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded-md hover:bg-red-400/10"
                >
                  {T('protocols.clearAll', 'Clear all')}
                </button>
              )}
            </div>
          </div>

          {stubsLoading ? (
            <div className="text-center text-text-secondary py-8">
              {T('protocols.loading', 'Loading…')}
            </div>
          ) : !grpcAvailable ? (
            <div className="text-center text-text-secondary py-8 text-sm">
              {T(
                'protocols.gripMockOffline',
                'GripMock is not running — start it from Settings → Protocols.',
              )}
            </div>
          ) : stubs.length === 0 ? (
            <EmptyState
              message={T(
                'protocols.stubsEmpty',
                'No stubs registered. Add one above.',
              )}
            />
          ) : (
            <div className="space-y-2">
              {stubs.map((s) => (
                <div
                  key={s.id}
                  className="bg-white/5 border border-white/10 rounded-lg overflow-hidden"
                >
                  <div
                    className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-white/5"
                    onClick={() =>
                      setExpandedStub(expandedStub === s.id ? null : s.id)
                    }
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {expandedStub === s.id ? (
                        <ChevronDown
                          size={14}
                          className="text-text-secondary shrink-0"
                        />
                      ) : (
                        <ChevronRight
                          size={14}
                          className="text-text-secondary shrink-0"
                        />
                      )}
                      <span className="font-mono text-sm text-blue-400">
                        {s.service}
                      </span>
                      <span className="text-text-secondary text-sm">/</span>
                      <span className="font-mono text-sm">{s.method}</span>
                    </div>
                  </div>
                  {expandedStub === s.id && (
                    <pre className="px-4 pb-3 text-xs font-mono text-text-secondary bg-black/20 border-t border-white/5 overflow-auto max-h-48">
                      {JSON.stringify(
                        { input: s.input, output: s.output },
                        null,
                        2,
                      )}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
