import { useState, useEffect } from 'react';
import { Brain, Sparkles, Database, Search, Loader } from 'lucide-react';
import { mockApi } from '../lib/mock-api.js';
import type { RagQueryResult, MockSuggestion, DataSuggestion } from '../lib/mock-api.js';
import { InlineAlert } from '../components/InlineAlert.js';

type IntelligencePageProps = {
  t?: (key: string) => string;
  onNavigateBack?: () => void;
};

function interpolate(s: string, vars: Record<string, string | number>): string {
  return s.replace(/\{\{(\w+)\}\}/g, (_, k) => String(vars[k] ?? ''));
}

type Tab = 'query' | 'mock' | 'data';

export function IntelligencePage({ t, onNavigateBack }: IntelligencePageProps) {
  const T = useCallback((key: string, fallback: string) => (t ? t(key) : fallback), [t]);
  const Tvars = (key: string, fallback: string, vars: Record<string, string | number>) => interpolate(T(key, fallback), vars);
  const [tab, setTab] = useState<Tab>('query');
  const [available, setAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [indexing, setIndexing] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [queryResult, setQueryResult] = useState<RagQueryResult | null>(null);

  const [mockDesc, setMockDesc] = useState('');
  const [mockResult, setMockResult] = useState<MockSuggestion | null>(null);

  const [dataDesc, setDataDesc] = useState('');
  const [dataResult, setDataResult] = useState<DataSuggestion | null>(null);

  useEffect(() => {
    void mockApi.intelligence.health()
      .then((res) => setAvailable(res.available))
      .catch(() => setAvailable(false));
  }, []);

  async function runQuery() {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setQueryResult(null);
    try {
      setQueryResult(await mockApi.intelligence.query(query));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function suggestMock() {
    if (!mockDesc.trim()) return;
    setLoading(true);
    setError(null);
    setMockResult(null);
    try {
      setMockResult(await mockApi.intelligence.suggestMock(mockDesc));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function suggestData() {
    if (!dataDesc.trim()) return;
    setLoading(true);
    setError(null);
    setDataResult(null);
    try {
      setDataResult(await mockApi.intelligence.suggestData(dataDesc));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function indexMocks() {
    setIndexing(true);
    setError(null);
    try {
      const res = await mockApi.intelligence.index();
      setSuccess(Tvars('intelligence.indexedSuccess', `Indexed ${res.indexed} mocks into the knowledge base`, { count: res.indexed }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIndexing(false);
    }
  }

  const tabConfig: Array<{ id: Tab; labelKey: string; label: string; icon: React.ReactNode }> = [
    { id: 'query', labelKey: 'intelligence.ragQuery', label: 'RAG Query', icon: <Search size={13} /> },
    { id: 'mock', labelKey: 'intelligence.suggestMock', label: 'Suggest Mock', icon: <Sparkles size={13} /> },
    { id: 'data', labelKey: 'intelligence.suggestData', label: 'Suggest Data', icon: <Database size={13} /> },
  ];

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {onNavigateBack && (
            <button onClick={onNavigateBack} className="text-text-secondary hover:text-text-primary text-sm">{T('common.back', '← Back')}</button>
          )}
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Brain size={22} className="text-purple-400" /> {T('intelligence.title', 'Intelligence')}
            </h1>
            <p className="text-text-secondary text-sm">{T('intelligence.subtitle', 'AI-powered mock generation and knowledge queries')}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {available !== null && (
            <span className={`text-xs px-2 py-1 rounded-full ${available ? 'bg-green-400/10 text-green-400' : 'bg-red-400/10 text-red-400'}`}>
              {available ? T('intelligence.openRagConnected', '● OpenRAG connected') : T('intelligence.openRagUnavailable', '● OpenRAG unavailable')}
            </span>
          )}
          <button
            onClick={() => void indexMocks()}
            disabled={indexing}
            className="flex items-center gap-1.5 text-xs bg-purple-400/10 text-purple-400 hover:bg-purple-400/20 disabled:opacity-50 px-3 py-1.5 rounded-md"
          >
            {indexing ? <Loader size={12} className="animate-spin" /> : <Brain size={12} />}
            {indexing ? T('intelligence.indexing', 'Indexing…') : T('intelligence.reindexMocks', 'Re-index Mocks')}
          </button>
        </div>
      </div>

      {error && <InlineAlert message={error} />}
      {success && (
        <div className="flex items-center gap-2 rounded-xl border border-green-500/20 bg-green-500/10 p-3 mb-4 text-sm text-green-300">
          {success}
          <button onClick={() => setSuccess(null)} className="ml-auto text-green-400 hover:text-green-300">✕</button>
        </div>
      )}

      {!available && (
        <div className="flex items-start gap-3 rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-4 mb-6 text-sm text-yellow-300">
          <Sparkles size={16} className="mt-0.5 shrink-0" />
          <span>{T('intelligence.notConfigured', 'OpenRAG is not configured. Set the OPENAI_API_KEY or RAG_ENDPOINT env variable to enable AI features.')}</span>
        </div>
      )}

      <div className="flex gap-1 mb-6 bg-white/5 rounded-lg p-1">
        {tabConfig.map((tabItem) => (
          <button
            key={tabItem.id}
            onClick={() => setTab(tabItem.id)}
            className={[
              'flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors',
              tab === tabItem.id ? 'bg-purple-400/20 text-purple-400' : 'text-text-secondary hover:text-text-primary',
            ].join(' ')}
          >
            {tabItem.icon} {T(tabItem.labelKey, tabItem.label)}
          </button>
        ))}
      </div>

      {tab === 'query' && (
        <div>
          <div className="flex gap-2 mb-4">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void runQuery()}
              placeholder={T('intelligence.queryPlaceholder', 'Ask anything about your mocks, schemas or docs…')}
              className="flex-1 bg-white/5 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-purple-400"
            />
            <button
              onClick={() => void runQuery()}
              disabled={loading || !query.trim()}
              className="flex items-center gap-1.5 text-sm bg-purple-400/20 text-purple-400 hover:bg-purple-400/30 disabled:opacity-50 px-4 py-2 rounded-md"
            >
              {loading ? <Loader size={13} className="animate-spin" /> : <Search size={13} />}
              {T('intelligence.ask', 'Ask')}
            </button>
          </div>
          {queryResult && (
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
              <p className="text-sm leading-relaxed">{queryResult.answer}</p>
              {queryResult.sources.length > 0 && (
                <div>
                  <p className="text-xs text-text-secondary mb-1">{T('intelligence.sources', 'Sources:')}</p>
                  <div className="flex flex-wrap gap-1">
                    {queryResult.sources.map((s, i) => (
                      <span key={i} className="text-xs bg-purple-400/10 text-purple-300 px-2 py-0.5 rounded">{s}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'mock' && (
        <div>
          <textarea
            value={mockDesc}
            onChange={(e) => setMockDesc(e.target.value)}
            rows={4}
            placeholder={T('intelligence.mockDescPlaceholder', "Describe the mock you want… e.g. 'A GET /api/products endpoint that returns a list of 3 products with id, name and price'")}
            className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-purple-400 resize-none mb-3"
          />
          <button
            onClick={() => void suggestMock()}
            disabled={loading || !mockDesc.trim()}
            className="flex items-center gap-1.5 text-sm bg-purple-400/20 text-purple-400 hover:bg-purple-400/30 disabled:opacity-50 px-4 py-2 rounded-md mb-4"
          >
            {loading ? <Loader size={13} className="animate-spin" /> : <Sparkles size={13} />}
            {T('intelligence.generateMock', 'Generate Mock')}
          </button>
          {mockResult && (
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
              <p className="text-sm text-text-secondary">{mockResult.explanation}</p>
              <pre className="text-xs font-mono overflow-auto max-h-64 bg-white/5 rounded p-3">{JSON.stringify(mockResult.mapping, null, 2)}</pre>
            </div>
          )}
        </div>
      )}

      {tab === 'data' && (
        <div>
          <textarea
            value={dataDesc}
            onChange={(e) => setDataDesc(e.target.value)}
            rows={4}
            placeholder={T('intelligence.dataDescPlaceholder', "Describe the seed data you want… e.g. 'Insert 5 users with name, email and role (admin or viewer)'")}
            className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-purple-400 resize-none mb-3"
          />
          <button
            onClick={() => void suggestData()}
            disabled={loading || !dataDesc.trim()}
            className="flex items-center gap-1.5 text-sm bg-purple-400/20 text-purple-400 hover:bg-purple-400/30 disabled:opacity-50 px-4 py-2 rounded-md mb-4"
          >
            {loading ? <Loader size={13} className="animate-spin" /> : <Database size={13} />}
            {T('intelligence.generateSql', 'Generate SQL')}
          </button>
          {dataResult && (
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
              <p className="text-sm text-text-secondary">{dataResult.explanation}</p>
              <pre className="text-xs font-mono overflow-auto max-h-64 bg-white/5 rounded p-3 text-green-300">{dataResult.sql}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
