import { useState } from 'react';
import { mockApi } from '../lib/mock-api.js';
import { Field } from './Field.js';

type CreateProjectModalProps = {
  onClose: () => void;
  onCreate: () => void;
};

export function CreateProjectModal({ onClose, onCreate }: CreateProjectModalProps) {
  const [name, setName] = useState('');
  const [proxyTarget, setProxyTarget] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await mockApi.projects.create({
        name,
        proxyTarget: proxyTarget || undefined,
        description: description || undefined,
      });
      onCreate();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-[#1a1a2e] border border-white/10 rounded-xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold mb-4">New Project</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Name *">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My API"
              required
              className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary"
            />
          </Field>
          <Field label="Proxy Target">
            <input
              value={proxyTarget}
              onChange={(e) => setProxyTarget(e.target.value)}
              placeholder="https://api.example.com"
              className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary"
            />
          </Field>
          <Field label="Description">
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary"
            />
          </Field>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-md border border-white/10 text-sm hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2 rounded-md bg-primary text-white text-sm font-medium hover:bg-primary/80"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
