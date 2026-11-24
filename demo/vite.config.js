import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base so the bundle works from a GitHub Pages project URL:
// https://<user>.github.io/<repo>/
export default defineConfig({
  plugins: [react()],
  base: './',
  build: { outDir: 'dist', emptyOutDir: true },
});
