import { useState, useEffect, useCallback } from 'react';
import { Radio, Send, Plus, Zap } from 'lucide-react';
import { mockApi } from '../lib/mock-api.js';
import type { EventRecord, EventTemplate } from '../lib/mock-api.js';
import { InlineAlert } from '../components/InlineAlert.js';
import { EmptyState } from '../components/EmptyState.js';

type EventsPageProps = {
  t?: (key: string) => string;
  onNavigateBack?: () => void;
};

function interpolate(s: string, vars: Record<string, string | number>): string {
  return s.replace(/\{\{(\w+)\}\}/g, (_, k) => String(vars[k] ?? ''));
}

export function EventsPage({ t, onNavigateBack }: EventsPageProps) {
  const T = useCallback((key: string, fallback: string) => (t ? t(key) : fallback), [t]);
  const Tvars = (key: string, fallback: string, vars: Record<string, string | number>) => interpolate(T(key, fallback), vars);
  const [published, setPublished] = useState<EventRecord[]>([]);
  const [templates, setTemplates] = useState<EventTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [tab, setTab] = useState<'publish' | 'published' | 'templates'>('publish');
  const [kafkaOk, setKafkaOk] = useState<boolean | null>(null);
  const [rabbitOk, setRabbitOk] = useState<boolean | null>(null);

  const [pubForm, setPubForm] = useState({ broker: 'kafka', topic: '', payload: '{}' });
  const [publishing, setPublishing] = useState(false);

  const [tplForm, setTplForm] = useState({ name: '', broker: 'kafka', topic: '', payload: '{}' });
  const [savingTpl, setSavingTpl] = useState(false);
  const [showTplForm, setShowTplForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pub, tpl, h] = await Promise.all([
        mockApi.events.listPublished(50),
        mockApi.events.listTemplates(),
        mockApi.events.health(),
      ]);
      setPublished(pub);
      setTemplates(tpl);
      const health = h as { kafka?: { available?: boolean }; rabbitmq?: { available?: boolean } };
      setKafkaOk(health?.kafka?.available ?? false);
      setRabbitOk(health?.rabbitmq?.available ?? false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function publish() {
    if (!pubForm.topic) return;
    let payload: unknown;
    try { payload = JSON.parse(pubForm.payload); } catch { payload = pubForm.payload; }
    setPublishing(true);
    try {
      await mockApi.events.publish({ broker: pubForm.broker, topic: pubForm.topic, payload });
      setSuccess(T('events.published', 'Published'));
      void load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPublishing(false);
    }
  }

  async function saveTpl() {
    if (!tplForm.name || !tplForm.topic) return;
    let payload: unknown;
    try { payload = JSON.parse(tplForm.payload); } catch { payload = tplForm.payload; }
    setSavingTpl(true);
    try {
      await mockApi.events.createTemplate({ ...tplForm, payload });
      setSuccess(T('events.templateCreated', 'Template created'));
      setShowTplForm(false);
      void load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSavingTpl(false);
    }
  }

  async function fire(id: string, name: string) {
    try {
      await mockApi.events.fireTemplate(id);
      setSuccess(Tvars('events.firedSuccess', '"{{name}}" fired', { name }));
      void load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {onNavigateBack && (
            <button onClick={onNavigateBack} className="text-text-secondary hover:text-text-primary text-sm">{T('common.back', '← Back')}</button>
          )}
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Radio size={22} className="text-violet-400" /> {T('events.title', 'Events')}
            </h1>
            <p className="text-text-secondary text-sm">{T('events.subtitle', 'Publish Kafka and RabbitMQ events, manage templates')}</p>
          </div>
        </div>
        <div className="flex gap-2 text-xs">
          {kafkaOk !== null && (
            <span className={`px-2 py-1 rounded-full ${kafkaOk ? 'bg-green-400/10 text-green-400' : 'bg-red-400/10 text-red-400'}`}>
              {kafkaOk ? T('events.kafka', 'Kafka') : '○ Kafka'}
            </span>
          )}
          {rabbitOk !== null && (
            <span className={`px-2 py-1 rounded-full ${rabbitOk ? 'bg-green-400/10 text-green-400' : 'bg-red-400/10 text-red-400'}`}>
              {rabbitOk ? T('events.rabbitmq', 'RabbitMQ') : '○ RabbitMQ'}
            </span>
          )}
        </div>
      </div>

      {error && <InlineAlert message={error} onRetry={load} retryLabel={T('common.retry', 'Retry')} />}
      {success && (
        <div className="flex items-center gap-2 rounded-xl border border-green-500/20 bg-green-500/10 p-3 mb-4 text-sm text-green-300">
          {success}<button onClick={() => setSuccess(null)} className="ml-auto">✕</button>
        </div>
      )}

      <div className="flex gap-1 mb-6 bg-white/5 rounded-lg p-1 w-fit">
        {(['publish', 'published', 'templates'] as const).map((tabKey) => (
          <button key={tabKey} onClick={() => setTab(tabKey)}
            className={['px-4 py-1.5 rounded-md text-sm capitalize transition-colors',
              tab === tabKey ? 'bg-violet-400/20 text-violet-400' : 'text-text-secondary hover:text-text-primary'].join(' ')}>
            {tabKey === 'publish' ? T('events.publish', 'Publish') : tabKey === 'published' ? T('events.published', 'Published') : T('events.templates', 'Templates')}
          </button>
        ))}
      </div>

      {tab === 'publish' && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-5">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <select value={pubForm.broker} onChange={(e) => setPubForm({ ...pubForm, broker: e.target.value })}
              className="bg-white/5 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none">
              {['kafka', 'rabbitmq'].map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
            <input value={pubForm.topic} onChange={(e) => setPubForm({ ...pubForm, topic: e.target.value })}
              placeholder={T('events.topicPlaceholder', 'Topic / routing key *')}
              className="bg-white/5 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-violet-400" />
          </div>
          <textarea value={pubForm.payload} onChange={(e) => setPubForm({ ...pubForm, payload: e.target.value })}
            rows={6} placeholder={T('events.payloadPlaceholder', '{"event": "user.created", "userId": "123"}')}
            className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-violet-400 resize-none mb-3" />
          <button onClick={() => void publish()} disabled={publishing || !pubForm.topic}
            className="flex items-center gap-1.5 text-sm bg-violet-400/10 text-violet-400 hover:bg-violet-400/20 disabled:opacity-50 px-4 py-2 rounded-md">
            <Send size={13} /> {publishing ? T('events.publishing', 'Publishing…') : T('events.publishEvent', 'Publish Event')}
          </button>
        </div>
      )}

      {tab === 'published' && (
        loading ? <div className="text-center text-text-secondary py-12">{T('events.loading', 'Loading…')}</div>
          : published.length === 0 ? <EmptyState message={T('events.emptyPublished', 'No events published yet.')} />
            : (
              <div className="space-y-2">
                {published.map((ev) => (
                  <div key={ev.id} className="bg-white/5 border border-white/10 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xs bg-violet-400/10 text-violet-400 px-1.5 py-0.5 rounded">{ev.broker}</span>
                      <span className="font-mono text-sm">{ev.topic}</span>
                      <span className="text-xs text-text-secondary ml-auto">{new Date(ev.publishedAt).toLocaleTimeString()}</span>
                    </div>
                    <pre className="text-xs text-text-secondary overflow-auto max-h-24">{JSON.stringify(ev.payload as Record<string, unknown>, null, 2)}</pre>
                  </div>
                ))}
              </div>
            )
      )}

      {tab === 'templates' && (
        <>
          <div className="flex justify-end mb-4">
            <button onClick={() => setShowTplForm(true)}
              className="flex items-center gap-1.5 text-sm bg-violet-400/10 text-violet-400 hover:bg-violet-400/20 px-3 py-1.5 rounded-md">
              <Plus size={14} /> {T('events.newTemplate', 'New Template')}
            </button>
          </div>
          {showTplForm && (
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-4">
              <div className="grid grid-cols-2 gap-3 mb-3">
                <input value={tplForm.name} onChange={(e) => setTplForm({ ...tplForm, name: e.target.value })}
                  placeholder={T('events.templateNamePlaceholder', 'Template name *')}
                  className="bg-white/5 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-violet-400" />
                <select value={tplForm.broker} onChange={(e) => setTplForm({ ...tplForm, broker: e.target.value })}
                  className="bg-white/5 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none">
                  {['kafka', 'rabbitmq'].map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
                <input value={tplForm.topic} onChange={(e) => setTplForm({ ...tplForm, topic: e.target.value })}
                  placeholder={T('events.topicLabel', 'Topic *')}
                  className="col-span-2 bg-white/5 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-violet-400" />
              </div>
              <textarea value={tplForm.payload} onChange={(e) => setTplForm({ ...tplForm, payload: e.target.value })}
                rows={4} placeholder={T('events.templatePayloadPlaceholder', '{"event": "order.placed"}')}
                className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-violet-400 resize-none mb-3" />
              <div className="flex gap-2">
                <button onClick={() => void saveTpl()} disabled={savingTpl || !tplForm.name || !tplForm.topic}
                  className="text-sm bg-violet-400/10 text-violet-400 hover:bg-violet-400/20 disabled:opacity-50 px-3 py-1.5 rounded-md">
                  {savingTpl ? T('events.saving', 'Saving…') : T('events.save', 'Save')}
                </button>
                <button onClick={() => setShowTplForm(false)} className="text-sm text-text-secondary hover:text-text-primary px-3 py-1.5">{T('common.cancel', 'Cancel')}</button>
              </div>
            </div>
          )}
          {loading ? <div className="text-center text-text-secondary py-12">{T('events.loading', 'Loading…')}</div>
            : templates.length === 0 ? <EmptyState message={T('events.emptyTemplates', 'No event templates.')} />
              : (
                <div className="space-y-3">
                  {templates.map((tpl) => (
                    <div key={tpl.id} className="bg-white/5 border border-white/10 rounded-lg p-4 flex items-center justify-between gap-4">
                      <div>
                        <span className="font-medium">{tpl.name}</span>
                        <p className="text-text-secondary text-sm">{tpl.broker} → <span className="font-mono">{tpl.topic}</span></p>
                      </div>
                      <button onClick={() => void fire(tpl.id, tpl.name)}
                        className="flex items-center gap-1.5 text-sm bg-violet-400/10 text-violet-400 hover:bg-violet-400/20 px-3 py-1.5 rounded-md">
                        <Zap size={13} /> {T('events.fire', 'Fire')}
                      </button>
                    </div>
                  ))}
                </div>
              )}
        </>
      )}
    </div>
  );
}
