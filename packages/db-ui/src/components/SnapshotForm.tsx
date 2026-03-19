import { useEffect, useRef, useState } from 'react';
import { Camera, Loader2, ChevronDown, Plus, X } from 'lucide-react';
import { useDbUiTranslation } from '../lib/i18n';
import type { ProjectDatabaseConfigItem } from '../lib/db-api';

type SnapshotFormProps = {
  databases: Array<string>;
  loadingDatabases?: boolean;
  connections: Array<ProjectDatabaseConfigItem>;
  onSubmit: (payload: {
    label: string;
    database: string;
    category?: null | string;
    connectionId?: string;
  }) => Promise<void>;
  onConnectionChange?: (connectionId: string) => void;
};

const INPUT_CLASS =
  'w-full rounded-lg border border-white/10 bg-main-bg px-3.5 py-2.5 text-sm text-text-primary placeholder-white/20 outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/40';

const ENGINE_LABEL: Record<string, string> = {
  postgres: '🐘 Postgres',
  mysql: '🐬 MySQL',
  sqlite: '📁 SQLite',
  mongodb: '🍃 MongoDB',
};

const STATUS_DOT: Record<string, string> = {
  ok: 'bg-green-400 shadow-[0_0_4px_theme(colors.green.400)]',
  error: 'bg-red-400',
  unknown: 'bg-white/20',
};

const DEFAULT_CATEGORIES = [
  'backup',
  'staging',
  'production',
  'homolog',
  'dev',
  'teste',
  'release',
  'migration',
];
const STORAGE_KEY = 'stubrix:snapshot-categories';

function loadStoredCategories(): Array<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Array<string>) : [];
  } catch {
    return [];
  }
}

function saveStoredCategories(cats: Array<string>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cats));
  } catch {
    // ignore
  }
}

