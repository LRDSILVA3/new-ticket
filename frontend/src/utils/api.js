const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export async function fetchJson(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${response.status}: Falha na requisição`);
  }

  return response.json();
}

export const api = {
  // Tenants
  getTenants: () => fetchJson('/tenants'),
  getTenant: (slug) => fetchJson(`/tenants/${slug}`),
  updateTenantBuffer: (slug, buffer_type, buffer_value) => 
    fetchJson(`/tenants/${slug}/buffer`, {
      method: 'PUT',
      body: JSON.stringify({ buffer_type, buffer_value })
    }),
  getServices: (slug) => fetchJson(`/tenants/${slug}/services`),
  getStages: (slug, serviceId) => fetchJson(`/tenants/${slug}/stages${serviceId ? `?service_id=${serviceId}` : ''}`),
  createStage: (slug, data) => fetchJson(`/tenants/${slug}/stages`, { method: 'POST', body: JSON.stringify(data) }),
  updateStage: (slug, stageId, data) => fetchJson(`/tenants/${slug}/stages/${stageId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteStage: (slug, stageId) => fetchJson(`/tenants/${slug}/stages/${stageId}`, { method: 'DELETE' }),
  getOperators: (slug) => fetchJson(`/tenants/${slug}/operators`),

  // Tickets
  createTicket: (data) => fetchJson('/tickets/create', { method: 'POST', body: JSON.stringify(data) }),
  trackTicket: (token) => fetchJson(`/tickets/track/${token}`),
  getTenantTickets: (tenantId, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchJson(`/tickets/tenant/${tenantId}${query ? `?${query}` : ''}`);
  },
  callTicket: (ticketId, counter, operatorName) => 
    fetchJson('/tickets/call', { method: 'POST', body: JSON.stringify({ ticketId, counter, operatorName }) }),
  recallTicket: (ticketId) => 
    fetchJson('/tickets/recall', { method: 'POST', body: JSON.stringify({ ticketId }) }),
  startTicket: (ticketId) => 
    fetchJson('/tickets/start', { method: 'POST', body: JSON.stringify({ ticketId }) }),
  completeStage: (ticketId, notes, skipToStageId) => 
    fetchJson('/tickets/complete-stage', { method: 'POST', body: JSON.stringify({ ticketId, notes, skipToStageId }) }),
  cancelTicket: (ticketId, reason) => 
    fetchJson('/tickets/cancel', { method: 'POST', body: JSON.stringify({ ticketId, reason }) }),
  getTicketEvents: (ticketId) => fetchJson(`/tickets/events/${ticketId}`),
  getTenantEvents: (tenantId) => fetchJson(`/tickets/tenant/${tenantId}/events`)
};

