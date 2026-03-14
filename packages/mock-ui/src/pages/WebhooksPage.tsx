import { useState, useEffect, useCallback } from 'react';
import { Webhook, Trash2, RotateCcw, Zap, Plus } from 'lucide-react';
import { mockApi } from '../lib/mock-api.js';
import type { WebhookEvent, WebhookSimulation, CreateWebhookSimulationDto } from '../lib/mock-api.js';
import { InlineAlert } from '../components/InlineAlert.js';
import { EmptyState } from '../components/EmptyState.js';

type WebhooksPageProps = {
  t?: (key: string) => string;
  onNavigateBack?: () => void;
};

function interpolate(s: string, vars: Record<string, string | number>): string {
  return s.replace(/\{\{(\w+)\}\}/g, (_, k) => String(vars[k] ?? ''));
}

export function WebhooksPage({ t, onNavigateBack }: WebhooksPageProps) {
  const T = useCallback((key: string, fallback: string) => (t ? t(key) : fallback), [t]);
  const Tvars = (key: string, fallback: string, vars: Record<string, string | number>) => interpolate(T(key, fallback), vars);
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [simulations, setSimulations] = useState<WebhookSimulation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [tab, setTab] = useState<'events' | 'simulations'>('events');
  const [showSimForm, setShowSimForm] = useState(false);
  const [simForm, setSimForm] = useState<CreateWebhookSimulationDto>({ name: '', targetUrl: '', method: 'POST' });
  const [saving, setSaving] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<WebhookEvent | null>(null);

  const loadEvents = useCallback(async () => {
    try {
      setEvents(await mockApi.webhooks.listEvents(50));
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  const loadSims = useCallback(async () => {
    try {
      setSimulations(await mockApi.webhooks.listSimulations());
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadEvents(), loadSims()]);
    setLoading(false);
  }, [loadEvents, loadSims]);

  useEffect(() => { void load(); }, [load]);

  async function clearEvents() {
    if (!confirm(T('webhooks.clearConfirm', 'Clear all webhook events?'))) return;
    try {
      await mockApi.webhooks.clearEvents();
      setSuccess(T('webhooks.clearedSuccess', 'Events cleared'));
      void loadEvents();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function replayEvent(id: string) {
    try {
      const res = await mockApi.webhooks.replayEvent(id);
      setSuccess(Tvars('webhooks.replayedSuccess', `Replayed — HTTP ${res.status} (${res.ok ? 'OK' : 'failed'})`, { status: res.status, result: res.ok ? 'OK' : 'failed' }));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function createSim() {
    if (!simForm.name || !simForm.targetUrl) return;
    setSaving(true);
    try {
      await mockApi.webhooks.createSimulation(simForm);
      setSuccess(T('webhooks.createdSuccess', 'Simulation created'));
      setShowSimForm(false);
      setSimForm({ name: '', targetUrl: '', method: 'POST' });
      void loadSims();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function fireSim(id: string, name: string) {
    try {
      const res = await mockApi.webhooks.fireSimulation(id);
      setSuccess(Tvars('webhooks.firedSuccess', `"${name}" fired — HTTP ${res.status} (${res.ok ? 'OK' : 'failed'})`, { name, status: res.status, result: res.ok ? 'OK' : 'failed' }));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {onNavigateBack && (
            <button onClick={onNavigateBack} className="text-text-secondary hover:text-text-primary text-sm">{T('common.back', '← Back')}</button>
          )}
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Webhook size={22} className="text-primary" /> {T('webhooks.title', 'Webhooks')}
            </h1>
            <p className="text-text-secondary text-sm">{T('webhooks.subtitle', 'Inspect incoming events and fire simulations')}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {tab === 'events' && events.length > 0 && (
            <button
              onClick={() => void clearEvents()}
              className="flex items-center gap-1.5 text-sm bg-red-400/10 text-red-400 hover:bg-red-400/20 px-3 py-1.5 rounded-md"
            >
              <Trash2 size={14} /> {T('webhooks.clear', 'Clear')}
            </button>
          )}
          {tab === 'simulations' && (
            <button
              onClick={() => setShowSimForm(true)}
              className="flex items-center gap-1.5 text-sm bg-primary/20 text-primary hover:bg-primary/30 px-3 py-1.5 rounded-md"
            >
              <Plus size={14} /> {T('webhooks.newSimulation', 'New Simulation')}
            </button>
          )}
        </div>
      </div>

      {error && <InlineAlert message={error} onRetry={load} retryLabel={T('common.retry', 'Retry')} />}
      {success && (
        <div className="flex items-center gap-2 rounded-xl border border-green-500/20 bg-green-500/10 p-3 mb-4 text-sm text-green-300">
          {success}
          <button onClick={() => setSuccess(null)} className="ml-auto text-green-400 hover:text-green-300">✕</button>
        </div>
      )}

      <div className="flex gap-1 mb-6 bg-white/5 rounded-lg p-1 w-fit">
        {(['events', 'simulations'] as const).map((tabKey) => (
          <button
            key={tabKey}
            onClick={() => setTab(tabKey)}
            className={[
              'px-4 py-1.5 rounded-md text-sm capitalize transition-colors',
              tab === tabKey ? 'bg-primary/20 text-primary' : 'text-text-secondary hover:text-text-primary',
            ].join(' ')}
          >
            {tabKey === 'events' ? T('webhooks.events', 'Events') : T('webhooks.simulations', 'Simulations')}
          </button>
        ))}
      </div>

      {tab === 'simulations' && showSimForm && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-6">
          <h3 className="font-medium mb-3">{T('webhooks.newSimulationTitle', 'New Simulation')}</h3>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <input
              value={simForm.name}
              onChange={(e) => setSimForm({ ...simForm, name: e.target.value })}
              placeholder={T('webhooks.simulationNamePlaceholder', 'Simulation name *')}
              className="bg-white/5 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-primary"
            />
            <select
              value={simForm.method ?? 'POST'}
              onChange={(e) => setSimForm({ ...simForm, method: e.target.value })}
              className="bg-white/5 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none"
            >
              {['POST', 'PUT', 'PATCH', 'GET', 'DELETE'].map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <input
              value={simForm.targetUrl}
              onChange={(e) => setSimForm({ ...simForm, targetUrl: e.target.value })}
              placeholder={T('webhooks.targetUrlPlaceholder', 'Target URL *')}
              className="col-span-2 bg-white/5 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => void createSim()}
              disabled={saving || !simForm.name || !simForm.targetUrl}
              className="text-sm bg-primary/20 text-primary hover:bg-primary/30 disabled:opacity-50 px-3 py-1.5 rounded-md"
            >
              {saving ? T('webhooks.creating', 'Creating…') : T('webhooks.create', 'Create')}
            </button>
            <button onClick={() => setShowSimForm(false)} className="text-sm text-text-secondary hover:text-text-primary px-3 py-1.5">
              {T('common.cancel', 'Cancel')}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center text-text-secondary py-12">{T('webhooks.loading', 'Loading…')}</div>
      ) : tab === 'events' ? (
        events.length === 0 ? (
          <EmptyState message={T('webhooks.emptyEvents', 'No webhook events received yet. Send a request to /api/webhooks/receive/<endpoint> to capture events.')} />
        ) : (
          <div className="space-y-2">
            {events.map((ev) => (
              <div key={ev.id} className="bg-white/5 border border-white/10 rounded-lg">
                <div
                  className="p-4 flex items-center justify-between gap-4 cursor-pointer"
                  onClick={() => setSelectedEvent(selectedEvent?.id === ev.id ? null : ev)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-mono bg-blue-400/10 text-blue-400 px-1.5 py-0.5 rounded shrink-0">{ev.method}</span>
                    <span className="font-mono text-sm truncate">{ev.endpoint}</span>
                    {ev.verified && (
                      <span className="text-xs bg-green-400/10 text-green-400 px-1.5 py-0.5 rounded shrink-0">{T('webhooks.verified', '✓ verified')}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-text-secondary">{new Date(ev.receivedAt).toLocaleTimeString()}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); void replayEvent(ev.id); }}
                      className="flex items-center gap-1 text-xs text-text-secondary hover:text-primary"
                    >
                      <RotateCcw size={12} /> {T('webhooks.replay', 'Replay')}
                    </button>
                  </div>
                </div>
                {selectedEvent?.id === ev.id && (
                  <div className="border-t border-white/10 p-4">
                    <pre className="text-xs text-text-secondary overflow-auto max-h-48">{JSON.stringify(ev.body, null, 2)}</pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      ) : (
        simulations.length === 0 ? (
          <EmptyState message={T('webhooks.emptySimulations', 'No simulations yet. Create one to fire fake webhooks to external services.')} />
        ) : (
          <div className="space-y-3">
            {simulations.map((sim) => (
              <div key={sim.id} className="bg-white/5 border border-white/10 rounded-lg p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{sim.name}</span>
                    <span className="text-xs font-mono bg-blue-400/10 text-blue-400 px-1.5 py-0.5 rounded">{sim.method}</span>
                  </div>
                  <p className="text-text-secondary text-sm font-mono truncate">{sim.targetUrl}</p>
                </div>
                <button
                  onClick={() => void fireSim(sim.id, sim.name)}
                  className="flex items-center gap-1.5 text-sm bg-primary/20 text-primary hover:bg-primary/30 px-3 py-1.5 rounded-md shrink-0"
                >
                  <Zap size={13} /> {T('webhooks.fire', 'Fire')}
                </button>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
