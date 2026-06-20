import axios from 'axios';
import { connectWS } from './websocket.js';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sv_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let refreshQueue = [];
let _onTokenRefreshed = null;

export function onTokenRefreshed(cb) {
  _onTokenRefreshed = cb;
}

api.interceptors.response.use(
  (r) => r,
  async (err) => {
    const original = err.config;

    if (err.response?.status === 401 && !original._retry) {
      const refreshToken = localStorage.getItem('sv_refresh');

      if (!refreshToken) {
        clearSession();
        return Promise.reject(err);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        });
      }

      original._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(
          `${api.defaults.baseURL}/auth/refresh`,
          { refreshToken }
        );
        const newToken = data.token;

        localStorage.setItem('sv_token', newToken);
        localStorage.setItem('sv_refresh', data.refreshToken);
        api.defaults.headers.common.Authorization = `Bearer ${newToken}`;

        _onTokenRefreshed?.(newToken);
        connectWS(newToken);

        refreshQueue.forEach(({ resolve }) => resolve(newToken));
        refreshQueue = [];

        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch {
        refreshQueue.forEach(({ reject }) => reject(err));
        refreshQueue = [];
        clearSession();
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(err);
  }
);

function clearSession() {
  localStorage.removeItem('sv_token');
  localStorage.removeItem('sv_refresh');
  localStorage.removeItem('sv_agent');
  window.location.href = '/login';
}

export default api;
