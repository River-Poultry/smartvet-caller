import { useState, useEffect, useRef } from 'react';

export function useCallTimer(active) {
  const [seconds, setSeconds] = useState(0);
  const interval = useRef(null);

  useEffect(() => {
    if (active) {
      setSeconds(0);
      interval.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } else {
      clearInterval(interval.current);
      setSeconds(0);
    }
    return () => clearInterval(interval.current);
  }, [active]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}
