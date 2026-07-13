import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

function getInitialDark() {
  const saved = localStorage.getItem('sv_theme');
  if (saved) return saved === 'dark';
  // default light — matches SmartVet system aesthetic
  return false;
}

function applyTheme(dark) {
  document.documentElement.classList.toggle('dark', dark);
}

export function ThemeToggle() {
  const [dark, setDark] = useState(getInitialDark);

  useEffect(() => { applyTheme(dark); }, [dark]);

  useEffect(() => {
    // Apply on mount so SSR/hydration doesn't flicker
    applyTheme(getInitialDark());
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    applyTheme(next);
    localStorage.setItem('sv_theme', next ? 'dark' : 'light');
  }

  return (
    <button
      onClick={toggle}
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="p-1.5 rounded-lg border border-gray-200 text-gray-500
                 hover:text-green-700 hover:border-green-300 transition-colors"
    >
      {dark ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  );
}
