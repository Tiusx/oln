import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  output: 'server',
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
          find: /^@\/(.*)$/,
          replacement: fileURLToPath(
            new URL('./src/$1', import.meta.url),
          ),
        },
      ],
    },
  },
});
