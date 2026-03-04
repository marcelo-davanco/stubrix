import { NavLink, Outlet } from "react-router-dom";
import { FolderOpen, ScrollText, FlaskConical } from "lucide-react";
import { cn } from "../lib/utils";

const navItems = [
  { to: "/", label: "Projects", icon: FolderOpen, end: true },
  { to: "/logs", label: "Logs", icon: ScrollText },
];

export function Layout() {
  return (
    <div className="flex h-screen overflow-hidden bg-main-bg text-text-primary">
      <aside className="w-56 flex-shrink-0 bg-sidebar flex flex-col">
        <div className="flex items-center gap-2 px-4 py-5 border-b border-white/10">
          <FlaskConical size={22} className="text-primary" />
          <span className="font-bold text-lg tracking-wide">Stubrix</span>
        </div>
        <nav className="flex-1 py-4 space-y-1 px-2">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                  isActive
                    ? "bg-primary/20 text-primary font-medium"
                    : "text-text-secondary hover:bg-white/5 hover:text-text-primary",
                )
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="px-4 py-3 border-t border-white/10 text-xs text-text-secondary">
          v1.0.0
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
