import { useEffect, useState } from 'react';
import { ArrowLeft, Plus, Search, Trash2, Pencil } from 'lucide-react';
import type { MockListItem } from '@stubrix/shared';
import { useMockManager } from '../hooks/useMockManager.js';
import { MockMethodBadge } from '../components/MockMethodBadge.js';
import { EmptyState } from '../components/EmptyState.js';

type MocksListPageProps = {
  t?: (key: string) => string;
  projectId: string;
  onBack?: () => void;
  onNavigateToNewMock?: (projectId: string) => void;
  onNavigateToEditMock?: (projectId: string, mockId: string) => void;
};

export function MocksListPage({
  t,
  projectId,
  onBack,
  onNavigateToNewMock,
  onNavigateToEditMock,
}: MocksListPageProps) {
  const T = (key: string, fallback: string) => (t ? t(key) : fallback);
  const { mocks, loading, deleteMock, loadMocks } = useMockManager(projectId);
  const [search, setSearch] = useState('');

  useEffect(() => {
    void loadMocks(projectId);
  }, [projectId]);

  const filtered = mocks.filter(
    (m: MockListItem) =>
      m.request.url.toLowerCase().includes(search.toLowerCase()) ||
      m.request.method.toLowerCase().includes(search.toLowerCase()),
  );

  const handleDelete = async (id: string) => {
    if (!confirm(T('mocksList.deleteConfirm', 'Delete this mock?'))) return;
    await deleteMock(projectId, id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-text-secondary">
        {T('mocksList.loading', 'Loading...')}
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="text-text-secondary hover:text-text-primary"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-bold">{T('mocksList.title', 'Mocks')}</h1>
            <p className="text-text-secondary text-sm">
              {projectId} · {mocks.length} {T('mocksList.mocksCount', 'mocks')}
            </p>
          </div>
        </div>
        <button
          onClick={() => onNavigateToNewMock?.(projectId)}
          className="flex items-center gap-2 bg-primary hover:bg-primary/80 text-white px-4 py-2 rounded-md text-sm font-medium"
        >
          <Plus size={16} /> {T('mocksList.newMock', 'New Mock')}
        </button>
      </div>

      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={T('mocksList.searchPlaceholder', 'Search by URL or method...')}
          className="w-full bg-white/5 border border-white/10 rounded-md pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-primary"
        />
      </div>

      <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            message={search ? T('mocksList.emptySearch', 'No mocks match your search.') : T('mocksList.empty', 'No mocks yet. Create your first mock.')}
          />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs text-text-secondary uppercase">
                <th className="px-4 py-3 w-20">{T('mocksList.method', 'Method')}</th>
                <th className="px-4 py-3">{T('mocksList.url', 'URL')}</th>
                <th className="px-4 py-3 w-20">{T('mocksList.status', 'Status')}</th>
                <th className="px-4 py-3 w-24">{T('mocksList.body', 'Body')}</th>
                <th className="px-4 py-3 w-24 text-right">{T('mocksList.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((mock: MockListItem) => (
                <tr
                  key={mock.id}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors"
                >
                  <td className="px-4 py-3">
                    <MockMethodBadge method={mock.request.method} />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-text-primary truncate max-w-xs">
                    {mock.request.url}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={[
                        'text-xs px-2 py-0.5 rounded font-semibold',
                        mock.response.status < 400
                          ? 'text-green-400 bg-green-400/10'
                          : 'text-red-400 bg-red-400/10',
                      ].join(' ')}
                    >
                      {mock.response.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-text-secondary">
                    {mock.response.hasBodyFile ? T('mocksList.bodyFile', 'file') : T('mocksList.bodyInline', 'inline')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => onNavigateToEditMock?.(projectId, mock.id)}
                        title={T('mocksList.edit', 'Edit')}
                        className="p-1.5 rounded hover:bg-white/10 text-text-secondary hover:text-text-primary"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(mock.id)}
                        title={T('common.delete', 'Delete')}
                        className="p-1.5 rounded hover:bg-red-400/20 text-text-secondary hover:text-red-400"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
