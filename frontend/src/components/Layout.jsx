import { NavLink, Outlet } from 'react-router-dom';
import Logo from './Logo';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/analytics', label: 'Analytics', roles: ['super_admin', 'admin'] },
  { to: '/', label: 'Dashboard', hidden: ['super_admin'] },
  { to: '/tickets', label: 'Cases', hidden: ['super_admin'] },
  { to: '/calls', label: 'Calls', hidden: ['super_admin'] },
  { to: '/dispatch', label: 'Dispatch', hidden: ['super_admin'] },
  { to: '/paravets', label: 'Paravets', hidden: ['super_admin'] },
  { to: '/assistant', label: 'AI Assistant', hidden: ['super_admin'] },
  { to: '/recordings', label: 'Call Recordings', hidden: ['super_admin', 'vetboard'] },
  { to: '/vetboard', label: 'VSB Reviews', roles: ['vetboard', 'admin', 'supervisor', 'super_admin'] },
  { to: '/users', label: 'User Accounts', roles: ['admin', 'super_admin'] },
];

const ROLE_LABELS = {
  super_admin: 'Super Administrator',
  admin: 'Administrator',
  supervisor: 'Supervisor',
  agent: 'Agent / Dispatcher',
  paravet: 'Paravet',
  vetboard: 'Vet Science Board',
};

export default function Layout() {
  const { user, logout } = useAuth();

  const visibleItems = navItems.filter((item) => {
    if (item.roles && !item.roles.includes(user?.role)) return false;
    if (item.hidden && item.hidden.includes(user?.role)) return false;
    return true;
  });

  return (
    <div className="min-h-screen flex bg-gray-50">
      <aside className="w-60 bg-brand-cream flex flex-col shrink-0 border-r border-amber-200">
        <div className="px-4 py-5 border-b border-amber-200">
          <Logo />
        </div>
        <nav className="flex-1 py-4">
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `block px-4 py-2.5 text-sm font-medium border-l-4 ${
                  isActive
                    ? 'bg-white border-brand-red text-brand-navy'
                    : 'border-transparent text-brand-navy/70 hover:bg-white/60'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-4 py-3 border-t border-amber-200">
          <p className="text-sm font-medium text-brand-navy truncate">{user?.name}</p>
          <p className="text-xs text-brand-navy/60 mb-2">{ROLE_LABELS[user?.role] || user?.role}</p>
          <button onClick={logout} className="text-xs font-medium text-brand-red hover:underline">
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 p-6 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
