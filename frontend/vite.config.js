import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Preview/dev-only session bridge.
 *
 * Embedded preview iframes can block Web Storage and drop cookies/custom
 * headers, which left the app authenticated on the server but anonymous in the
 * browser ("Authentication required" right after a successful login). The dev
 * proxy therefore remembers the token Flask issued at login and attaches it to
 * every /api request server-side, where no browser policy can interfere.
 *
 * This lives only in the Vite dev server. A production deployment behind a real
 * reverse proxy should rely on the Authorization header or a session cookie.
 */
const TOKEN_FILE = path.resolve(__dirname, 'node_modules/.sa-proxy-token');

function readToken() {
  try {
    const t = fs.readFileSync(TOKEN_FILE, 'utf8').trim();
    return t || null;
  } catch {
    return null;
  }
}

function writeToken(t) {
  try { fs.writeFileSync(TOKEN_FILE, t, 'utf8'); } catch { /* ignore */ }
}

function captureToken(proxy) {
  proxy.on('proxyRes', (proxyRes) => {
    const setCookie = proxyRes.headers['set-cookie'] || [];
    for (const cookie of setCookie) {
      const m = /(?:^|;\s*)sa_token=([^;]+)/.exec(cookie);
      if (m) { writeToken(decodeURIComponent(m[1])); break; }
    }
  });
}

const apiProxy = {
  target: 'http://localhost:5000',
  changeOrigin: true,
  cookieDomainRewrite: '',
  configure: captureToken,
  bypass(req) {
    // Logout must genuinely end the session, including the bridge token.
    if (/\/api\/auth\/logout/.test(req.url || '')) {
      try { fs.rmSync(TOKEN_FILE, { force: true }); } catch { /* ignore */ }
      return null;
    }
    // Nothing to inject on the login/register calls themselves.
    if (/\/api\/auth\/(login|register)/.test(req.url || '')) return null;
    const token = readToken();
    if (!token) return null;
    req.headers = req.headers || {};
    if (!req.headers.authorization) req.headers.authorization = `Bearer ${token}`;
    if (!req.headers.cookie) req.headers.cookie = `sa_token=${encodeURIComponent(token)}`;
    return null;
  },
};

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,
    allowedHosts: true,
    proxy: { '/api': apiProxy },
  },
  preview: { host: '0.0.0.0', port: 5173, allowedHosts: true },
});
