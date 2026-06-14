const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4500/api';

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
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

export const api = {
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

  // Knowledge base
  getArticles: (params) => request(`/knowledge${params ? `?${params}` : ''}`),
  createArticle: (data) => request('/knowledge', { method: 'POST', body: JSON.stringify(data) }),
  updateArticle: (id, data) => request(`/knowledge/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteArticle: (id) => request(`/knowledge/${id}`, { method: 'DELETE' }),

  // Dispatch
  getDispatches: () => request('/dispatch'),
  createDispatch: (data) => request('/dispatch', { method: 'POST', body: JSON.stringify(data) }),
  updateDispatch: (id, data) => request(`/dispatch/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // AI
  getAiStatus: () => request('/ai/status'),
  askAi: (question, context) => request('/ai/ask', { method: 'POST', body: JSON.stringify({ question, context }) }),
  summarizeTranscript: (transcript, ticket_id) =>
    request('/ai/summarize', { method: 'POST', body: JSON.stringify({ transcript, ticket_id }) }),
};
