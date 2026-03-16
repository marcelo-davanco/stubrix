import { useState, useEffect, useCallback } from 'react';
import { Cloud, Plus, Send, RefreshCw } from 'lucide-react';
import { mockApi } from '../lib/mock-api.js';
import type { S3Bucket, SqsQueue } from '../lib/mock-api.js';
import { InlineAlert } from '../components/InlineAlert.js';
import { EmptyState } from '../components/EmptyState.js';

type CloudPageProps = {
  t?: (key: string) => string;
};

function interpolate(s: string, vars: Record<string, string | number>): string {
  return s.replace(/\{\{(\w+)\}\}/g, (_, k) => String(vars[k] ?? ''));
}

export function CloudPage({ t }: CloudPageProps) {
  const T = useCallback(
    (key: string, fallback: string) => (t ? t(key) : fallback),
    [t],
  );
  const Tvars = (
    key: string,
    fallback: string,
    vars: Record<string, string | number>,
  ) => interpolate(T(key, fallback), vars);
  const [buckets, setBuckets] = useState<S3Bucket[]>([]);
  const [queues, setQueues] = useState<SqsQueue[]>([]);
  const [config, setConfig] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [localstackOk, setLocalstackOk] = useState<boolean | null>(null);
  const [tab, setTab] = useState<'s3' | 'sqs' | 'sns' | 'config'>('s3');
  const [newBucket, setNewBucket] = useState('');
  const [creatingBucket, setCreatingBucket] = useState(false);
  const [snsForm, setSnsForm] = useState({
    topic: '',
    message: '',
    subject: '',
  });
  const [publishing, setPublishing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [b, q, h, cfg] = await Promise.all([
        mockApi.cloud.listBuckets(),
        mockApi.cloud.listQueues(),
        mockApi.cloud.health(),
        mockApi.cloud.config(),
      ]);
      setBuckets(b);
      setQueues(q);
      setLocalstackOk((h as { available?: boolean })?.available ?? false);
      setConfig(cfg);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createBucket() {
    if (!newBucket.trim()) return;
    setCreatingBucket(true);
    try {
      await mockApi.cloud.createBucket(newBucket.trim());
      setSuccess(
        Tvars('cloud.bucketCreated', 'Bucket "{{name}}" created', {
          name: newBucket,
        }),
      );
      setNewBucket('');
      void load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCreatingBucket(false);
    }
  }

  async function publishSns() {
    if (!snsForm.topic || !snsForm.message) return;
    setPublishing(true);
    try {
      await mockApi.cloud.publishSns(
        snsForm.topic,
        snsForm.message,
        snsForm.subject || undefined,
      );
      setSuccess(
        Tvars(
          'cloud.messagePublished',
          'Message published to SNS topic "{{topic}}"',
          { topic: snsForm.topic },
        ),
      );
      setSnsForm({ topic: '', message: '', subject: '' });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Cloud size={22} className="text-sky-400" />{' '}
              {T('cloud.title', 'Cloud (LocalStack)')}
            </h1>
            <p className="text-text-secondary text-sm">
              {T('cloud.subtitle', 'S3, SQS, SNS via LocalStack')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {localstackOk !== null && (
            <span
              className={`text-xs px-2 py-1 rounded-full ${localstackOk ? 'bg-green-400/10 text-green-400' : 'bg-red-400/10 text-red-400'}`}
            >
              {localstackOk
                ? T('cloud.localstackOk', '● LocalStack OK')
                : T('cloud.localstackUnavailable', '● LocalStack unavailable')}
            </span>
          )}
          <button
            onClick={load}
            className="p-2 rounded-md text-text-secondary hover:text-text-primary hover:bg-white/5"
          >
            <RefreshCw size={15} />
          </button>
        </div>
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

      <div className="flex gap-1 mb-6 bg-white/5 rounded-lg p-1 w-fit">
        {(['s3', 'sqs', 'sns', 'config'] as const).map((tabKey) => (
          <button
            key={tabKey}
            onClick={() => setTab(tabKey)}
            className={[
              'px-4 py-1.5 rounded-md text-sm uppercase transition-colors',
              tab === tabKey
                ? 'bg-sky-400/20 text-sky-400'
                : 'text-text-secondary hover:text-text-primary',
            ].join(' ')}
          >
            {tabKey}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center text-text-secondary py-12">
          {T('cloud.loading', 'Loading…')}
        </div>
      ) : tab === 's3' ? (
        <div>
          <div className="flex gap-2 mb-4">
            <input
              value={newBucket}
              onChange={(e) => setNewBucket(e.target.value)}
              placeholder={T('cloud.newBucketPlaceholder', 'New bucket name…')}
              className="flex-1 bg-white/5 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-sky-400"
              onKeyDown={(e) => e.key === 'Enter' && void createBucket()}
            />
            <button
              onClick={() => void createBucket()}
              disabled={creatingBucket || !newBucket.trim()}
              className="flex items-center gap-1.5 text-sm bg-sky-400/10 text-sky-400 hover:bg-sky-400/20 disabled:opacity-50 px-3 py-1.5 rounded-md"
            >
              <Plus size={14} />{' '}
              {creatingBucket
                ? T('cloud.creating', 'Creating…')
                : T('cloud.create', 'Create')}
            </button>
          </div>
          {buckets.length === 0 ? (
            <EmptyState
              message={T(
                'cloud.emptyBuckets',
                'No S3 buckets. Create one above.',
              )}
            />
          ) : (
            <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
              {buckets.map((b, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-4 py-3 border-b border-white/5 last:border-0"
                >
                  <Cloud size={14} className="text-sky-400 shrink-0" />
                  <span className="font-mono text-sm">{b.name}</span>
                  {b.createdAt && (
                    <span className="text-xs text-text-secondary ml-auto">
                      {new Date(b.createdAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : tab === 'sqs' ? (
        queues.length === 0 ? (
          <EmptyState
            message={T(
              'cloud.emptyQueues',
              'No SQS queues found in LocalStack.',
            )}
          />
        ) : (
          <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
            {queues.map((q, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-4 py-3 border-b border-white/5 last:border-0"
              >
                <span className="font-medium">{q.name}</span>
                <span className="text-xs text-text-secondary font-mono truncate ml-2">
                  {q.url}
                </span>
              </div>
            ))}
          </div>
        )
      ) : tab === 'sns' ? (
        <div className="bg-white/5 border border-white/10 rounded-lg p-5">
          <h3 className="font-medium mb-3 flex items-center gap-2">
            <Send size={14} /> {T('cloud.publishToSns', 'Publish to SNS')}
          </h3>
          <div className="space-y-3 mb-3">
            <input
              value={snsForm.topic}
              onChange={(e) =>
                setSnsForm({ ...snsForm, topic: e.target.value })
              }
              placeholder={T('cloud.topicPlaceholder', 'Topic ARN or name *')}
              className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-sky-400"
            />
            <input
              value={snsForm.subject}
              onChange={(e) =>
                setSnsForm({ ...snsForm, subject: e.target.value })
              }
              placeholder={T('cloud.subjectPlaceholder', 'Subject (optional)')}
              className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-sky-400"
            />
            <textarea
              value={snsForm.message}
              onChange={(e) =>
                setSnsForm({ ...snsForm, message: e.target.value })
              }
              rows={4}
              placeholder={T('cloud.messagePlaceholder', 'Message body *')}
              className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-sky-400 resize-none"
            />
          </div>
          <button
            onClick={() => void publishSns()}
            disabled={publishing || !snsForm.topic || !snsForm.message}
            className="flex items-center gap-1.5 text-sm bg-sky-400/10 text-sky-400 hover:bg-sky-400/20 disabled:opacity-50 px-4 py-2 rounded-md"
          >
            <Send size={13} />{' '}
            {publishing
              ? T('cloud.publishing', 'Publishing…')
              : T('cloud.publish', 'Publish')}
          </button>
        </div>
      ) : config !== null ? (
        <pre className="bg-white/5 border border-white/10 rounded-lg p-4 text-xs text-text-secondary overflow-auto max-h-96">
          {JSON.stringify(config as Record<string, unknown>, null, 2)}
        </pre>
      ) : (
        <div className="text-center text-text-secondary py-12">
          {T('cloud.noConfig', 'No configuration found')}
        </div>
      )}
    </div>
  );
}
