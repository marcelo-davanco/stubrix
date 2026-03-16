import { useState } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Wifi,
  Loader2,
  X,
  Check,
  ChevronDown,
  ChevronUp,
  Power,
} from 'lucide-react';
import { useDbUiTranslation } from '../lib/i18n';
import type {
  ProjectDatabaseConfigItem,
  UpsertProjectDatabaseConfigPayload,
} from '../lib/db-api';
import { dbApi } from '../lib/db-api';

type ConfigFormState = UpsertProjectDatabaseConfigPayload & { id?: string };
type TestStatus = 'idle' | 'testing' | 'ok' | 'error';

type ProjectDatabaseConfigsProps = {
  projectId: string;
  configs: Array<ProjectDatabaseConfigItem>;
  onSave: (payload: UpsertProjectDatabaseConfigPayload) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onRefresh: () => void;
};

const EMPTY_FORM: ConfigFormState = {
  engine: 'postgres',
  name: '',
  database: '',
  host: '',
  port: '',
  username: '',
  password: '',
  filePath: '',
  notes: '',
};

const ENGINE_DEFAULTS: Record<string, Partial<ConfigFormState>> = {
  postgres: { host: 'localhost', port: '5432' },
  mysql: { host: 'localhost', port: '3306' },
  sqlite: { host: '', port: '' },
};

const ENGINE_STYLE: Record<string, { badge: string; icon: string }> = {
  postgres: {
    badge: 'bg-blue-500/15 text-blue-300 ring-1 ring-blue-500/30',
    icon: '🐘',
  },
  mysql: {
    badge: 'bg-orange-500/15 text-orange-300 ring-1 ring-orange-500/30',
    icon: '🐬',
  },
  sqlite: {
    badge: 'bg-teal-500/15 text-teal-300 ring-1 ring-teal-500/30',
    icon: '📁',
  },
};

const INPUT_CLASS =
  'w-full rounded-lg border border-white/10 bg-main-bg px-3.5 py-2.5 text-sm text-text-primary placeholder-white/20 outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/40';
const LABEL_CLASS = 'mb-1.5 block text-xs font-medium text-text-secondary';

function ConfigForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: ConfigFormState;
  onSave: (payload: UpsertProjectDatabaseConfigPayload) => Promise<void>;
  onCancel: () => void;
}) {
  const t = useDbUiTranslation();
  const [form, setForm] = useState<ConfigFormState>(initial);
  const [submitting, setSubmitting] = useState(false);
  const isSqlite = form.engine === 'sqlite';

  function set(patch: Partial<ConfigFormState>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  function handleEngineChange(engine: ConfigFormState['engine']) {
    set({ engine, ...ENGINE_DEFAULTS[engine] });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.name.trim()) return;
    setSubmitting(true);
    try {
      await onSave({
        engine: form.engine,
        name: form.name.trim(),
        database: form.database || undefined,
        host: form.host || undefined,
        port: form.port || undefined,
        username: form.username || undefined,
        password: form.password || undefined,
        filePath: form.filePath || undefined,
        notes: form.notes || undefined,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className={LABEL_CLASS}>{t('db.engine')}</label>
          <select
            value={form.engine}
            onChange={(e) =>
              handleEngineChange(e.target.value as ConfigFormState['engine'])
            }
            className={INPUT_CLASS}
          >
            <option value="postgres">PostgreSQL</option>
            <option value="mysql">MySQL</option>
            <option value="sqlite">SQLite</option>
          </select>
        </div>
        <div>
          <label className={LABEL_CLASS}>{t('db.connectionName')}</label>
          <input
            value={form.name}
            onChange={(e) => set({ name: e.target.value })}
            placeholder={t('db.connectionNamePlaceholder')}
            required
            className={INPUT_CLASS}
          />
        </div>
      </div>

      {isSqlite ? (
        <div>
          <label className={LABEL_CLASS}>{t('db.filePath')}</label>
          <input
            value={form.filePath}
            onChange={(e) => set({ filePath: e.target.value })}
            placeholder={t('db.filePathPlaceholder')}
            className={INPUT_CLASS}
          />
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <label className={LABEL_CLASS}>{t('db.host')}</label>
              <input
                value={form.host}
                onChange={(e) => set({ host: e.target.value })}
                placeholder="localhost"
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>{t('db.port')}</label>
              <input
                value={form.port}
                onChange={(e) => set({ port: e.target.value })}
                placeholder={form.engine === 'postgres' ? '5432' : '3306'}
                className={INPUT_CLASS}
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className={LABEL_CLASS}>{t('db.database')}</label>
              <input
                value={form.database}
                onChange={(e) => set({ database: e.target.value })}
                placeholder={t('db.databasePlaceholder')}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>{t('db.user')}</label>
              <input
                value={form.username}
                onChange={(e) => set({ username: e.target.value })}
                placeholder={t('db.userPlaceholder')}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>{t('db.password')}</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => set({ password: e.target.value })}
                placeholder="••••••••"
                className={INPUT_CLASS}
              />
            </div>
          </div>
        </>
      )}

      <div>
        <label className={LABEL_CLASS}>{t('db.notes')}</label>
        <input
          value={form.notes}
          onChange={(e) => set({ notes: e.target.value })}
          placeholder={t('db.notesPlaceholder')}
          className={INPUT_CLASS}
        />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting || !form.name.trim()}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-all hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Check size={14} />
          )}
          {submitting ? t('db.saving') : t('common.save')}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm text-text-secondary transition-colors hover:bg-surface-2 hover:text-text-primary focus:outline-none focus:ring-1 focus:ring-white/20"
        >
          <X size={14} /> {t('common.cancel')}
        </button>
      </div>
    </form>
  );
}

