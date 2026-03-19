import { cn } from '../../lib/utils';

const CATEGORY_LABELS: Record<string, string> = {
  mock_engines: 'Mock Engines',
  databases: 'Databases',
  db_viewers: 'DB Viewers',
  cloud: 'Cloud',
  storage: 'Storage',
  iam: 'IAM',
  observability: 'Observability',
  tracing: 'Tracing',
  events: 'Events',
  protocols: 'Protocols',
  contracts: 'Contracts',
  chaos: 'Chaos',
  ai: 'AI / Intelligence',
  api_clients: 'API Clients',
};

export interface ServiceOption {
  serviceId: string;
  name: string;
  category: string;
}

interface ServiceSelectorProps {
  services: ServiceOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  counts?: Record<string, number>;
}

export function ServiceSelector({
  services,
  selected,
  onChange,
  counts,
}: ServiceSelectorProps) {
  const byCategory = services.reduce<Record<string, ServiceOption[]>>(
    (acc, svc) => {
      if (!acc[svc.category]) acc[svc.category] = [];
      acc[svc.category].push(svc);
      return acc;
    },
    {},
  );

  const allSelected = selected.length === services.length;

  const toggleAll = () => {
    onChange(allSelected ? [] : services.map((s) => s.serviceId));
  };

  const toggle = (id: string) => {
    onChange(
      selected.includes(id)
        ? selected.filter((s) => s !== id)
        : [...selected, id],
    );
  };

  return (
    <div className="border border-white/10 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
      <label className="flex items-center gap-3 px-3 py-2.5 border-b border-white/10 cursor-pointer hover:bg-white/5 transition-colors">
        <input
          type="checkbox"
          checked={allSelected}
          onChange={toggleAll}
          className="accent-primary"
        />
        <span className="text-sm font-medium">Select All</span>
      </label>
      {Object.entries(byCategory).map(([cat, svcs]) => (
        <div key={cat}>
          <p className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-text-secondary/50 bg-white/3">
            {CATEGORY_LABELS[cat] ?? cat}
          </p>
          {svcs.map((svc) => (
            <label
              key={svc.serviceId}
              className={cn(
                'flex items-center justify-between px-3 py-2 cursor-pointer transition-colors hover:bg-white/5',
              )}
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selected.includes(svc.serviceId)}
                  onChange={() => toggle(svc.serviceId)}
                  className="accent-primary"
                />
                <span className="text-sm">{svc.name}</span>
              </div>
              {counts?.[svc.serviceId] !== undefined && (
                <span className="text-xs text-text-secondary">
                  ({counts[svc.serviceId]} changes)
                </span>
              )}
            </label>
          ))}
        </div>
      ))}
    </div>
  );
}
