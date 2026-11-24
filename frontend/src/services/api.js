import { clearToken, getToken } from './session';

const BASE = '/api';

export async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
    // Some embedded proxies strip the Authorization header; this is a fallback.
    headers['X-Auth-Token'] = token;
  }

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  let data = null;
  try { data = await res.json(); } catch { data = null; }

  if (res.status === 401 && token) {
    // The server rejected a token we believed was valid (expired or signed with
    // a different secret). Drop it and let the app return to the login screen.
    clearToken();
    window.dispatchEvent(new CustomEvent('sa:unauthorized'));
  }

  if (!res.ok) {
    const err = new Error((data && data.error) || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const get = (path) => api(path);
export const post = (path, body) => api(path, { method: 'POST', body: JSON.stringify(body || {}) });
export const patch = (path, body) => api(path, { method: 'PATCH', body: JSON.stringify(body || {}) });
export const del = (path) => api(path, { method: 'DELETE' });

export function fmtW(w) {
  if (w == null) return '—';
  return `${Number(w).toLocaleString(undefined, { maximumFractionDigits: 0 })} W`;
}
export function fmtKwh(wh) {
  if (wh == null) return '—';
  return `${(Number(wh) / 1000).toFixed(2)} kWh`;
}
export function fmtKw(kw) {
  if (kw == null) return '—';
  return `${Number(kw).toFixed(2).replace(/\.?0+$/, '')} kW`;
}
