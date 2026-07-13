import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import { logger } from '../config/logger.js';

const clients = new Map(); // agentId → Set<ws>

export function initWebSocket(server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url, 'http://localhost');
    const token = url.searchParams.get('token');

    let agentId;
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      agentId = payload.agentId;
    } catch {
      ws.close(1008, 'Unauthorized');
      return;
    }

    if (!clients.has(agentId)) clients.set(agentId, new Set());
    clients.get(agentId).add(ws);
    logger.debug('Agent WS connected', { agentId });

    ws.on('close', () => {
      clients.get(agentId)?.delete(ws);
      if (clients.get(agentId)?.size === 0) clients.delete(agentId);
    });

    ws.on('error', (err) => logger.warn('WS error', { agentId, error: err.message }));
  });

  return wss;
}

export function notifyAgent(agentId, event, data) {
  const sockets = clients.get(agentId);
  if (!sockets?.size) return;
  const message = JSON.stringify({ event, data, ts: Date.now() });
  for (const ws of sockets) {
    if (ws.readyState === 1) ws.send(message);
  }
}

export function broadcast(event, data) {
  const message = JSON.stringify({ event, data, ts: Date.now() });
  for (const sockets of clients.values()) {
    for (const ws of sockets) {
      if (ws.readyState === 1) ws.send(message);
    }
  }
}

export function getConnectedAgents() {
  return [...clients.keys()];
}
