import type { APIRoute } from 'astro';
import { api } from '../lib/api';

const SITE = (import.meta.env.PUBLIC_SITE_URL || 'https://example.com').replace(/\/$/, '');

export const prerender = false;

export const GET: APIRoute = async () => {
  const config = await api.config();
  if (!config.seo.enableRobots) {
    return new Response('User-agent: *\nDisallow: /', {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
  const text = `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/

Sitemap: ${SITE}/sitemap.xml`;
  return new Response(text, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
