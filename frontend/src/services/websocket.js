let ws = null;
let reconnectTimer = null;
let reconnectDelay = 2000;
const MAX_DELAY = 30000;
const listeners = new Map();

export function connectWS(token) {
  if (ws?.readyState === WebSocket.OPEN || ws?.readyState === WebSocket.CONNECTING) return;
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }

  const wsBase = import.meta.env.VITE_WS_URL
    || `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`;
  ws = new WebSocket(`${wsBase}/ws?token=${token}`);

  ws.onopen = () => {
    reconnectDelay = 2000; // reset backoff on successful connection
  };

  ws.onmessage = (e) => {
    try {
      const { event, data } = JSON.parse(e.data);
      listeners.get(event)?.forEach((cb) => cb(data));
      listeners.get('*')?.forEach((cb) => cb({ event, data }));
    } catch {}
  };

  ws.onclose = () => {
    ws = null;
    const storedToken = localStorage.getItem('sv_token');
    if (!storedToken) return;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connectWS(localStorage.getItem('sv_token'));
    }, reconnectDelay);
    reconnectDelay = Math.min(reconnectDelay * 1.5, MAX_DELAY);
  };

  ws.onerror = () => {
    ws?.close();
  };
}

export function on(event, callback) {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event).add(callback);
  return () => listeners.get(event)?.delete(callback);
}

export function disconnectWS() {
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
  ws?.close();
  ws = null;
  listeners.clear();
}
