import { useEffect, useState } from 'react';
import { ArrowLeft, Save } from 'lucide-react';
import { mockApi } from '../lib/mock-api.js';

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

type MockEditorPageProps = {
  projectId: string;
  mockId?: string;
  onBack?: () => void;
  onSaved?: () => void;
};

export function MockEditorPage({ projectId, mockId, onBack, onSaved }: MockEditorPageProps) {
  const isNew = !mockId;

  const [method, setMethod] = useState('GET');
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState(200);
  const [contentType, setContentType] = useState('application/json');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!mockId) return;
    void mockApi.mocks.get(projectId, mockId).then((mock) => {
      setMethod(mock.mapping.request.method);
      setUrl(mock.mapping.request.url ?? '');
      setStatus(mock.mapping.response.status);
      setContentType(mock.mapping.response.headers?.['Content-Type'] ?? 'application/json');
      setBody(mock.body ?? mock.mapping.response.body ?? '');
      setLoading(false);
    });
  }, [mockId, projectId]);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const dto = {
        request: { method, url },
        response: {
          status,
          headers: { 'Content-Type': contentType },
          body: body || undefined,
        },
      };
      if (isNew) {
        await mockApi.mocks.create(projectId, dto);
      } else {
        await mockApi.mocks.update(projectId, mockId, dto);
      }
      onSaved?.();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-text-secondary">
        Loading...
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="text-text-secondary hover:text-text-primary"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-2xl font-bold">{isNew ? 'New Mock' : 'Edit Mock'}</h1>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !url}
          className="flex items-center gap-2 bg-primary hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md text-sm font-medium"
        >
          <Save size={14} /> {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      <div className="space-y-4">
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <h3 className="text-sm font-medium mb-3 text-text-secondary uppercase tracking-wide">
            Request
          </h3>
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-text-secondary mb-1">Method</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary"
              >
                {HTTP_METHODS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div className="col-span-3">
              <label className="block text-xs text-text-secondary mb-1">URL</label>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="/api/endpoint"
                className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary font-mono"
              />
            </div>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <h3 className="text-sm font-medium mb-3 text-text-secondary uppercase tracking-wide">
            Response
          </h3>
          <div className="grid grid-cols-4 gap-3 mb-3">
            <div>
              <label className="block text-xs text-text-secondary mb-1">Status</label>
              <input
                type="number"
                value={status}
                onChange={(e) => setStatus(parseInt(e.target.value, 10))}
                className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <div className="col-span-3">
              <label className="block text-xs text-text-secondary mb-1">Content-Type</label>
              <input
                value={contentType}
                onChange={(e) => setContentType(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary font-mono"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">Body</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary font-mono resize-y"
              placeholder='{"key": "value"}'
            />
          </div>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-xs text-text-secondary font-mono">
          Preview: {method} http://localhost:8081{url || '/...'} → {status}
        </div>
      </div>
    </div>
  );
}
