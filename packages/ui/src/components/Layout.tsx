import { NavLink, Outlet } from 'react-router-dom';
import {
  FolderOpen,
  ScrollText,
  FlaskConical,
  Database,
  Camera,
  Layers,
  Webhook,
  ShieldAlert,
  BarChart2,
  ShieldCheck,
  Brain,
  LayoutTemplate,
  GitBranch,
  Gauge,
  Network,
  Radio,
  Wifi,
  Users,
  ShieldCheck as IamIcon,
  FileCheck,
  Cloud,
  HardDrive,
  Settings,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useTranslation } from '../lib/i18n';

type NavItem = {
  to: string;
  labelKey: string;
  icon: React.ElementType;
  end?: boolean;
};
type NavGroup = { labelKey: string; items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    labelKey: 'nav.groupCore',
    items: [
      { to: '/', labelKey: 'nav.projects', icon: FolderOpen, end: true },
      { to: '/databases', labelKey: 'nav.databases', icon: Database },
      { to: '/logs', labelKey: 'nav.logs', icon: ScrollText },
    ],
  },
  {
    labelKey: 'nav.groupMocking',
    items: [
      { to: '/scenarios', labelKey: 'nav.scenarios', icon: Camera },
      { to: '/stateful', labelKey: 'nav.statefulMocks', icon: Layers },
      { to: '/templates', labelKey: 'nav.templates', icon: LayoutTemplate },
      { to: '/webhooks', labelKey: 'nav.webhooks', icon: Webhook },
    ],
  },
  {
    labelKey: 'nav.groupQuality',
    items: [
      { to: '/coverage', labelKey: 'nav.coverage', icon: BarChart2 },
      { to: '/governance', labelKey: 'nav.governance', icon: ShieldCheck },
      { to: '/chaos', labelKey: 'nav.chaosPanel', icon: ShieldAlert },
      { to: '/contracts', labelKey: 'nav.contracts', icon: FileCheck },
    ],
  },
  {
    labelKey: 'nav.groupIntelligence',
    items: [{ to: '/intelligence', labelKey: 'nav.intelligence', icon: Brain }],
  },
  {
    labelKey: 'nav.groupObservability',
    items: [
      { to: '/metrics', labelKey: 'nav.metrics', icon: BarChart2 },
      { to: '/tracing', labelKey: 'nav.tracing', icon: GitBranch },
      { to: '/performance', labelKey: 'nav.performance', icon: Gauge },
    ],
  },
  {
    labelKey: 'nav.groupProtocols',
    items: [
      { to: '/protocols', labelKey: 'nav.protocols', icon: Network },
      { to: '/events', labelKey: 'nav.events', icon: Radio },
      { to: '/chaos-network', labelKey: 'nav.networkChaos', icon: Wifi },
    ],
  },
  {
    labelKey: 'nav.groupEnterprise',
    items: [
      { to: '/auth', labelKey: 'nav.authUsers', icon: Users },
      { to: '/iam', labelKey: 'nav.iam', icon: IamIcon },
    ],
  },
  {
    labelKey: 'nav.groupCloud',
    items: [
      { to: '/cloud', labelKey: 'nav.cloudLocalStack', icon: Cloud },
      { to: '/storage', labelKey: 'nav.storageMinio', icon: HardDrive },
    ],
  },
  {
    labelKey: 'nav.groupSystem',
    items: [{ to: '/settings', labelKey: 'nav.settings', icon: Settings }],
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
  const { t } = useTranslation();
  return (
    <div className="flex h-screen overflow-hidden bg-main-bg text-text-primary">
      <aside className="flex w-56 flex-shrink-0 flex-col border-r border-white/5 bg-sidebar">
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-5">
          <FlaskConical size={22} className="text-primary" />
          <span className="text-lg font-bold tracking-wide">Stubrix</span>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
          {navGroups.map((group) => (
            <div key={group.labelKey}>
              <p className="px-3 mb-1 text-xs font-semibold uppercase tracking-wider text-text-secondary/50">
                {t(group.labelKey)}
              </p>
              <div className="space-y-0.5">
                {group.items.map(({ to, labelKey, icon: Icon, end }) => (
                  <NavLink key={to} to={to} end={end} className={navLinkClass}>
                    <Icon size={16} />
                    {t(labelKey)}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t border-white/10 px-4 py-3 text-xs text-text-secondary">
          v{__APP_VERSION__}
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
