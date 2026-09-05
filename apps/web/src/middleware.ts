import { defineMiddleware } from 'astro:middleware';

const CACHE_SECONDS = 300;

/**
 * Cache successful HTML responses in the Cloudflare Cache API so repeated page
 * loads (including View-Transition navigations) are served from the edge
 * instead of re-running full SSR + D1 queries for every request.
 *
 * The theme is applied client-side (inline <head> script with data-astro-rerun),
 * so cached HTML is theme-agnostic and never causes a wrong-theme flash.
 */
export const onRequest = defineMiddleware(async (context, next) => {
  const { request } = context;

  if (request.method !== 'GET') return next();
  const accept = request.headers.get('accept') || '';
  if (!accept.includes('text/html')) return next();

  const store = (globalThis as { caches?: CacheStorage }).caches;
  const cache = store?.default;
  const cacheKey = new Request(request.url);

  if (cache) {
    try {
      const hit = await cache.match(cacheKey);
      if (hit) return hit;
    } catch {
      // fall through on any cache error
    }
  }

  const response = await next();

  if (cache && response.status === 200 && (response.headers.get('content-type') || '').includes('text/html')) {
    try {
      const headers = new Headers(response.headers);
      headers.set('Cache-Control', `public, max-age=60, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=3600`);
      const body = await response.clone().arrayBuffer();
      const cached = new Response(body, { status: 200, headers });
      const runtime = (context.locals as { runtime?: { ctx?: { waitUntil?: (p: Promise<unknown>) => void } } }).runtime;
      if (runtime?.ctx?.waitUntil) {
        runtime.ctx.waitUntil(cache.put(cacheKey, cached));
      }
      return new Response(body, { status: 200, headers });
    } catch {
      // never break page delivery on cache failures
    }
  }

  return response;
});