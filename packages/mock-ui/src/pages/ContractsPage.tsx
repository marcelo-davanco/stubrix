import { useState, useEffect, useCallback } from 'react';
import { FileCheck, Search, CheckCircle, XCircle } from 'lucide-react';
import { mockApi } from '../lib/mock-api.js';
import type { PactContract } from '../lib/mock-api.js';
import { InlineAlert } from '../components/InlineAlert.js';
import { EmptyState } from '../components/EmptyState.js';

type ContractsPageProps = { onNavigateBack?: () => void };

export function ContractsPage({ onNavigateBack }: ContractsPageProps) {
  const [contracts, setContracts] = useState<PactContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pactBrokerOk, setPactBrokerOk] = useState<boolean | null>(null);
  const [canDeployForm, setCanDeployForm] = useState({ pacticipant: '', version: '' });
  const [deployResult, setDeployResult] = useState<{ deployable: boolean; reason: string } | null>(null);
  const [checking, setChecking] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [c, h] = await Promise.all([mockApi.contracts.list(), mockApi.contracts.health()]);
      setContracts(c);
      setPactBrokerOk((h as { available?: boolean })?.available ?? false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function checkDeploy() {
    if (!canDeployForm.pacticipant || !canDeployForm.version) return;
    setChecking(true);
    setDeployResult(null);
    setError(null);
    try {
      setDeployResult(await mockApi.contracts.canIDeploy(canDeployForm.pacticipant, canDeployForm.version));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setChecking(false);
    }
  }

  const filtered = contracts.filter((c) =>
    search === '' || c.consumer.includes(search) || c.provider.includes(search),
  );

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {onNavigateBack && (
            <button onClick={onNavigateBack} className="text-text-secondary hover:text-text-primary text-sm">← Back</button>
          )}
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileCheck size={22} className="text-lime-400" /> Contracts
            </h1>
            <p className="text-text-secondary text-sm">Pact consumer-driven contract testing</p>
          </div>
        </div>
        {pactBrokerOk !== null && (
          <span className={`text-xs px-2 py-1 rounded-full ${pactBrokerOk ? 'bg-green-400/10 text-green-400' : 'bg-red-400/10 text-red-400'}`}>
            {pactBrokerOk ? '● Pact Broker OK' : '● Pact Broker unavailable'}
          </span>
        )}
      </div>

      {error && <InlineAlert message={error} onRetry={load} />}

      <div className="bg-white/5 border border-white/10 rounded-lg p-5 mb-6">
        <h3 className="font-medium mb-3 flex items-center gap-2"><Search size={14} /> Can I Deploy?</h3>
        <div className="flex gap-3 mb-3">
          <input value={canDeployForm.pacticipant} onChange={(e) => setCanDeployForm({ ...canDeployForm, pacticipant: e.target.value })}
            placeholder="Pacticipant name *" className="flex-1 bg-white/5 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-lime-400" />
          <input value={canDeployForm.version} onChange={(e) => setCanDeployForm({ ...canDeployForm, version: e.target.value })}
            placeholder="Version *" className="flex-1 bg-white/5 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-lime-400" />
          <button onClick={() => void checkDeploy()} disabled={checking || !canDeployForm.pacticipant || !canDeployForm.version}
            className="flex items-center gap-1.5 text-sm bg-lime-400/10 text-lime-400 hover:bg-lime-400/20 disabled:opacity-50 px-4 py-2 rounded-md">
            {checking ? 'Checking…' : 'Check'}
          </button>
        </div>
        {deployResult !== null && (
          <div className={`flex items-center gap-3 p-3 rounded-lg ${deployResult.deployable ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
            {deployResult.deployable
              ? <CheckCircle size={16} className="text-green-400 shrink-0" />
              : <XCircle size={16} className="text-red-400 shrink-0" />}
            <span className={`text-sm ${deployResult.deployable ? 'text-green-300' : 'text-red-300'}`}>
              {deployResult.deployable ? 'Safe to deploy' : 'Not safe to deploy'} — {deployResult.reason}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by consumer or provider…"
            className="w-full bg-white/5 border border-white/10 rounded pl-8 pr-3 py-2 text-sm focus:outline-none focus:border-lime-400" />
        </div>
        <span className="text-sm text-text-secondary">{filtered.length} contract(s)</span>
      </div>

      {loading ? (
        <div className="text-center text-text-secondary py-12">Loading…</div>
      ) : filtered.length === 0 ? (
        <EmptyState message="No pact contracts found. Configure Pact Broker URL to load contracts." />
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-white/10">
              <tr>
                <th className="text-left px-4 py-2 text-text-secondary font-medium">Consumer</th>
                <th className="text-left px-4 py-2 text-text-secondary font-medium">Provider</th>
                <th className="text-left px-4 py-2 text-text-secondary font-medium">Version</th>
                <th className="text-left px-4 py-2 text-text-secondary font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                  <td className="px-4 py-3 font-medium">{c.consumer}</td>
                  <td className="px-4 py-3">{c.provider}</td>
                  <td className="px-4 py-3 font-mono text-xs">{c.version}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${c.status === 'verified' ? 'bg-green-400/10 text-green-400' : 'bg-yellow-400/10 text-yellow-400'}`}>
                      {c.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
