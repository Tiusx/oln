import type { APIRoute } from 'astro';
import { api } from '../lib/api';

const SITE = (import.meta.env.PUBLIC_SITE_URL || 'https://example.com').replace(/\/$/, '');

export const GET: APIRoute = async () => {
  let config: Awaited<ReturnType<typeof api.config>> | null = null;
  try {
    config = await api.config();
  } catch {
    config = null;
  }

  const siteName = config?.basic.siteName || 'Blog';
  const siteDesc = config?.seo.description || '';
  const lang = config?.basic.language || 'zh-CN';

  let feedItems: { slug: string; title: string; date: string | null; excerpt: string | null; category: { name: string } | null }[] = [];
  try {
    const { items } = await api.posts(1, 20);
    feedItems = items;
  } catch {
    // leave feed empty rather than failing the whole request
  }

  const feedUrl = `${SITE}/rss.xml`;

  const itemsXml = feedItems
    .map((post) => {
      const link = `${SITE}/posts/${encodeURIComponent(post.slug)}`;
      const pubDate = post.date ? new Date(post.date).toUTCString() : new Date().toUTCString();
      const description = escapeXml((post.excerpt || '').replace(/\s+/g, ' ').trim().slice(0, 500));
      return `
    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${description}</description>${post.category ? `
      <category>${escapeXml(post.category.name)}</category>` : ''}
    </item>`;
    })
    .join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(siteName)}</title>
    <link>${SITE}</link>
    <description>${escapeXml(siteDesc)}</description>
    <language>${escapeXml(lang)}</language>
    <atom:link href="${feedUrl}" rel="self" type="application/rss+xml" />
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>${itemsXml}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  });
};

function escapeXml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}