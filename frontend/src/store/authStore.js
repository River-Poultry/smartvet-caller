import { create } from 'zustand';
import api, { onTokenRefreshed } from '../services/api.js';
import { connectWS, disconnectWS } from '../services/websocket.js';

const stored = localStorage.getItem('sv_agent');

export const useAuthStore = create((set) => {
  onTokenRefreshed((token) => set({ token }));
  return {
  agent: stored ? JSON.parse(stored) : null,
  token: localStorage.getItem('sv_token') || null,
  loading: false,
  error: null,

  login: async (identifier, password) => {
    set({ loading: true, error: null });
    try {
      const { data } = await api.post('/auth/login', { identifier, password });
      localStorage.setItem('sv_token', data.token);
      localStorage.setItem('sv_refresh', data.refreshToken);
      localStorage.setItem('sv_agent', JSON.stringify(data.agent));
      try {
        connectWS(data.token);
      } catch (wsErr) {
        console.warn('WebSocket connection error (non-fatal):', wsErr);
      }
      set({ agent: data.agent, token: data.token, loading: false });
    } catch (err) {
      const message = err.response?.data?.error || err.message || 'Login failed';
      set({ error: message, loading: false });
      throw err;
    }
  },

  logout: async () => {
    try {
      const refreshToken = localStorage.getItem('sv_refresh');
      await api.post('/auth/logout', { refreshToken });
    } catch {}
    localStorage.removeItem('sv_token');
    localStorage.removeItem('sv_refresh');
    localStorage.removeItem('sv_agent');
    disconnectWS();
    set({ agent: null, token: null });
  },
};
});
