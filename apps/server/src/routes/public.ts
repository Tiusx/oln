import { Hono } from 'hono';
import { and, desc, eq, gte, sql } from 'drizzle-orm';
import { posts, tags, categories, pages, links, hitokoto, moments } from '../db/schema';
import { withDb, type AppBindings } from '../middleware/auth';
import { loadConfigCached } from '../services/config';
import { renderMarkdown } from '../services/markdown';
import { getPostTags } from '../services/posts';
import { getPageBySlug } from '../services/content';
import { ApiError } from '../lib/http';

interface PostView {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  coverImage: string | null;
  publishedAt: string | null;
  updatedAt: string | null;
  pinned: boolean;
  commentsEnabled: boolean;
  categoryId: string | null;
  category: { id: string; name: string; slug: string } | null;
  tags: { id: string; name: string; slug: string }[];
  html?: string;
}

async function toPostView(
  db: any,
  p: any,
  pt: { id: string; name: string; slug: string }[],
  withHtml: boolean,
): Promise<PostView> {
  // Resolve category display object from categoryId when present.
  let category: PostView['category'] = null;
  if (p.categoryId) {
    const catRow = await db.select().from(categories).where(eq(categories.id, p.categoryId)).get();
    if (catRow) {
      category = { id: catRow.id, name: catRow.name, slug: catRow.slug };
    }
  }
  return {
    id: p.id,
    title: p.title,
    slug: p.slug,
    excerpt: p.excerpt,
    coverImage: p.coverImage,
    publishedAt: p.publishedAt ? new Date(p.publishedAt).toISOString() : null,
    updatedAt: p.updatedAt ? new Date(p.updatedAt).toISOString() : null,
    pinned: !!p.pinned,
    commentsEnabled: !!p.commentsEnabled,
    categoryId: p.categoryId,
    category,
    tags: pt,
    html: withHtml ? p.contentHtml ?? undefined : undefined,
  };
}