function CategoryCombobox({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const t = useDbUiTranslation();
  const [customCategories, setCustomCategories] =
    useState<Array<string>>(loadStoredCategories);
  const [open, setOpen] = useState(false);
  const [newValue, setNewValue] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const allOptions = [...new Set([...DEFAULT_CATEGORIES, ...customCategories])];

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleSelect(cat: string) {
    onChange(cat === value ? '' : cat);
    setOpen(false);
  }

  function handleAddNew() {
    const trimmed = newValue.trim().toLowerCase();
    if (!trimmed) return;
    if (!allOptions.includes(trimmed)) {
      const updated = [...customCategories, trimmed];
      setCustomCategories(updated);
      saveStoredCategories(updated);
    }
    onChange(trimmed);
    setNewValue('');
    setOpen(false);
  }

  function handleRemoveCustom(cat: string, e: React.MouseEvent) {
    e.stopPropagation();
    const updated = customCategories.filter((c) => c !== cat);
    setCustomCategories(updated);
    saveStoredCategories(updated);
    if (value === cat) onChange('');
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`${INPUT_CLASS} flex items-center justify-between gap-2 text-left ${
          value ? 'text-text-primary' : 'text-white/20'
        }`}
      >
        <span className="truncate">
          {value || t('db.categorySelectPlaceholder')}
        </span>
        <div className="flex shrink-0 items-center gap-1">
          {value && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              onKeyDown={(e) => e.key === 'Enter' && onChange('')}
              className="rounded p-0.5 text-white/30 hover:text-white/60"
            >
              <X size={11} />
            </span>
          )}
          <ChevronDown
            size={12}
            className={`text-text-secondary transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-white/10 bg-surface-2 shadow-xl">
          <div className="max-h-52 overflow-y-auto p-1.5">
            {allOptions.map((cat) => (
              <div
                key={cat}
                className={`group flex cursor-pointer items-center justify-between rounded-lg px-3 py-1.5 text-sm transition-colors ${
                  value === cat
                    ? 'bg-primary/20 text-primary'
                    : 'text-text-primary hover:bg-white/8'
                }`}
                onClick={() => handleSelect(cat)}
              >
                <span>{cat}</span>
                {customCategories.includes(cat) && (
                  <button
                    type="button"
                    onClick={(e) => handleRemoveCustom(cat, e)}
                    className="hidden rounded p-0.5 text-white/30 hover:text-red-400 group-hover:flex"
                  >
                    <X size={10} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="border-t border-white/8 p-1.5">
            <div className="flex gap-1.5">
              <input
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddNew()}
                placeholder={t('db.categoryNewPlaceholder')}
                className="flex-1 rounded-lg border border-white/10 bg-main-bg px-3 py-1.5 text-xs text-text-primary placeholder-white/20 outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={handleAddNew}
                disabled={!newValue.trim()}
                className="flex items-center gap-1 rounded-lg bg-primary/20 px-2.5 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/30 disabled:opacity-40"
              >
                <Plus size={11} /> {t('db.add')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function SnapshotForm({
  databases,
  loadingDatabases = false,
  connections,
  onSubmit,
  onConnectionChange,
}: SnapshotFormProps) {
  const t = useDbUiTranslation();
  const [label, setLabel] = useState('snapshot');
  const [database, setDatabase] = useState('');
  const [category, setCategory] = useState('');
  const [connectionId, setConnectionId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const enabledConnections = connections.filter((c) => c.enabled);

  useEffect(() => {
    if (enabledConnections.length > 0 && !connectionId) {
      const first = enabledConnections[0];
      setConnectionId(first.id);
      onConnectionChange?.(first.id);
      if (first.database) setDatabase(first.database);
    }
    if (
      connectionId &&
      !enabledConnections.find((c) => c.id === connectionId)
    ) {
      setConnectionId('');
      setDatabase('');
      onConnectionChange?.('');
    }
  }, [connections]);

  useEffect(() => {
    if (loadingDatabases) return;
    const conn = connections.find((c) => c.id === connectionId);
    const defaultDb = conn?.database ?? '';
    if (defaultDb && databases.includes(defaultDb)) {
      setDatabase(defaultDb);
    }
  }, [databases, loadingDatabases]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!database) return;
    setSubmitting(true);
    try {
      await onSubmit({
        label,
        database,
        category: category || null,
        connectionId: connectionId || undefined,
      });
      setLabel('snapshot');
      setDatabase('');
      setCategory('');
    } finally {
      setSubmitting(false);
    }
  }

  function handleSelectConnection(id: string) {
    setConnectionId(id);
    setDatabase('');
    onConnectionChange?.(id);
  }

  const selectedConn =
    enabledConnections.find((c) => c.id === connectionId) ?? null;

  return (
    <form
      onSubmit={handleSubmit}
      className="flex-1 rounded-2xl border border-white/10 bg-surface-1 p-5"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Camera size={15} />
          </div>
          <div>
            <h2 className="text-sm font-semibold leading-tight text-text-primary">
              {t('db.createSnapshot')}
            </h2>
            <p className="text-xs text-text-secondary">
              {t('db.createSnapshotDesc')}
            </p>
          </div>
        </div>
        <button
          type="submit"
          disabled={submitting || !database}
          className="flex shrink-0 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-all hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Camera size={14} />
          )}
          {submitting ? t('db.saving') : t('db.createSnapshotButton')}
        </button>
      </div>

      {connections.length > 0 && (
        <div className="mb-3">
          <label className="mb-1.5 block text-xs font-medium text-text-secondary">
            {t('db.connection')}
          </label>
          <div className="relative">
            <select
              value={connectionId}
              onChange={(e) => handleSelectConnection(e.target.value)}
              className="w-full appearance-none rounded-lg border border-white/10 bg-main-bg py-2.5 pl-3.5 pr-9 text-sm text-text-primary outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/40"
            >
              <option value="">— {t('db.default')} —</option>
              {enabledConnections.map((conn) => (
                <option key={conn.id} value={conn.id}>
                  {ENGINE_LABEL[conn.engine] ?? conn.engine} · {conn.name}
                  {conn.host ? ` (${conn.host}:${conn.port ?? '?'})` : ''}
                  {conn.database ? ` · ${conn.database}` : ''}
                </option>
              ))}
            </select>
            <ChevronDown
              size={13}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary"
            />
          </div>
          {selectedConn && (
            <div className="mt-1.5 flex items-center gap-2 text-xs text-text-secondary/70">
              <span
                className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[selectedConn.connectionStatus]}`}
              />
              {selectedConn.connectionStatus === 'ok'
                ? t('db.statusConnected')
                : selectedConn.connectionStatus === 'error'
                  ? t('db.statusError')
                  : t('db.statusUnknown')}
              {selectedConn.host && (
                <span className="font-mono opacity-60">
                  {selectedConn.host}:{selectedConn.port ?? '?'}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-secondary">
            {t('db.label')}
          </label>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={t('db.labelPlaceholder')}
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-secondary">
            {t('db.database')} *
            {loadingDatabases && (
              <Loader2
                size={11}
                className="ml-1.5 inline animate-spin text-text-secondary/60"
              />
            )}
          </label>
          <select
            value={database}
            onChange={(e) => setDatabase(e.target.value)}
            disabled={loadingDatabases}
            className={`${INPUT_CLASS} disabled:cursor-not-allowed disabled:opacity-50`}
          >
            <option value="">
              {loadingDatabases ? t('db.loading') : t('db.selectDatabase')}
            </option>
            {databases.map((db) => (
              <option key={db} value={db}>
                {db}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-secondary">
            {t('db.category')}{' '}
            <span className="font-normal text-white/25">
              {t('db.optional')}
            </span>
          </label>
          <CategoryCombobox value={category} onChange={setCategory} />
        </div>
      </div>

      {databases.length === 0 && (
        <p className="mt-2 text-xs text-text-secondary/60">
          {t('db.selectEngineHint')}
        </p>
      )}
    </form>
  );
}
