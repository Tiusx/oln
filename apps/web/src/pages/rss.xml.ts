import type { APIRoute } from 'astro';
import { api } from '../lib/api';
import { renderMarkdown } from '../lib/markdown';

const SITE = (import.meta.env.PUBLIC_SITE_URL || 'https://example.com').replace(/\/$/, '');

export const prerender = false;

export const GET: APIRoute = async () => {
  const config = await api.config();
  const siteName = config.basic.siteName || 'Blog';
  const siteDesc = config.seo.description || '';
  const lang = config.basic.language || 'zh-CN';
  const { items } = await api.posts(1, 20);

  const feedUrl = `${SITE}/rss.xml`;

  const itemsXml = items
    .map((post) => {
      const link = `${SITE}/posts/${post.slug}`;
      const pubDate = post.publishedAt
        ? new Date(post.publishedAt).toUTCString()
        : new Date().toUTCString();
      // Strip HTML to produce a plain-text description for the feed.
      const body = renderMarkdown(post.excerpt || post.content || '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      const description = escapeXml(body.slice(0, 500));
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
