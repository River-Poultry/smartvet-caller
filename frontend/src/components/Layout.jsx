import { NavLink, Outlet } from 'react-router-dom';

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
      <aside className="w-60 bg-emerald-800 text-white flex flex-col shrink-0">
        <div className="px-4 py-5 border-b border-emerald-700">
          <h1 className="text-lg font-semibold">SmartVet</h1>
          <p className="text-xs text-emerald-200">Call Center Support</p>
        </div>
        <nav className="flex-1 py-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `block px-4 py-2.5 text-sm font-medium ${
                  isActive ? 'bg-emerald-900 text-white' : 'text-emerald-100 hover:bg-emerald-700'
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
