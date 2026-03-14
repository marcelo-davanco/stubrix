import { useState, useEffect, useCallback } from 'react';
import { Wifi, Plus, Trash2, Zap } from 'lucide-react';
import { mockApi } from '../lib/mock-api.js';
import type { ToxiProxy, Toxic } from '../lib/mock-api.js';
import { InlineAlert } from '../components/InlineAlert.js';
import { EmptyState } from '../components/EmptyState.js';

type ChaosNetworkPageProps = { onNavigateBack?: () => void };

export function ChaosNetworkPage({ onNavigateBack }: ChaosNetworkPageProps) {
  const [proxies, setProxies] = useState<ToxiProxy[]>([]);
  const [presets, setPresets] = useState<{ id: string; name: string; description: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [toxiproxyOk, setToxiproxyOk] = useState<boolean | null>(null);
  const [showProxyForm, setShowProxyForm] = useState(false);
  const [proxyForm, setProxyForm] = useState({ name: '', listen: '127.0.0.1:0', upstream: '' });
  const [savingProxy, setSavingProxy] = useState(false);
  const [expandedProxy, setExpandedProxy] = useState<string | null>(null);
  const [toxicForm, setToxicForm] = useState({ type: 'latency', stream: 'downstream' as 'upstream' | 'downstream', toxicity: 1.0, latency: 500, jitter: 100 });
  const [addingToxic, setAddingToxic] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, pr, h] = await Promise.all([
        mockApi.chaosNetwork.listProxies(),
        mockApi.chaosNetwork.listPresets(),
        mockApi.chaosNetwork.health(),
      ]);
      setProxies(p);
      setPresets(pr);
      setToxiproxyOk((h as { available?: boolean })?.available ?? false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function createProxy() {
    if (!proxyForm.name || !proxyForm.upstream) return;
    setSavingProxy(true);
    try {
      await mockApi.chaosNetwork.createProxy(proxyForm);
      setSuccess('Proxy created');
      setShowProxyForm(false);
      setProxyForm({ name: '', listen: '127.0.0.1:0', upstream: '' });
      void load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSavingProxy(false);
    }
  }

  async function deleteProxy(name: string) {
    if (!confirm(`Delete proxy "${name}"?`)) return;
    try {
      await mockApi.chaosNetwork.deleteProxy(name);
      setSuccess('Proxy deleted');
      void load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function addToxic(proxyName: string) {
    setAddingToxic(true);
    try {
      const attributes: Record<string, unknown> = {};
      if (toxicForm.type === 'latency') { attributes['latency'] = toxicForm.latency; attributes['jitter'] = toxicForm.jitter; }
      await mockApi.chaosNetwork.addToxic(proxyName, {
        type: toxicForm.type,
        stream: toxicForm.stream,
        toxicity: toxicForm.toxicity,
        attributes,
      });
      setSuccess(`Toxic added to ${proxyName}`);
      void load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setAddingToxic(false);
    }
  }

  async function removeToxic(proxyName: string, toxicName: string) {
    try {
      await mockApi.chaosNetwork.removeToxic(proxyName, toxicName);
      setSuccess('Toxic removed');
      void load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function applyPreset(proxyName: string, preset: string) {
    try {
      await mockApi.chaosNetwork.applyPreset(proxyName, preset);
      setSuccess(`Preset "${preset}" applied to ${proxyName}`);
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
              <Wifi size={22} className="text-red-400" /> Network Chaos
            </h1>
            <p className="text-text-secondary text-sm">Toxiproxy proxies and network fault injection</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {toxiproxyOk !== null && (
            <span className={`text-xs px-2 py-1 rounded-full ${toxiproxyOk ? 'bg-green-400/10 text-green-400' : 'bg-red-400/10 text-red-400'}`}>
              {toxiproxyOk ? '● Toxiproxy OK' : '● Toxiproxy unavailable'}
            </span>
          )}
          <button onClick={() => setShowProxyForm(true)}
            className="flex items-center gap-1.5 text-sm bg-red-400/10 text-red-400 hover:bg-red-400/20 px-3 py-1.5 rounded-md">
            <Plus size={14} /> New Proxy
          </button>
        </div>
      </div>

      {error && <InlineAlert message={error} onRetry={load} />}
      {success && (
        <div className="flex items-center gap-2 rounded-xl border border-green-500/20 bg-green-500/10 p-3 mb-4 text-sm text-green-300">
          {success}<button onClick={() => setSuccess(null)} className="ml-auto">✕</button>
        </div>
      )}

      {showProxyForm && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-6">
          <h3 className="font-medium mb-3">New Toxiproxy Proxy</h3>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <input value={proxyForm.name} onChange={(e) => setProxyForm({ ...proxyForm, name: e.target.value })}
              placeholder="Proxy name *" className="bg-white/5 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-red-400" />
            <input value={proxyForm.listen} onChange={(e) => setProxyForm({ ...proxyForm, listen: e.target.value })}
              placeholder="Listen addr" className="bg-white/5 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-red-400" />
            <input value={proxyForm.upstream} onChange={(e) => setProxyForm({ ...proxyForm, upstream: e.target.value })}
              placeholder="Upstream (host:port) *" className="bg-white/5 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-red-400" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => void createProxy()} disabled={savingProxy || !proxyForm.name || !proxyForm.upstream}
              className="text-sm bg-red-400/10 text-red-400 hover:bg-red-400/20 disabled:opacity-50 px-3 py-1.5 rounded-md">
              {savingProxy ? 'Creating…' : 'Create Proxy'}
            </button>
            <button onClick={() => setShowProxyForm(false)} className="text-sm text-text-secondary hover:text-text-primary px-3 py-1.5">Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center text-text-secondary py-12">Loading…</div>
      ) : proxies.length === 0 ? (
        <EmptyState message="No Toxiproxy proxies. Create one to start injecting network faults." />
      ) : (
        <div className="space-y-4">
          {proxies.map((proxy) => (
            <div key={proxy.name} className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
              <div className="p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{proxy.name}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${proxy.enabled ? 'bg-green-400/10 text-green-400' : 'bg-white/10 text-text-secondary'}`}>
                      {proxy.enabled ? 'enabled' : 'disabled'}
                    </span>
                  </div>
                  <p className="text-text-secondary text-xs font-mono mt-0.5">{proxy.listen} → {proxy.upstream}</p>
                  <p className="text-xs text-text-secondary">{proxy.toxics.length} toxic(s)</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => setExpandedProxy(expandedProxy === proxy.name ? null : proxy.name)}
                    className="text-xs text-text-secondary hover:text-red-400 px-2 py-1.5 bg-white/5 rounded-md">
                    {expandedProxy === proxy.name ? 'Close' : 'Manage'}
                  </button>
                  <button onClick={() => void deleteProxy(proxy.name)}
                    className="p-1.5 rounded-md text-red-400 hover:bg-red-400/10"><Trash2 size={14} /></button>
                </div>
              </div>

              {expandedProxy === proxy.name && (
                <div className="border-t border-white/10 p-4 space-y-4">
                  {proxy.toxics.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Active Toxics</h4>
                      <div className="space-y-2">
                        {proxy.toxics.map((t: Toxic) => (
                          <div key={t.name} className="flex items-center justify-between bg-white/5 rounded p-2 text-sm">
                            <span className="font-mono">{t.name}</span>
                            <span className="text-text-secondary">{t.type} · {t.stream} · {(t.toxicity * 100).toFixed(0)}%</span>
                            <button onClick={() => void removeToxic(proxy.name, t.name)}
                              className="text-xs text-red-400 hover:text-red-300">Remove</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <h4 className="text-sm font-medium mb-2">Add Toxic</h4>
                    <div className="grid grid-cols-4 gap-2 mb-2">
                      <select value={toxicForm.type} onChange={(e) => setToxicForm({ ...toxicForm, type: e.target.value })}
                        className="bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm focus:outline-none">
                        {['latency', 'bandwidth', 'slow_close', 'timeout', 'slicer', 'limit_data'].map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                      <select value={toxicForm.stream} onChange={(e) => setToxicForm({ ...toxicForm, stream: e.target.value as 'upstream' | 'downstream' })}
                        className="bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm focus:outline-none">
                        <option value="downstream">downstream</option>
                        <option value="upstream">upstream</option>
                      </select>
                      {toxicForm.type === 'latency' && (
                        <>
                          <input type="number" value={toxicForm.latency} onChange={(e) => setToxicForm({ ...toxicForm, latency: parseInt(e.target.value) })}
                            placeholder="Latency ms" className="bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm focus:outline-none" />
                          <input type="number" value={toxicForm.jitter} onChange={(e) => setToxicForm({ ...toxicForm, jitter: parseInt(e.target.value) })}
                            placeholder="Jitter ms" className="bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm focus:outline-none" />
                        </>
                      )}
                    </div>
                    <button onClick={() => void addToxic(proxy.name)} disabled={addingToxic}
                      className="text-sm bg-red-400/10 text-red-400 hover:bg-red-400/20 disabled:opacity-50 px-3 py-1.5 rounded-md">
                      {addingToxic ? 'Adding…' : 'Add Toxic'}
                    </button>
                  </div>

                  {presets.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Apply Preset</h4>
                      <div className="flex flex-wrap gap-2">
                        {presets.map((p) => (
                          <button key={p.id} onClick={() => void applyPreset(proxy.name, p.id)}
                            className="flex items-center gap-1 text-xs bg-white/5 hover:bg-red-400/10 hover:text-red-400 px-2.5 py-1.5 rounded-md">
                            <Zap size={11} /> {p.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
