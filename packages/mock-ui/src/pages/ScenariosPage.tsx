import { useState, useEffect, useCallback } from 'react';
import {
  Camera,
  RotateCcw,
  Trash2,
  Plus,
  Tag,
  ArrowLeftRight,
} from 'lucide-react';
import { mockApi } from '../lib/mock-api.js';
import type { ScenarioMeta } from '../lib/mock-api.js';
import { InlineAlert } from '../components/InlineAlert.js';
import { EmptyState } from '../components/EmptyState.js';

type ScenariosPageProps = {
  t?: (key: string) => string;
};

function interpolate(s: string, vars: Record<string, string | number>): string {
  return s.replace(/\{\{(\w+)\}\}/g, (_, k) => String(vars[k] ?? ''));
}

export function ScenariosPage({ t }: ScenariosPageProps) {
  const T = useCallback(
    (key: string, fallback: string) => (t ? t(key) : fallback),
    [t],
  );
  const Tvars = (
    key: string,
    fallback: string,
    vars: Record<string, string | number>,
  ) => interpolate(T(key, fallback), vars);
  const [scenarios, setScenarios] = useState<ScenarioMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [captureName, setCaptureName] = useState('');
  const [captureDesc, setCaptureDesc] = useState('');
  const [showCapture, setShowCapture] = useState(false);
  const [diffA, setDiffA] = useState('');
  const [diffB, setDiffB] = useState('');
  const [diffSummary, setDiffSummary] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await mockApi.scenarios.list();
      setScenarios(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function capture() {
    if (!captureName.trim()) return;
    setCapturing(true);
    setError(null);
    try {
      await mockApi.scenarios.capture({
        name: captureName,
        description: captureDesc || undefined,
      });
      setSuccess(T('scenarios.capturedSuccess', 'Scenario captured!'));
      setCaptureName('');
      setCaptureDesc('');
      setShowCapture(false);
      void load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCapturing(false);
    }
  }

  async function restore(id: string, name: string) {
    if (
      !confirm(
        Tvars(
          'scenarios.restoreConfirm',
          `Restore scenario "${name}"? This will overwrite current mocks.`,
          { name },
        ),
      )
    )
      return;
    try {
      const res = await mockApi.scenarios.restore(id);
      setSuccess(
        Tvars(
          'scenarios.restoredSuccess',
          `Restored ${res.restored} mocks from "${res.name}"`,
          { count: res.restored, name: res.name },
        ),
      );
      void load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function remove(id: string, name: string) {
    if (
      !confirm(
        Tvars('scenarios.deleteConfirm', `Delete scenario "${name}"?`, {
          name,
        }),
      )
    )
      return;
    try {
      await mockApi.scenarios.delete(id);
      setSuccess(T('scenarios.deletedSuccess', 'Scenario deleted'));
      void load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function runDiff() {
    if (!diffA || !diffB) return;
    try {
      const result = await mockApi.scenarios.diff(diffA, diffB);
      const total =
        result.added.length + result.removed.length + result.changed.length;
      setDiffSummary(
        total === 0
          ? T('scenarios.diffIdentical', 'Scenarios are identical')
          : Tvars(
              'scenarios.diffSummary',
              `${total} difference(s): +${result.added.length} added, -${result.removed.length} removed, ~${result.changed.length} changed`,
              {
                total,
                added: result.added.length,
                removed: result.removed.length,
                changed: result.changed.length,
              },
            ),
      );
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
              <Camera size={22} className="text-primary" />{' '}
              {T('scenarios.title', 'Scenarios')}
            </h1>
            <p className="text-text-secondary text-sm">
              {T(
                'scenarios.subtitle',
                'Capture and restore environment snapshots',
              )}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowCapture(true)}
          className="flex items-center gap-1.5 text-sm bg-primary/20 text-primary hover:bg-primary/30 px-3 py-1.5 rounded-md"
        >
          <Plus size={14} /> {T('scenarios.capture', 'Capture')}
        </button>
      </div>

      {error && (
        <InlineAlert
          message={error}
          onRetry={load}
          retryLabel={T('common.retry', 'Retry')}
        />
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-xl border border-green-500/20 bg-green-500/10 p-3 mb-4 text-sm text-green-300">
          {success}
          <button
            onClick={() => setSuccess(null)}
            className="ml-auto text-green-400 hover:text-green-300"
          >
            ✕
          </button>
        </div>
      )}

      {showCapture && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-6">
          <h3 className="font-medium mb-3">
            {T('scenarios.captureCurrentState', 'Capture Current State')}
          </h3>
          <div className="space-y-3">
            <input
              value={captureName}
              onChange={(e) => setCaptureName(e.target.value)}
              placeholder={T(
                'scenarios.scenarioNamePlaceholder',
                'Scenario name *',
              )}
              className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-primary"
            />
            <input
              value={captureDesc}
              onChange={(e) => setCaptureDesc(e.target.value)}
              placeholder={T(
                'scenarios.descriptionPlaceholder',
                'Description (optional)',
              )}
              className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-primary"
            />
            <div className="flex gap-2">
              <button
                onClick={() => void capture()}
                disabled={capturing || !captureName.trim()}
                className="flex items-center gap-1.5 text-sm bg-primary/20 text-primary hover:bg-primary/30 disabled:opacity-50 px-3 py-1.5 rounded-md"
              >
                <Camera size={13} />{' '}
                {capturing
                  ? T('scenarios.capturing', 'Capturing…')
                  : T('scenarios.capture', 'Capture')}
              </button>
              <button
                onClick={() => setShowCapture(false)}
                className="text-sm text-text-secondary hover:text-text-primary px-3 py-1.5"
              >
                {T('common.cancel', 'Cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-6">
        <h3 className="font-medium mb-3 flex items-center gap-2">
          <ArrowLeftRight size={15} />{' '}
          {T('scenarios.compareScenarios', 'Compare Scenarios')}
        </h3>
        <div className="flex gap-2 items-center">
          <select
            value={diffA}
            onChange={(e) => setDiffA(e.target.value)}
            className="flex-1 bg-white/5 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none"
          >
            <option value="">{T('scenarios.selectA', 'Select A…')}</option>
            {scenarios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <span className="text-text-secondary text-sm">vs</span>
          <select
            value={diffB}
            onChange={(e) => setDiffB(e.target.value)}
            className="flex-1 bg-white/5 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none"
          >
            <option value="">{T('scenarios.selectB', 'Select B…')}</option>
            {scenarios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => void runDiff()}
            disabled={!diffA || !diffB}
            className="text-sm bg-white/10 hover:bg-white/20 disabled:opacity-40 px-3 py-2 rounded-md"
          >
            {T('scenarios.diff', 'Diff')}
          </button>
        </div>
        {diffSummary && (
          <p className="mt-2 text-sm text-text-secondary">{diffSummary}</p>
        )}
      </div>

      {loading ? (
        <div className="text-center text-text-secondary py-12">
          {T('scenarios.loading', 'Loading…')}
        </div>
      ) : scenarios.length === 0 ? (
        <EmptyState
          message={T(
            'scenarios.empty',
            'No scenarios captured yet. Use the Capture button to snapshot the current environment.',
          )}
        />
      ) : (
        <div className="space-y-3">
          {scenarios.map((s) => (
            <div
              key={s.id}
              className="bg-white/5 border border-white/10 rounded-lg p-4 flex items-center justify-between gap-4"
            >
              <div className="min-w-0">
                <div className="font-medium truncate">{s.name}</div>
                {s.description && (
                  <p className="text-text-secondary text-sm truncate">
                    {s.description}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-text-secondary">
                    {s.mockCount} {T('scenarios.mocksCount', 'mocks')}
                  </span>
                  <span className="text-xs text-text-secondary">
                    {new Date(s.createdAt).toLocaleDateString()}
                  </span>
                  {s.tags?.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-0.5 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded"
                    >
                      <Tag size={10} /> {t}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => void restore(s.id, s.name)}
                  className="flex items-center gap-1.5 text-xs bg-green-400/10 text-green-400 hover:bg-green-400/20 px-2.5 py-1.5 rounded-md"
                >
                  <RotateCcw size={12} /> {T('scenarios.restore', 'Restore')}
                </button>
                <button
                  onClick={() => void remove(s.id, s.name)}
                  className="flex items-center gap-1.5 text-xs bg-red-400/10 text-red-400 hover:bg-red-400/20 px-2.5 py-1.5 rounded-md"
                >
                  <Trash2 size={12} /> {T('common.delete', 'Delete')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
