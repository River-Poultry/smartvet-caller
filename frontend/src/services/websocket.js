let ws = null;
const listeners = new Map();

export function connectWS(token) {
  if (ws?.readyState === WebSocket.OPEN) return;

  // VITE_WS_URL overrides for cross-domain production deployments (e.g. Vercel + Railway)
  const wsBase = import.meta.env.VITE_WS_URL
    || `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`;
  ws = new WebSocket(`${wsBase}/ws?token=${token}`);

  ws.onmessage = (e) => {
    try {
      const { event, data } = JSON.parse(e.data);
      listeners.get(event)?.forEach((cb) => cb(data));
      listeners.get('*')?.forEach((cb) => cb({ event, data }));
    } catch {}
  };

  ws.onclose = () => {
    // Reconnect after 3s if we still have a token
    if (localStorage.getItem('sv_token')) {
      setTimeout(() => connectWS(localStorage.getItem('sv_token')), 3000);
    }
  };
}

export function on(event, callback) {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event).add(callback);
  return () => listeners.get(event)?.delete(callback);
}

export function disconnectWS() {
  ws?.close();
  ws = null;
  listeners.clear();
}
