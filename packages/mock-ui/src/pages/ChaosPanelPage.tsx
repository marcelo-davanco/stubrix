import { useState, useEffect, useCallback } from 'react';
import { Zap, Plus, Trash2, ToggleLeft, ToggleRight, ShieldAlert } from 'lucide-react';
import { mockApi } from '../lib/mock-api.js';
import type { FaultProfile, ChaosPreset, CreateChaosProfileDto } from '../lib/mock-api.js';
import { InlineAlert } from '../components/InlineAlert.js';
import { EmptyState } from '../components/EmptyState.js';

type ChaosPanelPageProps = {
  onNavigateBack?: () => void;
};

export function ChaosPanelPage({ onNavigateBack }: ChaosPanelPageProps) {
  const [profiles, setProfiles] = useState<FaultProfile[]>([]);
  const [presets, setPresets] = useState<ChaosPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [tab, setTab] = useState<'profiles' | 'presets'>('profiles');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateChaosProfileDto>({
    name: '',
    faults: [{ type: 'delay', probability: 0.5, delayMs: 500 }],
  });
  const [saving, setSaving] = useState(false);
  const [urlPattern, setUrlPattern] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [p, pr] = await Promise.all([
        mockApi.chaos.listProfiles(),
        mockApi.chaos.listPresets(),
      ]);
      setProfiles(p);
      setPresets(pr);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function toggle(id: string, enabled: boolean) {
    try {
      await mockApi.chaos.toggleProfile(id, !enabled);
      setSuccess(`Profile ${!enabled ? 'enabled' : 'disabled'}`);
      void load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function remove(id: string, name: string) {
    if (!confirm(`Delete profile "${name}"?`)) return;
    try {
      await mockApi.chaos.deleteProfile(id);
      setSuccess('Deleted');
      void load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function create() {
    if (!form.name || form.faults.length === 0) return;
    setSaving(true);
    try {
      await mockApi.chaos.createProfile({ ...form, urlPattern: urlPattern || undefined });
      setSuccess('Profile created');
      setShowForm(false);
      setForm({ name: '', faults: [{ type: 'delay', probability: 0.5, delayMs: 500 }] });
      setUrlPattern('');
      void load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function applyPreset(presetId: string, name: string) {
    try {
      await mockApi.chaos.applyPreset(presetId);
      setSuccess(`Preset "${name}" applied as profile`);
      void load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function updateFault(index: number, field: string, value: unknown) {
    const faults = [...form.faults];
    faults[index] = { ...faults[index], [field]: value };
    setForm({ ...form, faults });
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
              <ShieldAlert size={22} className="text-yellow-400" /> Chaos Engineering
            </h1>
            <p className="text-text-secondary text-sm">Inject faults and test resilience</p>
          </div>
        </div>
        {tab === 'profiles' && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 text-sm bg-yellow-400/10 text-yellow-400 hover:bg-yellow-400/20 px-3 py-1.5 rounded-md"
          >
            <Plus size={14} /> New Profile
          </button>
        )}
      </div>

      {error && <InlineAlert message={error} onRetry={load} />}
      {success && (
        <div className="flex items-center gap-2 rounded-xl border border-green-500/20 bg-green-500/10 p-3 mb-4 text-sm text-green-300">
          {success}
          <button onClick={() => setSuccess(null)} className="ml-auto text-green-400 hover:text-green-300">✕</button>
        </div>
      )}

      <div className="flex gap-1 mb-6 bg-white/5 rounded-lg p-1 w-fit">
        {(['profiles', 'presets'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={[
              'px-4 py-1.5 rounded-md text-sm capitalize transition-colors',
              tab === t ? 'bg-yellow-400/20 text-yellow-400' : 'text-text-secondary hover:text-text-primary',
            ].join(' ')}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'profiles' && showForm && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-6">
          <h3 className="font-medium mb-3">New Fault Profile</h3>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Profile name *"
              className="bg-white/5 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow-400"
            />
            <input
              value={urlPattern}
              onChange={(e) => setUrlPattern(e.target.value)}
              placeholder="URL pattern (optional, e.g. /api/*)"
              className="bg-white/5 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow-400"
            />
          </div>

          <h4 className="text-sm font-medium mb-2">Fault Rules</h4>
          {form.faults.map((fault, i) => (
            <div key={i} className="grid grid-cols-4 gap-2 mb-2">
              <select
                value={fault.type}
                onChange={(e) => updateFault(i, 'type', e.target.value)}
                className="bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm focus:outline-none"
              >
                {['delay', 'error', 'timeout', 'disconnect'].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <input
                type="number"
                min={0}
                max={1}
                step={0.1}
                value={fault.probability}
                onChange={(e) => updateFault(i, 'probability', parseFloat(e.target.value))}
                placeholder="Probability (0–1)"
                className="bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm focus:outline-none"
              />
              {fault.type === 'delay' && (
                <input
                  type="number"
                  value={fault.delayMs ?? 500}
                  onChange={(e) => updateFault(i, 'delayMs', parseInt(e.target.value))}
                  placeholder="Delay (ms)"
                  className="bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm focus:outline-none"
                />
              )}
              {fault.type === 'error' && (
                <input
                  type="number"
                  value={fault.errorStatus ?? 500}
                  onChange={(e) => updateFault(i, 'errorStatus', parseInt(e.target.value))}
                  placeholder="HTTP status"
                  className="bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm focus:outline-none"
                />
              )}
              <button
                onClick={() => setForm({ ...form, faults: form.faults.filter((_, fi) => fi !== i) })}
                className="text-red-400 hover:text-red-300 text-xs"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            onClick={() => setForm({ ...form, faults: [...form.faults, { type: 'delay', probability: 0.3, delayMs: 200 }] })}
            className="text-xs text-text-secondary hover:text-text-primary mb-3"
          >
            + Add fault rule
          </button>

          <div className="flex gap-2">
            <button
              onClick={() => void create()}
              disabled={saving || !form.name}
              className="text-sm bg-yellow-400/10 text-yellow-400 hover:bg-yellow-400/20 disabled:opacity-50 px-3 py-1.5 rounded-md"
            >
              {saving ? 'Creating…' : 'Create Profile'}
            </button>
            <button onClick={() => setShowForm(false)} className="text-sm text-text-secondary hover:text-text-primary px-3 py-1.5">
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center text-text-secondary py-12">Loading…</div>
      ) : tab === 'profiles' ? (
        profiles.length === 0 ? (
          <EmptyState message="No fault profiles. Create one or apply a preset to start injecting faults." />
        ) : (
          <div className="space-y-3">
            {profiles.map((p) => (
              <div key={p.id} className="bg-white/5 border border-white/10 rounded-lg p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{p.name}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${p.enabled ? 'bg-yellow-400/10 text-yellow-400' : 'bg-white/10 text-text-secondary'}`}>
                      {p.enabled ? 'active' : 'disabled'}
                    </span>
                  </div>
                  {p.urlPattern && <p className="text-xs text-text-secondary font-mono">{p.urlPattern}</p>}
                  <p className="text-xs text-text-secondary mt-0.5">{p.faults.length} fault rule(s)</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => void toggle(p.id, p.enabled)}
                    className="p-1.5 rounded-md text-text-secondary hover:text-yellow-400 hover:bg-yellow-400/10"
                    title={p.enabled ? 'Disable' : 'Enable'}
                  >
                    {p.enabled ? <ToggleRight size={18} className="text-yellow-400" /> : <ToggleLeft size={18} />}
                  </button>
                  <button
                    onClick={() => void remove(p.id, p.name)}
                    className="p-1.5 rounded-md text-red-400 hover:bg-red-400/10"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        presets.length === 0 ? (
          <EmptyState message="No presets available." />
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {presets.map((preset) => (
              <div key={preset.id} className="bg-white/5 border border-white/10 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Zap size={14} className="text-yellow-400" />
                  <span className="font-medium">{preset.name}</span>
                </div>
                <p className="text-text-secondary text-sm mb-3">{preset.description}</p>
                <button
                  onClick={() => void applyPreset(preset.id, preset.name)}
                  className="text-sm bg-yellow-400/10 text-yellow-400 hover:bg-yellow-400/20 px-3 py-1.5 rounded-md"
                >
                  Apply Preset
                </button>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
