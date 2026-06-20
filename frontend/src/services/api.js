import axios from 'axios';

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
        localStorage.setItem('sv_token', data.token);
        localStorage.setItem('sv_refresh', data.refreshToken);
        api.defaults.headers.common.Authorization = `Bearer ${data.token}`;

        refreshQueue.forEach(({ resolve }) => resolve(data.token));
        refreshQueue = [];

        original.headers.Authorization = `Bearer ${data.token}`;
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
