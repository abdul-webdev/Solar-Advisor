import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        // keep cookies working when the preview/proxy strips custom headers
        cookieDomainRewrite: '',
      },
    },
  },
  preview: { host: '0.0.0.0', port: 5173, allowedHosts: true },
});
