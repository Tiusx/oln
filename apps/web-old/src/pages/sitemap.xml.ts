import type { APIRoute } from 'astro';
import { api } from '../lib/api';

const SITE = (import.meta.env.PUBLIC_SITE_URL || 'https://example.com').replace(/\/$/, '');
const PAGES_PER_BATCH = 100;

export const prerender = false;

export const GET: APIRoute = async () => {
  const config = await api.config();
  if (!config.seo.enableSitemap) {
    return new Response('Sitemap disabled', { status: 404 });
  }

  const urls: { loc: string; lastmod?: string; priority: number }[] = [
    { loc: `${SITE}/`, priority: 1.0 },
  ];

  // All published posts (paginate)
  let page = 1;
  let total = Infinity;
  while (urls.length < 500 && (page - 1) * PAGES_PER_BATCH < total) {
    const data = await api.posts(page, PAGES_PER_BATCH);
    total = data.total;
    for (const post of data.items) {
      if (post.status !== 'published') continue;
      urls.push({
        loc: `${SITE}/posts/${post.slug}`,
        lastmod: post.updatedAt || post.publishedAt || undefined,
        priority: 0.8,
      });
    }
    page++;
  }

  const categories = await api.categories();
  for (const c of categories) urls.push({ loc: `${SITE}/categories/${c.slug}`, priority: 0.6 });

  const tags = await api.tags();
  for (const t of tags) urls.push({ loc: `${SITE}/tags/${t.slug}`, priority: 0.5 });

  const urlXml = urls
    .map(
      (u) => `  <url>
    <loc>${u.loc}</loc>${u.lastmod ? `
    <lastmod>${new Date(u.lastmod).toISOString().slice(0, 10)}</lastmod>` : ''}
    <priority>${u.priority}</priority>
  </url>`,
    )
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlXml}
</urlset>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
