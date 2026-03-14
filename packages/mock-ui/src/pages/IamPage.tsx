import { useState, useEffect } from 'react';
import { ShieldCheck, Key, Info } from 'lucide-react';
import { mockApi } from '../lib/mock-api.js';
import type { IamToken } from '../lib/mock-api.js';
import { InlineAlert } from '../components/InlineAlert.js';

type IamPageProps = { onNavigateBack?: () => void };

export function IamPage({ onNavigateBack }: IamPageProps) {
  const [tab, setTab] = useState<'token' | 'introspect' | 'config'>('token');
  const [keycloakOk, setKeycloakOk] = useState<boolean | null>(null);
  const [zitadelOk, setZitadelOk] = useState<boolean | null>(null);
  const [config, setConfig] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [creds, setCreds] = useState({ username: '', password: '' });
  const [token, setToken] = useState<IamToken | null>(null);
  const [loading, setLoading] = useState(false);

  const [introspectToken, setIntrospectToken] = useState('');
  const [introspectResult, setIntrospectResult] = useState<unknown>(null);
  const [introspecting, setIntrospecting] = useState(false);

  useEffect(() => {
    void mockApi.iam.health().then((h) => {
      const health = h as { keycloak?: { available?: boolean }; zitadel?: { available?: boolean } };
      setKeycloakOk(health?.keycloak?.available ?? false);
      setZitadelOk(health?.zitadel?.available ?? false);
    }).catch(() => { setKeycloakOk(false); setZitadelOk(false); });
    void mockApi.iam.config().then(setConfig).catch(() => null);
  }, []);

  async function getToken() {
    if (!creds.username || !creds.password) return;
    setLoading(true);
    setError(null);
    try {
      setToken(await mockApi.iam.getToken(creds.username, creds.password));
      setSuccess('Token obtained');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function getClientCredentials() {
    setLoading(true);
    setError(null);
    try {
      setToken(await mockApi.iam.clientCredentials());
      setSuccess('Client credentials token obtained');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function introspect() {
    if (!introspectToken.trim()) return;
    setIntrospecting(true);
    setError(null);
    try {
      setIntrospectResult(await mockApi.iam.introspect(introspectToken));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIntrospecting(false);
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {onNavigateBack && (
            <button onClick={onNavigateBack} className="text-text-secondary hover:text-text-primary text-sm">← Back</button>
          )}
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ShieldCheck size={22} className="text-emerald-400" /> IAM
            </h1>
            <p className="text-text-secondary text-sm">Keycloak and Zitadel identity management</p>
          </div>
        </div>
        <div className="flex gap-2 text-xs">
          {keycloakOk !== null && (
            <span className={`px-2 py-1 rounded-full ${keycloakOk ? 'bg-green-400/10 text-green-400' : 'bg-red-400/10 text-red-400'}`}>
              {keycloakOk ? '● Keycloak' : '○ Keycloak'}
            </span>
          )}
          {zitadelOk !== null && (
            <span className={`px-2 py-1 rounded-full ${zitadelOk ? 'bg-green-400/10 text-green-400' : 'bg-red-400/10 text-red-400'}`}>
              {zitadelOk ? '● Zitadel' : '○ Zitadel'}
            </span>
          )}
        </div>
      </div>

      {error && <InlineAlert message={error} />}
      {success && (
        <div className="flex items-center gap-2 rounded-xl border border-green-500/20 bg-green-500/10 p-3 mb-4 text-sm text-green-300">
          {success}<button onClick={() => setSuccess(null)} className="ml-auto">✕</button>
        </div>
      )}

      <div className="flex gap-1 mb-6 bg-white/5 rounded-lg p-1 w-fit">
        {(['token', 'introspect', 'config'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={['px-4 py-1.5 rounded-md text-sm capitalize transition-colors',
              tab === t ? 'bg-emerald-400/20 text-emerald-400' : 'text-text-secondary hover:text-text-primary'].join(' ')}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'token' && (
        <div className="space-y-4">
          <div className="bg-white/5 border border-white/10 rounded-lg p-5">
            <h3 className="font-medium mb-3 flex items-center gap-2"><Key size={14} /> Password Grant</h3>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <input value={creds.username} onChange={(e) => setCreds({ ...creds, username: e.target.value })}
                placeholder="Username" className="bg-white/5 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-emerald-400" />
              <input value={creds.password} onChange={(e) => setCreds({ ...creds, password: e.target.value })}
                type="password" placeholder="Password" className="bg-white/5 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-emerald-400" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => void getToken()} disabled={loading || !creds.username || !creds.password}
                className="text-sm bg-emerald-400/10 text-emerald-400 hover:bg-emerald-400/20 disabled:opacity-50 px-3 py-1.5 rounded-md">
                {loading ? 'Getting token…' : 'Get Token'}
              </button>
              <button onClick={() => void getClientCredentials()} disabled={loading}
                className="text-sm bg-white/5 hover:bg-white/10 text-text-secondary disabled:opacity-50 px-3 py-1.5 rounded-md">
                Client Credentials
              </button>
            </div>
          </div>

          {token !== null && (
            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Access Token</span>
                <button onClick={() => setToken(null)} className="text-text-secondary text-xs">✕</button>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-3 text-xs text-text-secondary">
                <span>Type: <strong className="text-text-primary">{token.token_type}</strong></span>
                <span>Expires: <strong className="text-text-primary">{token.expires_in}s</strong></span>
                {token.scope && <span>Scope: <strong className="text-text-primary">{token.scope}</strong></span>}
              </div>
              <textarea readOnly value={token.access_token} rows={4}
                className="w-full bg-white/5 rounded px-3 py-2 text-xs font-mono text-text-secondary resize-none focus:outline-none" />
            </div>
          )}
        </div>
      )}

      {tab === 'introspect' && (
        <div>
          <textarea value={introspectToken} onChange={(e) => setIntrospectToken(e.target.value)}
            rows={4} placeholder="Paste a JWT or opaque token to introspect…"
            className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-emerald-400 resize-none mb-3" />
          <button onClick={() => void introspect()} disabled={introspecting || !introspectToken.trim()}
            className="flex items-center gap-1.5 text-sm bg-emerald-400/10 text-emerald-400 hover:bg-emerald-400/20 disabled:opacity-50 px-4 py-2 rounded-md mb-4">
            <ShieldCheck size={13} /> {introspecting ? 'Introspecting…' : 'Introspect'}
          </button>
          {introspectResult !== null && (
            <pre className="bg-white/5 border border-white/10 rounded-lg p-4 text-xs text-text-secondary overflow-auto max-h-64">
              {JSON.stringify(introspectResult as Record<string, unknown>, null, 2)}
            </pre>
          )}
        </div>
      )}

      {tab === 'config' && (
        config !== null ? (
          <pre className="bg-white/5 border border-white/10 rounded-lg p-4 text-xs text-text-secondary overflow-auto max-h-96">
            {JSON.stringify(config as Record<string, unknown>, null, 2)}
          </pre>
        ) : (
          <div className="flex items-center gap-3 text-text-secondary text-sm p-4 bg-white/5 rounded-lg">
            <Info size={16} /> No IAM configuration found. Set KEYCLOAK_URL or ZITADEL_URL in environment.
          </div>
        )
      )}
    </div>
  );
}
