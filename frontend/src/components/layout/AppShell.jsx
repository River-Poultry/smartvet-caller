import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

function SidebarContent({ navSections, activeId, onNav, filter, setFilter, onClose }) {
  const filtered = filter
    ? navSections.map(s => ({
        ...s,
        items: s.items.filter(i => i.label.toLowerCase().includes(filter.toLowerCase())),
      })).filter(s => s.items.length > 0)
    : navSections;

  return (
    <aside className="w-52 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col h-full overflow-y-auto">
      <div className="px-3 py-2.5 border-b border-gray-200 flex-shrink-0">
        <input
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Start typing to filter..."
          className="w-full text-xs px-2.5 py-2 border border-gray-200 rounded bg-gray-50 text-gray-700 focus:outline-none focus:border-green-600 placeholder-gray-400"
        />
      </div>

      {filtered.map(section => (
        <div key={section.title}>
          <div className="bg-green-800 text-white text-xs font-bold uppercase tracking-wider px-3 py-1.5">
            {section.title}
          </div>
          {section.items.map(item => {
            const Icon = item.icon;
            const active = item.id === activeId;
            const cls = `flex items-center justify-between px-3 py-2 text-sm transition-colors w-full text-left ${
              active
                ? 'bg-amber-400 text-green-900 font-semibold'
                : 'text-gray-700 hover:bg-green-50 hover:text-green-800'
            }`;

            const inner = (
              <>
                <div className="flex items-center gap-2.5 min-w-0">
                  {Icon && <Icon size={13} className={active ? 'text-green-900' : 'text-gray-400'} />}
                  <span className="truncate">{item.label}</span>
                </div>
                {item.count > 0 && (
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ml-1 ${
                    active ? 'bg-green-900 text-amber-300' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {item.count}
                  </span>
                )}
              </>
            );

            if (item.href) {
              return (
                <Link key={item.id} to={item.href} className={cls} onClick={onClose}>
                  {inner}
                </Link>
              );
            }
            return (
              <button key={item.id} className={cls}
                onClick={() => { onNav?.(item.id); onClose?.(); }}>
                {inner}
              </button>
            );
          })}
        </div>
      ))}
    </aside>
  );
}

export function AppShell({ navSections = [], activeId, onNav, headerCenter, headerRight, children }) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">

      {/* ── Header ── */}
      <header className="bg-green-800 text-white px-4 py-2.5 flex items-center justify-between flex-shrink-0 z-30 sticky top-0 shadow-md">
        <div className="flex items-center gap-3">
          <button className="md:hidden text-white/80 hover:text-white p-1" aria-label="Open menu"
            onClick={() => setOpen(o => !o)}>
            <Menu size={20} />
          </button>
          <img src="/logo.png" alt="SmartVet" className="h-7 w-auto brightness-0 invert"
            onError={e => { e.currentTarget.src = '/logo.svg'; }} />
          <span className="font-extrabold text-white text-base tracking-tight hidden sm:block">
            SmartVet <span className="font-normal text-green-200">AI Call Centre</span>
          </span>
        </div>

        {headerCenter && (
          <div className="hidden md:block text-xs text-green-200 text-center">{headerCenter}</div>
        )}

        <div className="flex items-center gap-2">
          {headerRight}
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Mobile sidebar overlay */}
        {open && (
          <div className="fixed inset-0 z-40 md:hidden" onClick={() => setOpen(false)}>
            <div className="absolute inset-0 bg-black/40" />
            <div className="absolute left-0 top-0 bottom-0 z-50 flex flex-col shadow-2xl"
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-3 py-2 bg-green-900">
                <span className="text-white font-bold text-sm">Navigation</span>
                <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white p-1">
                  <X size={18} />
                </button>
              </div>
              <SidebarContent
                navSections={navSections} activeId={activeId} onNav={onNav}
                filter={filter} setFilter={setFilter} onClose={() => setOpen(false)}
              />
            </div>
          </div>
        )}

        {/* Desktop sidebar */}
        <div className="hidden md:flex flex-shrink-0">
          <SidebarContent
            navSections={navSections} activeId={activeId} onNav={onNav}
            filter={filter} setFilter={setFilter}
          />
        </div>

        {/* Main content */}
        <main className="flex-1 overflow-hidden flex flex-col min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