function ConfigCard({
  config,
  projectId,
  onEdit,
  onDelete,
  onRefresh,
}: {
  config: ProjectDatabaseConfigItem;
  projectId: string;
  onEdit: () => void;
  onDelete: () => void;
  onRefresh: () => void;
}) {
  const t = useDbUiTranslation();
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [testMessage, setTestMessage] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [toggling, setToggling] = useState(false);

  async function handleToggleEnabled() {
    setToggling(true);
    try {
      await dbApi.toggleProjectDatabaseConfig(projectId, config.id);
      onRefresh();
    } finally {
      setToggling(false);
    }
  }

  const persistedStatus = config.connectionStatus;
  const displayStatus: TestStatus =
    testStatus !== 'idle' ? testStatus : (persistedStatus as TestStatus);

  async function handleTest() {
    setTestStatus('testing');
    setTestMessage('');
    try {
      const result = await dbApi.testProjectDatabaseConfig(
        projectId,
        config.id,
      );
      setTestStatus(result.ok ? 'ok' : 'error');
      setTestMessage(result.message);
      onRefresh();
    } catch (err) {
      setTestStatus('error');
      setTestMessage(err instanceof Error ? err.message : t('db.unknownError'));
      onRefresh();
    }
  }

  const isSqlite = config.engine === 'sqlite';
  const style = ENGINE_STYLE[config.engine] ?? ENGINE_STYLE.sqlite;
  const connStr = isSqlite
    ? config.filePath || '—'
    : config.host
      ? `${config.host}:${config.port || '?'}`
      : '—';

  return (
    <div
      className={`overflow-hidden rounded-2xl border transition-all duration-200 ${
        !config.enabled
          ? 'border-white/5 bg-main-bg/60 opacity-70'
          : expanded
            ? 'border-white/15 bg-surface-2'
            : 'border-white/8 bg-main-bg hover:border-white/15'
      }`}
    >
      <div className="flex items-center gap-2.5 px-3.5 py-3">
        <span
          className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${style.badge}`}
        >
          {style.icon} {config.engine}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {displayStatus === 'ok' && (
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-green-400 shadow-[0_0_4px_theme(colors.green.400)]" />
            )}
            {displayStatus === 'error' && (
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
            )}
            {displayStatus !== 'ok' && displayStatus !== 'error' && (
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-white/20" />
            )}
            <p className="truncate text-sm font-medium leading-tight text-text-primary">
              {config.name}
            </p>
          </div>
          <p className="truncate font-mono text-xs text-text-secondary">
            {connStr}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={() => void handleToggleEnabled()}
            disabled={toggling}
            title={config.enabled ? 'Desativar conexão' : 'Ativar conexão'}
            className={`rounded-lg p-1.5 transition-colors disabled:opacity-40 ${
              config.enabled
                ? 'text-green-400 hover:bg-green-500/15 hover:text-green-300'
                : 'text-white/25 hover:bg-white/8 hover:text-text-secondary'
            }`}
          >
            {toggling ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Power size={13} />
            )}
          </button>
          <button
            type="button"
            onClick={() => void handleTest()}
            disabled={testStatus === 'testing' || !config.enabled}
            title={t('db.testConnection')}
            className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-white/8 hover:text-primary disabled:opacity-40"
          >
            {testStatus === 'testing' ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Wifi size={13} />
            )}
          </button>
          <button
            type="button"
            onClick={onEdit}
            title={t('db.edit')}
            className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-white/8 hover:text-text-primary"
          >
            <Pencil size={13} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            title={t('db.remove')}
            className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-red-500/15 hover:text-red-400"
          >
            <Trash2 size={13} />
          </button>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-white/8"
          >
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-white/8 bg-surface-1 px-4 py-3">
          <div className="grid gap-x-6 gap-y-2 text-xs md:grid-cols-2">
            {!isSqlite ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">{t('db.host')}</span>
                  <span className="font-mono text-text-primary">
                    {config.host || '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">{t('db.port')}</span>
                  <span className="font-mono text-text-primary">
                    {config.port || '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">{t('db.user')}</span>
                  <span className="font-mono text-text-primary">
                    {config.username || '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">
                    {t('db.database')}
                  </span>
                  <span className="font-mono text-text-primary">
                    {config.database || '—'}
                  </span>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-between md:col-span-2">
                <span className="text-text-secondary">{t('db.file')}</span>
                <span className="font-mono text-text-primary">
                  {config.filePath || '—'}
                </span>
              </div>
            )}
            {config.notes && (
              <div className="flex items-center justify-between md:col-span-2">
                <span className="text-text-secondary">{t('db.notes')}</span>
                <span className="text-text-primary">{config.notes}</span>
              </div>
            )}
            <div className="flex items-center justify-between pt-1 border-t border-white/5">
              <span className="text-text-secondary">{t('db.updated')}</span>
              <span className="text-white/40">
                {new Date(config.updatedAt).toLocaleString()}
              </span>
            </div>
            {config.connectionTestedAt && (
              <div className="flex items-center justify-between pt-1 border-t border-white/5">
                <span className="text-text-secondary">{t('db.lastTest')}</span>
                <span className="text-white/40">
                  {new Date(config.connectionTestedAt).toLocaleString('pt-BR')}
                </span>
              </div>
            )}
          </div>
          {testStatus === 'error' && testMessage && (
            <p className="mt-2 text-xs text-red-400">{testMessage}</p>
          )}
        </div>
      )}
    </div>
  );
}

export function ProjectDatabaseConfigs({
  projectId,
  configs,
  onSave,
  onDelete,
  onRefresh,
}: ProjectDatabaseConfigsProps) {
  const t = useDbUiTranslation();
  const [showForm, setShowForm] = useState(false);
  const [editingConfig, setEditingConfig] =
    useState<ProjectDatabaseConfigItem | null>(null);

  function handleEdit(config: ProjectDatabaseConfigItem) {
    setEditingConfig(config);
    setShowForm(true);
  }

  async function handleSave(payload: UpsertProjectDatabaseConfigPayload) {
    await onSave(payload);
    setShowForm(false);
    setEditingConfig(null);
  }

  function handleCancel() {
    setShowForm(false);
    setEditingConfig(null);
  }

  const formInitial: ConfigFormState = editingConfig
    ? {
        engine: editingConfig.engine,
        name: editingConfig.name,
        database: editingConfig.database ?? '',
        host: editingConfig.host ?? '',
        port: editingConfig.port ?? '',
        username: editingConfig.username ?? '',
        password: '',
        filePath: editingConfig.filePath ?? '',
        notes: editingConfig.notes ?? '',
      }
    : EMPTY_FORM;

  return (
    <div className="flex-1 rounded-2xl border border-white/10 bg-surface-1 p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">
            {t('db.projectConnections')}
          </h2>
          <p className="mt-0.5 text-xs text-text-secondary">
            {t('db.projectConnectionsDesc')}
          </p>
        </div>
        {!showForm && (
          <button
            type="button"
            onClick={() => {
              setEditingConfig(null);
              setShowForm(true);
            }}
            className="flex items-center gap-1.5 rounded-lg bg-primary/20 px-3 py-1.5 text-xs font-semibold text-primary transition-all hover:bg-primary/30 focus:outline-none focus:ring-1 focus:ring-primary/40"
          >
            <Plus size={13} strokeWidth={2.5} /> {t('db.newConnection')}
          </button>
        )}
      </div>

      {showForm && (
        <div className="mb-4 overflow-hidden rounded-2xl border border-primary/20 bg-surface-2">
          <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
            <p className="text-sm font-semibold text-text-primary">
              {editingConfig
                ? t('db.editConnection').replace('{{name}}', editingConfig.name)
                : t('db.newConnection')}
            </p>
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-lg p-1 text-text-secondary hover:bg-white/8"
            >
              <X size={14} />
            </button>
          </div>
          <div className="p-4">
            <ConfigForm
              initial={formInitial}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          </div>
        </div>
      )}

      {configs.length === 0 && !showForm ? (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-white/15 py-8 text-center transition-all hover:border-primary/40 hover:bg-primary/[0.04]"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-xl">
            🔌
          </div>
          <div>
            <p className="text-sm font-medium text-text-primary">
              {t('db.noConnectionsTitle')}
            </p>
            <p className="text-xs text-text-secondary">
              {t('db.noConnectionsDesc')}
            </p>
          </div>
        </button>
      ) : (
        <div className="space-y-2">
          {configs.map((config) => (
            <ConfigCard
              key={config.id}
              config={config}
              projectId={projectId}
              onEdit={() => handleEdit(config)}
              onDelete={() => void onDelete(config.id)}
              onRefresh={onRefresh}
            />
          ))}
        </div>
      )}
    </div>
  );
}
