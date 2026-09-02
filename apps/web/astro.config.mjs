import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import { fileURLToPath } from 'node:url';

// The Astro frontend is deployed on Cloudflare Pages.
// Public data (site config, posts, tags) is fetched from the server public API.
export default defineConfig({
  output: 'server',
  base: '/',
  adapter: cloudflare(),
  site: process.env.PUBLIC_SITE_URL || 'https://example.com',
  // Allow the dev server to be reached from other devices on the local
  // network (e.g. http://192.168.2.158:4321) by binding to all interfaces
  // instead of just the loopback (::1) address.
  server: {
    host: process.env.DEV_HOST || '0.0.0.0',
  },
  vite: {
    resolve: {
      alias: [
        {
          // Exact-match only the bare `recaptcha-v3` specifier. It exports via
          // Object.defineProperty, which Vite's es-module-lexer can't statically
          // detect, breaking @waline/client's `import { load } from "recaptcha-v3"`
          // in dev. Point it at an ESM wrapper that re-exports named bindings.
          find: /^recaptcha-v3$/,
          replacement: fileURLToPath(
            new URL('./src/lib/vendor/recaptcha-v3.js', import.meta.url),
          ),
        },
      ],
    },
    optimizeDeps: {
      // Avoid dev-time pre-bundling of the large Waline bundle (stalls the
      // workerd-based astro dev env -> 504). recaptcha-v3's Object.defineProperty
      // exports can't be statically scanned by es-module-lexer; needsInterop
      // keeps its default as the full CJS exports object so the wrapper can
      // re-export `load`. autosize is CJS without a `module` field.
      exclude: ['@waline/client'],
      include: ['autosize'],
      needsInterop: ['recaptcha-v3', 'recaptcha-v3/dist/ReCaptcha.js'],
    },
    server: {
      proxy: {
        // Proxy /api requests to the server dev server during local development
        '/api': {
          target: process.env.PUBLIC_SERVER_URL || 'http://localhost:8787',
          changeOrigin: true,
        },
      },
    },
  },
});

