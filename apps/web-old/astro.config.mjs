import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

// The Astro frontend is deployed on Cloudflare Pages.
// Public data (site config, posts, tags) is fetched from the server public API.
export default defineConfig({
  output: 'server',
  base: '/',
  adapter: cloudflare(),
  integrations: [react()],
  site: process.env.PUBLIC_SITE_URL || 'https://example.com',
  server: {
    host: process.env.DEV_HOST || '0.0.0.0',
  },
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: [
        {
          find: /^recaptcha-v3$/,
          replacement: fileURLToPath(
            new URL('./src/lib/vendor/recaptcha-v3.js', import.meta.url),
          ),
        },
        {
          find: /^@\/(.*)$/,
          replacement: fileURLToPath(
            new URL('./src/$1', import.meta.url),
          ),
        },
      ],
    },
    optimizeDeps: {
      exclude: ['@waline/client'],
      include: ['autosize'],
      needsInterop: ['recaptcha-v3', 'recaptcha-v3/dist/ReCaptcha.js'],
    },
    server: {
      proxy: {
        '/api': {
          target: process.env.PUBLIC_SERVER_URL || 'http://localhost:8787',
          changeOrigin: true,
        },
      },
    },
  },
});

