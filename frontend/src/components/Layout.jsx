import { NavLink, Outlet } from 'react-router-dom';
import Logo from './Logo';

const navItems = [
  { to: '/', label: 'Dashboard' },
  { to: '/tickets', label: 'Cases' },
  { to: '/dispatch', label: 'Dispatch' },
  { to: '/paravets', label: 'Paravets' },
  { to: '/knowledge', label: 'Knowledge Base' },
  { to: '/assistant', label: 'AI Assistant' },
];

export default function Layout() {
  return (
    <div className="min-h-screen flex bg-gray-50">
      <aside className="w-60 bg-brand-cream flex flex-col shrink-0 border-r border-amber-200">
        <div className="px-4 py-5 border-b border-amber-200">
          <Logo />
        </div>
        <nav className="flex-1 py-4">
          {navItems.map((item) => (
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
      </aside>
      <main className="flex-1 p-6 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
