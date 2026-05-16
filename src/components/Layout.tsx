import {
  BarChart3, Bell, CalendarDays, ChevronRight, Database, FileCheck,
  FileText, FolderKanban, HandCoins, IndianRupee, LayoutTemplate, LogOut,
  Monitor, Sprout, Users,
} from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

interface NavItem {
  to: string;
  icon: React.ReactNode;
  label: string;
  end?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Analytics',
    items: [
      { to: '/', icon: <BarChart3 size={15} />, label: 'Overview', end: true },
    ],
  },
  {
    title: 'Operations',
    items: [
      { to: '/projects',    icon: <FolderKanban size={15} />, label: 'Projects' },
      { to: '/crop-planner', icon: <CalendarDays size={15} />, label: 'Crop Planner' },
    ],
  },
  {
    title: 'Investors',
    items: [
      { to: '/payments', icon: <IndianRupee size={15} />, label: 'Payments' },
      { to: '/payouts',  icon: <HandCoins size={15} />,   label: 'Payouts' },
      { to: '/users',    icon: <Users size={15} />,        label: 'Users' },
      { to: '/kyc-approval', icon: <FileCheck size={15} />, label: 'KYC Approval' },
    ],
  },
  {
    title: 'Platform',
    items: [
      { to: '/distribution-groups', icon: <Users size={15} />,     label: 'Distribution' },
      { to: '/documents',           icon: <FileText size={15} />,   label: 'Documents' },
      { to: '/notifications',       icon: <Bell size={15} />,            label: 'Notifications' },
      { to: '/content',             icon: <LayoutTemplate size={15} />, label: 'App Content' },
    ],
  },
  {
    title: 'System',
    items: [
      { to: '/master-data', icon: <Database size={15} />, label: 'Master Data' },
    ],
  },
];

export function Layout() {
  const { user, logout } = useAuth();

  // Initials avatar
  const initials = (user?.full_name || user?.phone || 'A')
    .split(' ')
    .map((w: string) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        {/* Brand */}
        <div className="brand">
          <div className="brand-icon"><Sprout size={18} /></div>
          <div className="brand-text">
            <strong>InvestoFarms</strong>
            <span>Admin Console</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="nav-list">
          {NAV_SECTIONS.map(section => (
            <div key={section.title} className="nav-section">
              <span className="nav-section-title">{section.title}</span>
              {section.items.map(item => (
                <NavLink key={item.to} to={item.to} end={item.end}>
                  {item.icon}
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <div className="user-card">
            <div className="user-avatar">{initials}</div>
            <div className="user-info">
              <span>{user?.full_name || user?.phone || 'Admin'}</span>
              <strong>{user?.role?.toUpperCase()}</strong>
            </div>
          </div>
          <button className="logout-btn" onClick={logout}>
            <LogOut size={13} />
            Sign out
          </button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