export function publicRoutes(): Hono<AppBindings> {
  const app = new Hono<AppBindings>();
  app.use('*', withDb);

  // GET /api/public/config
  app.get('/config', async (c) => {
    const config = await loadConfigCached(c.get('db'), c.env.CACHE);
    return c.json({ success: true, data: config });
  });

  // GET /api/public/posts?page=&limit= — published posts only
  app.get('/posts', async (c) => {
    const db = c.get('db');
    const page = Math.max(Number(c.req.query('page') || 1), 1);
    const limit = Math.min(Math.max(Number(c.req.query('limit') || 20), 1), 50);
    const offset = (page - 1) * limit;

    const where = and(eq(posts.status, 'published'), gte(posts.publishedAt, new Date(1)));
    const total =
      (await db.select({ count: sql<number>`count(*)` }).from(posts).where(where).get())?.count ?? 0;
    const rows = await db
      .select()
      .from(posts)
      .where(where)
      .orderBy(desc(posts.pinned), desc(posts.publishedAt))
      .limit(limit)
      .offset(offset)
      .all();

    const items = await Promise.all(
      rows.map(async (p) => {
        const pt = await getPostTags(db, p.id);
        return toPostView(db, p, pt, false);
      }),
    );
    return c.json({ success: true, data: { items, total, page, limit } });
  });

  // GET /api/public/posts/:slug — single published post (rendered, KV-cached)
  app.get('/posts/:slug', async (c) => {
    const db = c.get('db');
    const slug = c.req.param('slug');
    const cacheKey = `post:${slug}`;
    const cached = await c.env.CACHE.get(cacheKey, 'json');
    if (cached) return c.json({ success: true, data: cached });

    const row = await db.select().from(posts).where(eq(posts.slug, slug)).get();
    if (!row || row.status !== 'published') {
      throw new ApiError(404, 'Post not found');
    }
    const pt = await getPostTags(db, row.id);
    const html = row.contentHtml ?? renderMarkdown(row.content);
    const view = await toPostView(db, row, pt, true);
    view.html = html;
    await c.env.CACHE.put(cacheKey, JSON.stringify(view), { expirationTtl: 300 });
    return c.json({ success: true, data: view });
  });

  // GET /api/public/tags
  app.get('/tags', async (c) => {
    const db = c.get('db');
    const rows = await db.select().from(tags).orderBy(tags.name).all();
    return c.json({ success: true, data: rows });
  });

  // GET /api/public/categories
  app.get('/categories', async (c) => {
    const db = c.get('db');
    const rows = await db.select().from(categories).orderBy(categories.order, categories.name).all();
    return c.json({ success: true, data: rows });
  });

  // GET /api/public/pages/:slug — published page
  app.get('/pages/:slug', async (c) => {
    const db = c.get('db');
    const row = await getPageBySlug(db, c.req.param('slug'));
    if (!row || row.status !== 'published') throw new ApiError(404, 'Page not found');
    return c.json({
      success: true,
      data: {
        title: row.title,
        slug: row.slug,
        html: renderMarkdown(row.content),
        commentsEnabled: !!row.commentsEnabled,
      },
    });
  });

  // GET /api/public/links — active friendly links
  app.get('/links', async (c) => {
    const db = c.get('db');
    const rows = await db
      .select()
      .from(links)
      .where(eq(links.status, 'active'))
      .orderBy(links.order, links.name)
      .all();
    return c.json({ success: true, data: rows });
  });

  // GET /api/public/moments?page=&limit= — published moments (朋友圈/说说)
  app.get('/moments', async (c) => {
    const db = c.get('db');
    const page = Math.max(Number(c.req.query('page') || 1), 1);
    const limit = Math.min(Math.max(Number(c.req.query('limit') || 20), 1), 50);
    const offset = (page - 1) * limit;
    const where = eq(moments.status, 'published');
    const total =
      (await db.select({ count: sql<number>`count(*)` }).from(moments).where(where).get())?.count ?? 0;
    const rows = await db
      .select()
      .from(moments)
      .where(where)
      .orderBy(desc(moments.pinned), desc(moments.createdAt))
      .limit(limit)
      .offset(offset)
      .all();
    const items = rows.map((m) => ({
      id: m.id,
      content: m.content,
      html: m.contentHtml ?? renderMarkdown(m.content),
      pinned: !!m.pinned,
      createdAt: new Date(m.createdAt).toISOString(),
    }));
    return c.json({ success: true, data: { items, total, page, limit } });
  });

  // GET /api/public/hitokoto — random hitokoto
  app.get('/hitokoto', async (c) => {
    const db = c.get('db');
    const rows = await db.select().from(hitokoto).all();
    if (!rows.length) {
      // Fallback to official API when DB is empty
      try {
        const apiRes = await fetch(`https://api.hitokoto.cn/?encode=json`);
        if (apiRes.ok) {
          const data = await apiRes.json() as { hitokoto?: string; creator?: string | null };
          // Insert into DB for future use
          const id = crypto.randomUUID();
          await db.insert(hitokoto).values({ id, content: data.hitokoto ?? '', creator: data.creator ?? null });
          return c.json({ success: true, data: { content: data.hitokoto ?? '', creator: data.creator ?? null } });
        }
      } catch (err) {
        console.error('Hitokoto API fetch error:', err);
      }
      return c.json({ success: true, data: { content: '念念不忘，必有回响。', creator: null } });
    }
    const item = rows[Math.floor(Math.random() * rows.length)];
    return c.json({ success: true, data: { content: item.content, creator: item.creator || null } });
  });

  // GET /api/public/media/* — serve R2 media (wildcard key)
  app.get('/media/*', async (c) => {
    const key = c.req.param('*') || '';
    const obj = await c.env.MEDIA.get(key);
    if (!obj) throw new ApiError(404, 'Not found');
    const headers = new Headers();
    if (obj.httpMetadata?.contentType) headers.set('Content-Type', obj.httpMetadata.contentType);
    if (obj.size) headers.set('Content-Length', String(obj.size));
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    return new Response(obj.body, { headers });
  });

  return app;
}

