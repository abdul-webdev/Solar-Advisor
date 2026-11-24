import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  MessageSquare, FileText, BookOpen, Network, HelpCircle, Mail, Sun,
  LogOut, Settings, Menu, X, LayoutDashboard, SlidersHorizontal, Database,
  FlaskConical, Users, Cog, Activity,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const USER_NAV = [
  { to: '/advisor', label: 'Chat Advisor', icon: MessageSquare },
  { to: '/recommendations', label: 'My Recommendations', icon: FileText },
  { to: '/knowledge', label: 'Knowledge Base', icon: BookOpen },
  { to: '/how-it-works', label: 'How It Works', icon: Network },
  { to: '/faqs', label: 'FAQs', icon: HelpCircle },
  { to: '/contact', label: 'Contact', icon: Mail },
];

const ADMIN_NAV = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/knowledge', label: 'Knowledge management', icon: BookOpen },
  { to: '/admin/rules', label: 'Rule management', icon: SlidersHorizontal },
  { to: '/admin/equipment', label: 'Equipment database', icon: Database },
  { to: '/admin/test-rules', label: 'Test expert rules', icon: FlaskConical },
  { to: '/admin/traces', label: 'Inference traces', icon: Activity },
  { to: '/admin/users', label: 'User management', icon: Users },
  { to: '/admin/settings', label: 'System settings', icon: Cog },
];

function SidebarContent({ onNavigate }) {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const nav = isAdmin ? ADMIN_NAV : USER_NAV;

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="flex h-full flex-col">
      <div className="px-6 pb-2 pt-6">
        <div className="flex items-center gap-2.5">
          <Sun className="h-7 w-7 text-primary" />
          <span className="text-lg font-bold text-white">Solar Advisor</span>
        </div>
        <p className="mt-1.5 text-[13px] text-slate-400">Ask. Plan. Go Solar.</p>
        <p className="mt-6 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          {isAdmin ? 'Expert console' : 'Workspace'}
        </p>
      </div>

      <nav className="mt-3 flex-1 space-y-1 px-3">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors ${
                isActive ? 'bg-primary text-white' : 'text-slate-300 hover:bg-navy2 hover:text-white'
              }`
            }
          >
            <item.icon className="h-[18px] w-[18px] shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {!isAdmin && (
        <div className="mx-4 mb-4 rounded-xl bg-navy2 p-4">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-success/20">
            <span className="text-sm font-bold text-success">✓</span>
          </div>
          <p className="mt-2 text-[13px] font-semibold text-white">Built on expert knowledge</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">Transparent reasoning. Practical energy planning.</p>
        </div>
      )}

      <div className="border-t border-navy2 px-6 py-4">
        <p className="truncate text-sm font-semibold text-white">{user?.name}</p>
        <p className="text-xs text-slate-400">{isAdmin ? 'Solar expert · Administrator' : 'Personal account'}</p>
        {!isAdmin && (
          <button
            onClick={() => { onNavigate && onNavigate(); navigate('/account'); }}
            className="mt-3 flex items-center gap-2 text-[13px] text-slate-300 hover:text-white"
          >
            <Settings className="h-4 w-4" /> Account settings
          </button>
        )}
        <button onClick={handleLogout} className="mt-2.5 flex items-center gap-2 text-[13px] text-slate-300 hover:text-white">
          <LogOut className="h-4 w-4" /> Logout
        </button>
      </div>
    </div>
  );
}

export default function MainLayout() {
  const { user, isAdmin } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [crumb, setCrumb] = useState('Chat Advisor');

  return (
    <div className="flex min-h-screen bg-appbg">
      {/* Desktop sidebar */}
      <aside className="no-print fixed inset-y-0 left-0 z-40 hidden w-60 bg-navy lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-navy/60" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-navy">
            <button onClick={() => setMobileOpen(false)} className="absolute right-4 top-4 rounded-lg bg-navy2 p-2 text-white">
              <X className="h-5 w-5" />
            </button>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col lg:pl-60">
        {/* Top bar */}
        <header className="no-print sticky top-0 z-30 flex items-center justify-between border-b border-line bg-white px-4 py-3 sm:px-8">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="rounded-lg p-2 text-navy hover:bg-appbg lg:hidden">
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 text-[13px]">
              {isAdmin ? (
                <>
                  <span className="font-semibold text-navy">Solar Advisor</span>
                  <span className="text-muted">/ Expert workspace</span>
                </>
              ) : (
                <>
                  <span className="font-medium uppercase tracking-wide text-muted">Home energy</span>
                  <span className="text-muted">/</span>
                  <span className="font-medium text-navy">{crumb}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isAdmin ? (
              <span className="rounded-md bg-lightblue px-3 py-1.5 text-xs font-semibold text-primary">Administrator</span>
            ) : (
              <span className="flex items-center gap-2 text-[13px] font-medium text-success">
                <span className="h-2 w-2 rounded-full bg-success" /> Expert system online
              </span>
            )}
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-6 sm:px-8">
          <Outlet context={{ setCrumb }} />
        </main>

        <footer className="no-print px-8 pb-6 text-xs text-muted">
          Solar Advisor supports planning decisions. Always consult a qualified solar installer.
        </footer>
      </div>
    </div>
  );
}
