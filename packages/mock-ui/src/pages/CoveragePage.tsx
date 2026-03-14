import { useState } from 'react';
import { BarChart2, Upload, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { mockApi } from '../lib/mock-api.js';
import type { CoverageReport } from '../lib/mock-api.js';
import { InlineAlert } from '../components/InlineAlert.js';

type CoveragePageProps = {
  t?: (key: string) => string;
  onNavigateBack?: () => void;
};

function interpolate(s: string, vars: Record<string, string | number>): string {
  return s.replace(/\{\{(\w+)\}\}/g, (_, k) => String(vars[k] ?? ''));
}

export function CoveragePage({ t, onNavigateBack }: CoveragePageProps) {
  const T = useCallback((key: string, fallback: string) => (t ? t(key) : fallback), [t]);
  const Tvars = (key: string, fallback: string, vars: Record<string, string | number>) => interpolate(T(key, fallback), vars);
  const [specContent, setSpecContent] = useState('');
  const [specFileName, setSpecFileName] = useState<string | undefined>(undefined);
  const [specUrl, setSpecUrl] = useState('');
  const [report, setReport] = useState<CoverageReport | null>(null);
  const [textReport, setTextReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'paste' | 'url'>('paste');

  function isPostmanCollection(content: string): boolean {
    try {
      const parsed = JSON.parse(content) as Record<string, unknown>;
      const info = parsed.info as Record<string, unknown> | undefined;
      return !!info && (typeof info['_postman_id'] === 'string' || String(info['schema'] ?? '').includes('getpostman.com'));
    } catch {
      return false;
    }
  }

  async function analyze() {
    const content = tab === 'paste' ? specContent : '';
    if (!content && tab === 'paste') return;
    setLoading(true);
    setError(null);
    setReport(null);
    setTextReport(null);
    try {
      if (tab === 'url' && specUrl) {
        const fetchRes = await fetch(specUrl);
        if (!fetchRes.ok) throw new Error(`Failed to fetch spec: ${fetchRes.status} ${fetchRes.statusText}`);
        const content = await fetchRes.text();
        const res = await mockApi.coverage.analyze(content, specUrl);
        setReport(res);
        const txt = await mockApi.coverage.textReport(content, specUrl);
        setTextReport(txt.report);
      } else if (isPostmanCollection(content)) {
        const res = await mockApi.coverage.analyzePostman(content, specFileName);
        setReport(res);
      } else {
        const res = await mockApi.coverage.analyze(content, specFileName);
        setReport(res);
        const txt = await mockApi.coverage.textReport(content, specFileName);
        setTextReport(txt.report);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSpecFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setSpecContent(ev.target?.result as string);
      setTab('paste');
    };
    reader.readAsText(file);
  }

  const coveragePct = report?.coveragePercent ?? 0;
  const coverageColor = coveragePct >= 80 ? 'text-green-400' : coveragePct >= 50 ? 'text-yellow-400' : 'text-red-400';
  const coverageBg = coveragePct >= 80 ? 'bg-green-400' : coveragePct >= 50 ? 'bg-yellow-400' : 'bg-red-400';

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        {onNavigateBack && (
          <button onClick={onNavigateBack} className="text-text-secondary hover:text-text-primary text-sm">{T('common.back', '← Back')}</button>
        )}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart2 size={22} className="text-green-400" /> {T('coverage.title', 'Mock Coverage')}
          </h1>
          <p className="text-text-secondary text-sm">{T('coverage.subtitle', 'Analyze how well your mocks cover an OpenAPI spec or Postman collection')}</p>
        </div>
      </div>

      {error && <InlineAlert message={error} />}

      <div className="bg-white/5 border border-white/10 rounded-lg p-5 mb-6">
        <div className="flex gap-1 mb-4 bg-white/5 rounded-lg p-1 w-fit">
          {(['paste', 'url'] as const).map((tabKey) => (
            <button
              key={tabKey}
              onClick={() => setTab(tabKey)}
              className={[
                'px-4 py-1.5 rounded-md text-sm transition-colors',
                tab === tabKey ? 'bg-green-400/20 text-green-400' : 'text-text-secondary hover:text-text-primary',
              ].join(' ')}
            >
              {tabKey === 'paste' ? T('coverage.pasteUpload', 'Paste / Upload') : T('coverage.fromUrl', 'From URL')}
            </button>
          ))}
        </div>

        {tab === 'paste' && (
          <>
            <div className="flex items-center gap-3 mb-3">
              <label className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary cursor-pointer bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-md">
                <Upload size={13} /> {T('coverage.uploadFile', 'Upload file')}
                <input type="file" accept=".yaml,.yml,.json" onChange={onFileChange} className="hidden" />
              </label>
              {specContent && (
                <span className="text-xs text-green-400">
                  {Tvars('coverage.fileLoaded', `File loaded (${specContent.length} chars)`, { count: specContent.length })}{isPostmanCollection(specContent) ? T('coverage.postmanDetected', ' — Postman collection detected') : ''}
                </span>
              )}
            </div>
            <textarea
              value={specContent}
              onChange={(e) => setSpecContent(e.target.value)}
              rows={10}
              placeholder={T('coverage.specPlaceholder', 'Paste your OpenAPI spec (YAML or JSON) or Postman collection (JSON)…')}
              className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-green-400 resize-none"
            />
          </>
        )}

        {tab === 'url' && (
          <input
            value={specUrl}
            onChange={(e) => setSpecUrl(e.target.value)}
            placeholder={T('coverage.urlPlaceholder', 'https://example.com/openapi.yaml')}
            className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-green-400"
          />
        )}

        <button
          onClick={() => void analyze()}
          disabled={loading || (tab === 'paste' && !specContent) || (tab === 'url' && !specUrl)}
          className="mt-3 flex items-center gap-1.5 text-sm bg-green-400/10 text-green-400 hover:bg-green-400/20 disabled:opacity-50 px-4 py-2 rounded-md"
        >
          <BarChart2 size={13} /> {loading ? T('coverage.analyzing', 'Analyzing…') : T('coverage.analyze', 'Analyze Coverage')}
        </button>
      </div>

      {report && (
        <>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 text-center">
              <div className={`text-3xl font-bold ${coverageColor}`}>{coveragePct.toFixed(1)}%</div>
              <div className="text-text-secondary text-sm mt-1">{T('coverage.coverage', 'Coverage')}</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold">{report.coveredEndpoints}</div>
              <div className="text-text-secondary text-sm mt-1">{T('coverage.covered', 'Covered')}</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold">{report.totalEndpoints}</div>
              <div className="text-text-secondary text-sm mt-1">{T('coverage.totalEndpoints', 'Total endpoints')}</div>
            </div>
          </div>

          <div className="w-full bg-white/5 rounded-full h-3 mb-6">
            <div
              className={`h-3 rounded-full transition-all ${coverageBg}`}
              style={{ width: `${Math.min(coveragePct, 100)}%` }}
            />
          </div>

          {report.entries.length > 0 && (
            <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden mb-6">
              <table className="w-full text-sm">
                <thead className="border-b border-white/10">
                  <tr>
                    <th className="text-left px-4 py-2 text-text-secondary font-medium">{T('coverage.method', 'Method')}</th>
                    <th className="text-left px-4 py-2 text-text-secondary font-medium">{T('coverage.path', 'Path')}</th>
                    <th className="text-left px-4 py-2 text-text-secondary font-medium">{T('coverage.status', 'Status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {report.entries.map((entry, i) => (
                    <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                      <td className="px-4 py-2">
                        <span className="font-mono text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">{entry.method}</span>
                      </td>
                      <td className="px-4 py-2 font-mono text-xs">{entry.path}</td>
                      <td className="px-4 py-2">
                        {entry.status === 'covered' ? (
                          <span className="flex items-center gap-1 text-green-400 text-xs"><CheckCircle size={12} /> {T('coverage.coveredStatus', 'covered')}</span>
                        ) : entry.status === 'partial' ? (
                          <span className="flex items-center gap-1 text-yellow-400 text-xs"><AlertCircle size={12} /> {T('coverage.partialStatus', 'partial')}</span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-400 text-xs"><XCircle size={12} /> {T('coverage.missingStatus', 'missing')}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {textReport && (
            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
              <h3 className="text-sm font-medium mb-2">{T('coverage.textReport', 'Text Report')}</h3>
              <pre className="text-xs text-text-secondary whitespace-pre-wrap">{textReport}</pre>
            </div>
          )}
        </>
      )}
    </div>
  );
}
