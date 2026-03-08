import { NavLink, Outlet } from 'react-router-dom';
import { FolderOpen, ScrollText, FlaskConical, Database } from 'lucide-react';
import { cn } from '../lib/utils';

const navItems = [
  { to: '/', label: 'Projects', icon: FolderOpen, end: true },
  { to: '/databases', label: 'Databases', icon: Database },
  { to: '/logs', label: 'Logs', icon: ScrollText },
];

export function Layout() {
  return (
    <div className="flex h-screen overflow-hidden bg-main-bg text-text-primary">
      <aside className="flex w-56 flex-shrink-0 flex-col border-r border-white/5 bg-sidebar">
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-5">
          <FlaskConical size={22} className="text-primary" />
          <span className="text-lg font-bold tracking-wide">Stubrix</span>
        </div>
        <nav className="flex-1 space-y-1 px-2 py-4">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all focus:outline-none focus:ring-1 focus:ring-primary/30',
                  isActive
                    ? 'bg-primary/20 font-medium text-primary'
                    : 'text-text-secondary hover:bg-white/8 hover:text-text-primary',
                )
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
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
