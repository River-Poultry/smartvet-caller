import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

function getInitialTheme() {
  const saved = localStorage.getItem('sv_theme');
  if (saved) return saved === 'light';
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ?? false;
}

function applyTheme(light) {
  document.documentElement.classList.toggle('light', light);
}

export function ThemeToggle() {
  const [light, setLight] = useState(getInitialTheme);

  useEffect(() => { applyTheme(light); }, []);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const handler = (e) => {
      if (!localStorage.getItem('sv_theme')) {
        setLight(e.matches);
        applyTheme(e.matches);
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  function toggle() {
    const next = !light;
    setLight(next);
    applyTheme(next);
    localStorage.setItem('sv_theme', next ? 'light' : 'dark');
  }

  return (
    <button
      onClick={toggle}
      title={light ? 'Switch to dark mode' : 'Switch to light mode'}
      className="p-1.5 rounded-lg border border-sv-border text-gray-400
                 hover:text-sv-green hover:border-sv-green/40 transition-colors"
    >
      {light ? <Moon size={15} /> : <Sun size={15} />}
    </button>
  );
}
