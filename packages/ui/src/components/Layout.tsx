import { NavLink, Outlet } from 'react-router-dom';
import {
  FolderOpen, ScrollText, FlaskConical, Database,
  Camera, Layers, Webhook, ShieldAlert,
  BarChart2, ShieldCheck, Brain, LayoutTemplate,
} from 'lucide-react';
import { cn } from '../lib/utils';

type NavItem = { to: string; label: string; icon: React.ElementType; end?: boolean };
type NavGroup = { label: string; items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    label: 'Core',
    items: [
      { to: '/', label: 'Projects', icon: FolderOpen, end: true },
      { to: '/databases', label: 'Databases', icon: Database },
      { to: '/logs', label: 'Logs', icon: ScrollText },
    ],
  },
  {
    label: 'Mocking',
    items: [
      { to: '/scenarios', label: 'Scenarios', icon: Camera },
      { to: '/stateful', label: 'Stateful Mocks', icon: Layers },
      { to: '/templates', label: 'Templates', icon: LayoutTemplate },
      { to: '/webhooks', label: 'Webhooks', icon: Webhook },
    ],
  },
  {
    label: 'Quality',
    items: [
      { to: '/coverage', label: 'Coverage', icon: BarChart2 },
      { to: '/governance', label: 'Governance', icon: ShieldCheck },
      { to: '/chaos', label: 'Chaos', icon: ShieldAlert },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { to: '/intelligence', label: 'Intelligence', icon: Brain },
    ],
  },
];

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all focus:outline-none focus:ring-1 focus:ring-primary/30',
    isActive
      ? 'bg-primary/20 font-medium text-primary'
      : 'text-text-secondary hover:bg-white/8 hover:text-text-primary',
  );

export function Layout() {
  return (
    <div className="flex h-screen overflow-hidden bg-main-bg text-text-primary">
      <aside className="flex w-56 flex-shrink-0 flex-col border-r border-white/5 bg-sidebar">
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-5">
          <FlaskConical size={22} className="text-primary" />
          <span className="text-lg font-bold tracking-wide">Stubrix</span>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="px-3 mb-1 text-xs font-semibold uppercase tracking-wider text-text-secondary/50">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map(({ to, label, icon: Icon, end }) => (
                  <NavLink key={to} to={to} end={end} className={navLinkClass}>
                    <Icon size={16} />
                    {label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t border-white/10 px-4 py-3 text-xs text-text-secondary">
          v1.0.0
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
