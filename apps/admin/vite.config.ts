import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The admin SPA is served by the server Worker at /admin, so base must be /admin/.
// Build output goes to ../server/public (which the Worker's assets serves).
export default defineConfig({
  base: '/admin/',
  plugins: [react()],
  build: {
    outDir: '../server/public',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      // Forward API calls to the local Worker during development
      '/admin/api': 'http://localhost:8787',
      '/api': 'http://localhost:8787',
    },
  },
});
