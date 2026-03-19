import { useState, useEffect, useCallback } from 'react';
import { Users, Plus, Trash2, Key, ClipboardList } from 'lucide-react';
import { mockApi } from '../lib/mock-api.js';
import type { AuthUser, AuditEntry } from '../lib/mock-api.js';
import { InlineAlert } from '../components/InlineAlert.js';
import { EmptyState } from '../components/EmptyState.js';

type AuthPageProps = {
  t?: (key: string) => string;
};

function interpolate(s: string, vars: Record<string, string | number>): string {
  return s.replace(/\{\{(\w+)\}\}/g, (_, k) => String(vars[k] ?? ''));
}

const ROLES = ['admin', 'editor', 'viewer'];

export function AuthPage({ t }: AuthPageProps) {
  const T = useCallback(
    (key: string, fallback: string) => (t ? t(key) : fallback),
    [t],
  );
  const Tvars = (
    key: string,
    fallback: string,
    vars: Record<string, string | number>,
  ) => interpolate(T(key, fallback), vars);
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [workspaces, setWorkspaces] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [tab, setTab] = useState<'users' | 'audit'>('users');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    username: '',
    email: '',
    role: 'viewer',
    workspaceId: '',
  });
  const [saving, setSaving] = useState(false);
  const [rotatedKey, setRotatedKey] = useState<{
    id: string;
    key: string;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [u, a, w] = await Promise.all([
        mockApi.auth.listUsers(),
        mockApi.auth.audit(undefined, 100),
        mockApi.auth.listWorkspaces(),
      ]);
      setUsers(u);
      setAudit(a);
      setWorkspaces(w);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createUser() {
    if (!form.username || !form.email) return;
    setSaving(true);
    try {
      await mockApi.auth.createUser({
        ...form,
        workspaceId: form.workspaceId || undefined,
      });
      setSuccess(T('auth.userCreated', 'User created'));
      setShowForm(false);
      setForm({ username: '', email: '', role: 'viewer', workspaceId: '' });
      void load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function rotateKey(id: string) {
    try {
      const res = await mockApi.auth.rotateKey(id);
      setRotatedKey({ id, key: res.apiKey });
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function deactivate(id: string, username: string) {
    if (
      !confirm(
        Tvars('auth.deactivateConfirm', 'Deactivate user "{{name}}"?', {
          name: username,
        }),
      )
    )
      return;
    try {
      await mockApi.auth.deactivate(id);
      setSuccess(T('auth.userDeactivated', 'User deactivated'));
      void load();
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
              <Users size={22} className="text-teal-400" />{' '}
              {T('auth.title', 'Auth & Users')}
            </h1>
            <p className="text-text-secondary text-sm">
              {T('auth.subtitle', 'User management, API keys and audit log')}
            </p>
          </div>
        </div>
        {tab === 'users' && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 text-sm bg-teal-400/10 text-teal-400 hover:bg-teal-400/20 px-3 py-1.5 rounded-md"
          >
            <Plus size={14} /> {T('auth.newUser', 'New User')}
          </button>
        )}
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
          <button onClick={() => setSuccess(null)} className="ml-auto">
            ✕
          </button>
        </div>
      )}

      {rotatedKey !== null && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-yellow-300">
              {T('auth.newApiKeyNotice', 'New API Key (copy now — shown once)')}
            </span>
            <button
              onClick={() => setRotatedKey(null)}
              className="text-yellow-400 text-xs"
            >
              ✕
            </button>
          </div>
          <code className="text-xs font-mono text-yellow-200 break-all">
            {rotatedKey.key}
          </code>
        </div>
      )}

      <div className="flex gap-1 mb-6 bg-white/5 rounded-lg p-1 w-fit">
        {(['users', 'audit'] as const).map((tabKey) => (
          <button
            key={tabKey}
            onClick={() => setTab(tabKey)}
            className={[
              'px-4 py-1.5 rounded-md text-sm capitalize transition-colors',
              tab === tabKey
                ? 'bg-teal-400/20 text-teal-400'
                : 'text-text-secondary hover:text-text-primary',
            ].join(' ')}
          >
            {tabKey === 'users'
              ? Tvars('auth.usersCount', 'Users ({{count}})', {
                  count: users.length,
                })
              : T('auth.auditLog', 'Audit Log')}
          </button>
        ))}
      </div>

      {tab === 'users' && showForm && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-6">
          <h3 className="font-medium mb-3">
            {T('auth.newUserTitle', 'New User')}
          </h3>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <input
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder={T('auth.usernamePlaceholder', 'Username *')}
              className="bg-white/5 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-teal-400"
            />
            <input
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder={T('auth.emailPlaceholder', 'Email *')}
              type="email"
              className="bg-white/5 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-teal-400"
            />
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="bg-white/5 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <select
              value={form.workspaceId}
              onChange={(e) =>
                setForm({ ...form, workspaceId: e.target.value })
              }
              className="bg-white/5 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none"
            >
              <option value="">
                {T('auth.defaultWorkspace', 'Default workspace')}
              </option>
              {workspaces.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => void createUser()}
              disabled={saving || !form.username || !form.email}
              className="text-sm bg-teal-400/10 text-teal-400 hover:bg-teal-400/20 disabled:opacity-50 px-3 py-1.5 rounded-md"
            >
              {saving
                ? T('auth.creating', 'Creating…')
                : T('auth.createUser', 'Create User')}
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

      {loading ? (
        <div className="text-center text-text-secondary py-12">
          {T('auth.loading', 'Loading…')}
        </div>
      ) : tab === 'users' ? (
        users.length === 0 ? (
          <EmptyState message={T('auth.emptyUsers', 'No users found.')} />
        ) : (
          <div className="space-y-2">
            {users.map((u) => (
              <div
                key={u.id}
                className="bg-white/5 border border-white/10 rounded-lg p-4 flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{u.username}</span>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded ${u.active ? 'bg-green-400/10 text-green-400' : 'bg-white/10 text-text-secondary'}`}
                    >
                      {u.active
                        ? T('auth.active', 'active')
                        : T('auth.inactive', 'inactive')}
                    </span>
                    <span className="text-xs bg-teal-400/10 text-teal-400 px-1.5 py-0.5 rounded">
                      {u.role}
                    </span>
                  </div>
                  <p className="text-text-secondary text-sm">{u.email}</p>
                  <p className="text-xs text-text-secondary">
                    {T('auth.workspaceLabel', 'workspace:')} {u.workspaceId}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => void rotateKey(u.id)}
                    title={T('auth.rotateApiKey', 'Rotate API Key')}
                    className="p-1.5 rounded-md text-text-secondary hover:text-teal-400 hover:bg-teal-400/10"
                  >
                    <Key size={14} />
                  </button>
                  <button
                    onClick={() => void deactivate(u.id, u.username)}
                    title={T('auth.deactivate', 'Deactivate')}
                    className="p-1.5 rounded-md text-red-400 hover:bg-red-400/10"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : audit.length === 0 ? (
        <EmptyState message={T('auth.emptyAudit', 'No audit entries yet.')} />
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2 border-b border-white/10 text-xs font-medium text-text-secondary">
            <ClipboardList size={13} />{' '}
            {Tvars('auth.auditLogEntries', 'Audit Log ({{count}} entries)', {
              count: audit.length,
            })}
          </div>
          {audit.map((entry) => (
            <div
              key={entry.id}
              className="px-4 py-3 border-b border-white/5 last:border-0 flex items-center gap-4"
            >
              <span className="text-xs text-text-secondary shrink-0 w-20">
                {new Date(entry.timestamp).toLocaleTimeString()}
              </span>
              <span className="text-xs bg-teal-400/10 text-teal-400 px-1.5 py-0.5 rounded shrink-0">
                {entry.action}
              </span>
              <span className="text-sm truncate">{entry.resource}</span>
              <span className="text-xs text-text-secondary shrink-0 font-mono">
                {entry.userId.slice(0, 8)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
