import { useState, useEffect, useRef } from 'react';

export function useCallTimer(active, paused = false) {
  const [seconds, setSeconds] = useState(0);
  const interval = useRef(null);

  useEffect(() => {
    if (!active) {
      clearInterval(interval.current);
      setSeconds(0);
      return;
    }
    // Active but on hold — freeze the counter
    if (paused) {
      clearInterval(interval.current);
      return;
    }
    // Active and running — tick every second
    interval.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval.current);
  }, [active, paused]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}
