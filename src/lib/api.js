// API base URL and fetch helpers
const API_BASE = 'http://localhost:3001/api';

async function fetchJSON(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json();
}

// ── Venues & Zones ────────────────────────────────────────
export const getVenues       = ()       => fetchJSON('/venues');
export const getZones        = ()       => fetchJSON('/zones');
export const getZoneDensity  = (id)     => fetchJSON(`/zones/${id}/density`);

// ── POIs ──────────────────────────────────────────────────
export const getPOIs         = (params) => {
  const qs = new URLSearchParams(params).toString();
  return fetchJSON(`/pois${qs ? '?' + qs : ''}`);
};
export const getPOI          = (id)     => fetchJSON(`/pois/${id}`);
export const updatePOIStatus = (id, status) =>
  fetchJSON(`/pois/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });

// ── Queue States ──────────────────────────────────────────
export const getQueues       = ()       => fetchJSON('/queues');
export const patchQueueOverride = (poiId, data) =>
  fetchJSON(`/queues/${poiId}/override`, { method: 'PATCH', body: JSON.stringify(data) });

// ── Events / Schedule ─────────────────────────────────────
export const getEvents       = ()       => fetchJSON('/events');
export const updateEventStatus = (id, status) =>
  fetchJSON(`/events/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });

// ── Volunteers ────────────────────────────────────────────
export const getVolunteers   = ()       => fetchJSON('/volunteers');

// ── Tasks ─────────────────────────────────────────────────
export const getTasks        = (params) => {
  const qs = new URLSearchParams(params).toString();
  return fetchJSON(`/tasks${qs ? '?' + qs : ''}`);
};
export const createTask      = (data)   =>
  fetchJSON('/tasks', { method: 'POST', body: JSON.stringify(data) });
export const updateTaskStatus = (id, status) =>
  fetchJSON(`/tasks/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });

// ── Notifications ─────────────────────────────────────────
export const getNotifications = ()      => fetchJSON('/notifications');
export const sendNotification = (data)  =>
  fetchJSON('/notifications', { method: 'POST', body: JSON.stringify(data) });

// ── Dashboard ─────────────────────────────────────────────
export const getDashboardMetrics = ()   => fetchJSON('/dashboard/metrics');

// ── Simulation Controls ───────────────────────────────────
export const triggerSurge    = (zoneId) =>
  fetchJSON('/simulate/surge', { method: 'POST', body: JSON.stringify({ zone_id: zoneId }) });
export const triggerHalftime = ()       =>
  fetchJSON('/simulate/halftime', { method: 'POST' });
