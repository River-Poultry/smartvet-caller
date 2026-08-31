function getApiBaseUrl() {
  let raw = import.meta.env.VITE_API_BASE_URL;
  if (!raw) {
    if (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')) {
      return 'https://smartvet-callcenter-api.onrender.com/api';
    }
    return '/api';
  }
  return raw.replace('smartvet-caller.onrender.com', 'smartvet-callcenter-api.onrender.com');
}

const API_BASE_URL = getApiBaseUrl();

let authToken = null;

export function setAuthToken(token) {
  authToken = token;
}

async function request(path, options = {}) {
  const isFormData = options.body instanceof FormData;
  const headers = isFormData ? {} : { 'Content-Type': 'application/json' };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers,
    ...options,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const error = new Error(data.error || `Request failed: ${response.status}`);
    error.status = response.status;
    error.code = data.code;
    throw error;
  }

  if (response.status === 204) return null;
  return response.json();
}

export const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');

export const api = {
  // Auth
  login: (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  getMe: () => request('/auth/me'),

  // Users (admin only)
  getUsers: () => request('/users'),
  createUser: (data) => request('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id, data) => request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: (id) => request(`/users/${id}`, { method: 'DELETE' }),

  // Tickets
  getTickets: (status) => request(`/tickets${status ? `?status=${status}` : ''}`),
  getTicket: (id) => request(`/tickets/${id}`),
  createTicket: (data) => request('/tickets', { method: 'POST', body: JSON.stringify(data) }),
  updateTicket: (id, data) => request(`/tickets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTicket: (id) => request(`/tickets/${id}`, { method: 'DELETE' }),

  // Paravets
  getParavets: (status) => request(`/paravets${status ? `?status=${status}` : ''}`),
  createParavet: (data) => request('/paravets', { method: 'POST', body: JSON.stringify(data) }),
  updateParavet: (id, data) => request(`/paravets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Dispatch
  getDispatches: () => request('/dispatch'),
  createDispatch: (data) => request('/dispatch', { method: 'POST', body: JSON.stringify(data) }),
  updateDispatch: (id, data) => request(`/dispatch/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // AI
  getAiStatus: () => request('/ai/status'),
  askAi: (question, context) => request('/ai/ask', { method: 'POST', body: JSON.stringify({ question, context }) }),
  summarizeTranscript: (transcript, ticket_id, recording_id) =>
    request('/ai/summarize', { method: 'POST', body: JSON.stringify({ transcript, ticket_id, recording_id }) }),

  // Recordings
  getRecordings: (ticket_id) => request(`/recordings${ticket_id ? `?ticket_id=${ticket_id}` : ''}`),
  getRecording: (id) => request(`/recordings/${id}`),
  uploadRecording: (formData) => request('/recordings', { method: 'POST', body: formData }),
  updateRecording: (id, data) => request(`/recordings/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteRecording: (id) => request(`/recordings/${id}`, { method: 'DELETE' }),

  // Analytics
  getAnalytics: () => request('/analytics'),

  // VetBoard reviews
  getVetboardReviews: (status) => request(`/vetboard${status ? `?status=${status}` : ''}`),
  getVetboardReview: (id) => request(`/vetboard/${id}`),
  createVetboardReview: (data) => request('/vetboard', { method: 'POST', body: JSON.stringify(data) }),
  updateVetboardReview: (id, data) => request(`/vetboard/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Calls
  getCallContacts: (q) => request(`/calls/contacts${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  getCalls: (params) => request(`/calls${params ? `?${params}` : ''}`),
  logCall: (formData) => request('/calls', { method: 'POST', body: formData }),
  updateCall: (id, data) => request(`/calls/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
};
