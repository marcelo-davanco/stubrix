import { useState, useEffect, useCallback } from 'react';
import { HardDrive, Upload, Archive, Link, Info } from 'lucide-react';
import { mockApi } from '../lib/mock-api.js';
import type { StoredMockBody } from '../lib/mock-api.js';
import { InlineAlert } from '../components/InlineAlert.js';

type StoragePageProps = {
  t?: (key: string) => string;
  onNavigateBack?: () => void;
};

export function StoragePage({ t, onNavigateBack }: StoragePageProps) {
  const T = useCallback((key: string, fallback: string) => (t ? t(key) : fallback), [t]);
  const [tab, setTab] = useState<'upload' | 'archive' | 'url' | 'config'>('upload');
  const [minioOk, setMinioOk] = useState<boolean | null>(null);
  const [config, setConfig] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [uploadForm, setUploadForm] = useState({ filename: '', content: '' });
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<StoredMockBody | null>(null);

  const [archiveForm, setArchiveForm] = useState({ snapshotPath: '', projectId: '' });
  const [archiving, setArchiving] = useState(false);

  const [urlForm, setUrlForm] = useState({ bucket: '', key: '' });
  const [urlResult, setUrlResult] = useState<string | null>(null);
  const [fetchingUrl, setFetchingUrl] = useState(false);

  useEffect(() => {
    void mockApi.storage.health().then((h) => {
      setMinioOk((h as { available?: boolean })?.available ?? false);
    }).catch(() => setMinioOk(false));
    void mockApi.storage.config().then(setConfig).catch(() => null);
  }, []);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadForm((f) => ({ ...f, filename: file.name }));
    const reader = new FileReader();
    reader.onload = (ev) => setUploadForm((f) => ({ ...f, content: ev.target?.result as string }));
    reader.readAsText(file);
  }

  async function upload() {
    if (!uploadForm.filename || !uploadForm.content) return;
    setUploading(true);
    setError(null);
    try {
      setUploadResult(await mockApi.storage.uploadBody(uploadForm.filename, uploadForm.content));
      setSuccess(T('storage.uploadedSuccess', 'Mock body uploaded to MinIO'));
      setUploadForm({ filename: '', content: '' });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function archive() {
    if (!archiveForm.snapshotPath || !archiveForm.projectId) return;
    setArchiving(true);
    setError(null);
    try {
      await mockApi.storage.archive(archiveForm.snapshotPath, archiveForm.projectId);
      setSuccess(T('storage.archivedSuccess', 'Snapshot archived to MinIO'));
      setArchiveForm({ snapshotPath: '', projectId: '' });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setArchiving(false);
    }
  }

  async function getUrl() {
    if (!urlForm.bucket || !urlForm.key) return;
    setFetchingUrl(true);
    setError(null);
    try {
      const res = await mockApi.storage.getUrl(urlForm.bucket, urlForm.key);
      setUrlResult(res.url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setFetchingUrl(false);
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {onNavigateBack && (
            <button onClick={onNavigateBack} className="text-text-secondary hover:text-text-primary text-sm">{T('common.back', '← Back')}</button>
          )}
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <HardDrive size={22} className="text-amber-400" /> {T('storage.title', 'Storage (MinIO)')}
            </h1>
            <p className="text-text-secondary text-sm">{T('storage.subtitle', 'Mock body files and snapshot archiving via MinIO')}</p>
          </div>
        </div>
        {minioOk !== null && (
          <span className={`text-xs px-2 py-1 rounded-full ${minioOk ? 'bg-green-400/10 text-green-400' : 'bg-red-400/10 text-red-400'}`}>
            {minioOk ? T('storage.minioOk', '● MinIO OK') : T('storage.minioUnavailable', '● MinIO unavailable')}
          </span>
        )}
      </div>

      {error && <InlineAlert message={error} />}
      {success && (
        <div className="flex items-center gap-2 rounded-xl border border-green-500/20 bg-green-500/10 p-3 mb-4 text-sm text-green-300">
          {success}<button onClick={() => setSuccess(null)} className="ml-auto">✕</button>
        </div>
      )}

      <div className="flex gap-1 mb-6 bg-white/5 rounded-lg p-1 w-fit">
        {(['upload', 'archive', 'url', 'config'] as const).map((tabKey) => (
          <button key={tabKey} onClick={() => setTab(tabKey)}
            className={['px-4 py-1.5 rounded-md text-sm capitalize transition-colors',
              tab === tabKey ? 'bg-amber-400/20 text-amber-400' : 'text-text-secondary hover:text-text-primary'].join(' ')}>
            {tabKey}
          </button>
        ))}
      </div>

      {tab === 'upload' && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-5">
          <h3 className="font-medium mb-3 flex items-center gap-2"><Upload size={14} /> {T('storage.uploadMockBody', 'Upload Mock Body')}</h3>
          <div className="mb-3">
            <label className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary cursor-pointer bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-md w-fit mb-2">
              <Upload size={13} /> {T('storage.chooseFile', 'Choose file')}
              <input type="file" onChange={onFileChange} className="hidden" />
            </label>
            {uploadForm.filename && <span className="text-xs text-amber-400">{uploadForm.filename} {T('storage.loaded', 'loaded')}</span>}
          </div>
          <input value={uploadForm.filename} onChange={(e) => setUploadForm({ ...uploadForm, filename: e.target.value })}
            placeholder={T('storage.filenamePlaceholder', 'Filename *')}
            className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-amber-400 mb-3" />
          <textarea value={uploadForm.content} onChange={(e) => setUploadForm({ ...uploadForm, content: e.target.value })}
            rows={6} placeholder={T('storage.contentPlaceholder', 'File content (JSON, XML, etc.)…')}
            className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-amber-400 resize-none mb-3" />
          <button onClick={() => void upload()} disabled={uploading || !uploadForm.filename || !uploadForm.content}
            className="flex items-center gap-1.5 text-sm bg-amber-400/10 text-amber-400 hover:bg-amber-400/20 disabled:opacity-50 px-4 py-2 rounded-md">
            <Upload size={13} /> {uploading ? T('storage.uploading', 'Uploading…') : T('storage.uploadToMinio', 'Upload to MinIO')}
          </button>
          {uploadResult !== null && (
            <div className="mt-3 p-3 bg-white/5 rounded text-xs text-text-secondary">
              <p>{T('storage.bucket', 'Bucket:')} <strong>{uploadResult.bucket}</strong></p>
              <p>{T('storage.key', 'Key:')} <code>{uploadResult.key}</code></p>
              <p>{T('storage.urlLabel', 'URL:')} <a href={uploadResult.url} target="_blank" rel="noopener noreferrer" className="text-amber-400 underline">{uploadResult.url}</a></p>
            </div>
          )}
        </div>
      )}

      {tab === 'archive' && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-5">
          <h3 className="font-medium mb-3 flex items-center gap-2"><Archive size={14} /> {T('storage.archiveSnapshot', 'Archive Snapshot')}</h3>
          <div className="space-y-3 mb-3">
            <input value={archiveForm.snapshotPath} onChange={(e) => setArchiveForm({ ...archiveForm, snapshotPath: e.target.value })}
              placeholder={T('storage.snapshotPathPlaceholder', 'Snapshot file path *')}
              className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-amber-400" />
            <input value={archiveForm.projectId} onChange={(e) => setArchiveForm({ ...archiveForm, projectId: e.target.value })}
              placeholder={T('storage.projectIdPlaceholder', 'Project ID *')}
              className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-amber-400" />
          </div>
          <button onClick={() => void archive()} disabled={archiving || !archiveForm.snapshotPath || !archiveForm.projectId}
            className="flex items-center gap-1.5 text-sm bg-amber-400/10 text-amber-400 hover:bg-amber-400/20 disabled:opacity-50 px-4 py-2 rounded-md">
            <Archive size={13} /> {archiving ? T('storage.archiving', 'Archiving…') : T('storage.archiveToMinio', 'Archive to MinIO')}
          </button>
        </div>
      )}

      {tab === 'url' && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-5">
          <h3 className="font-medium mb-3 flex items-center gap-2"><Link size={14} /> {T('storage.getPublicUrl', 'Get Public URL')}</h3>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <input value={urlForm.bucket} onChange={(e) => setUrlForm({ ...urlForm, bucket: e.target.value })}
              placeholder={T('storage.bucketPlaceholder', 'Bucket name *')}
              className="bg-white/5 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-amber-400" />
            <input value={urlForm.key} onChange={(e) => setUrlForm({ ...urlForm, key: e.target.value })}
              placeholder={T('storage.objectKeyPlaceholder', 'Object key *')}
              className="bg-white/5 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-amber-400" />
          </div>
          <button onClick={() => void getUrl()} disabled={fetchingUrl || !urlForm.bucket || !urlForm.key}
            className="flex items-center gap-1.5 text-sm bg-amber-400/10 text-amber-400 hover:bg-amber-400/20 disabled:opacity-50 px-4 py-2 rounded-md mb-3">
            <Link size={13} /> {fetchingUrl ? T('storage.gettingUrl', 'Getting URL…') : T('storage.getUrl', 'Get URL')}
          </button>
          {urlResult !== null && (
            <div className="p-3 bg-white/5 rounded text-sm">
              <a href={urlResult} target="_blank" rel="noopener noreferrer" className="text-amber-400 underline break-all">{urlResult}</a>
            </div>
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
            <Info size={16} /> {T('storage.noConfig', 'No MinIO configuration. Set MINIO_ENDPOINT in environment.')}
          </div>
        )
      )}
    </div>
  );
}
