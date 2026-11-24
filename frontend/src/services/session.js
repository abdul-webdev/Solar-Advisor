/**
 * Session token storage.
 *
 * The token lives in memory first, then mirrors to localStorage / sessionStorage.
 * Storage access is wrapped because partitioned or sandboxed iframe contexts
 * (e.g. embedded previews) can block Web Storage — in that case a write silently
 * fails and a later read returns null, which previously produced "401 after a
 * successful login". The in-memory copy keeps the session working regardless.
 */
const KEY = 'sa_token';

let memoryToken = null;

// Cleared on logout so a stale query token cannot outlive the session.
let urlToken = null;

export function setUrlToken(token) { urlToken = token || null; }
export function getUrlToken() { return urlToken; }

function safeGet(store) {
  try { return store.getItem(KEY); } catch { return null; }
}
function safeSet(store, value) {
  try { store.setItem(KEY, value); } catch { /* storage unavailable */ }
}
function safeRemove(store) {
  try { store.removeItem(KEY); } catch { /* storage unavailable */ }
}

export function getToken() {
  if (memoryToken) return memoryToken;
  memoryToken = safeGet(localStorage) || safeGet(sessionStorage) || null;
  return memoryToken;
}

export function setToken(token) {
  memoryToken = token || null;
  if (!token) return clearToken();
  safeSet(localStorage, token);
  safeSet(sessionStorage, token);
}

export function clearToken() {
  memoryToken = null;
  safeRemove(localStorage);
  safeRemove(sessionStorage);
}
