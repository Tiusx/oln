import { and, desc, eq, like } from 'drizzle-orm';
import { pages, links, subscribers } from '../db/schema';
import type { AppDb } from '../db';
import { createId, uniqueSlug } from '../lib/ids';

export interface PageInputData {
  title: string;
  slug?: string;
  content?: string;
  status?: 'draft' | 'published';
  showInMenu?: boolean;
  menuOrder?: number;
}
export interface LinkInputData {
  name: string;
  url: string;
  description?: string | null;
  avatar?: string | null;
  order?: number;
  status?: 'active' | 'hidden';
}
export interface SubscriberInputData {
  email: string;
  name?: string | null;
}

// ---------------------------------------------------------------------------
// Pages
// ---------------------------------------------------------------------------
export async function listPages(db: AppDb) {
  return db.select().from(pages).orderBy(pages.menuOrder, pages.createdAt).all();
}

export async function getPage(db: AppDb, id: string) {
  return db.select().from(pages).where(eq(pages.id, id)).get();
}

export async function getPageBySlug(db: AppDb, slug: string) {
  return db.select().from(pages).where(eq(pages.slug, slug)).get();
}

export async function createPage(db: AppDb, data: PageInputData) {
  const id = createId();
  const slug = await uniqueSlug(data.slug || data.title, (s) => pageSlugExists(db, s));
  await db.insert(pages).values({
    id,
    title: data.title,
    slug,
    content: data.content ?? '',
    status: data.status ?? 'published',
    showInMenu: data.showInMenu ?? false,
    menuOrder: data.menuOrder ?? 0,
  });
  return { id };
}

export async function updatePage(db: AppDb, id: string, data: PageInputData) {
  const existing = await db.select().from(pages).where(eq(pages.id, id)).get();
  if (!existing) return null;
  const slug = await uniqueSlug(data.slug || data.title, (s) => pageSlugExists(db, s, id));
  await db
    .update(pages)
    .set({
      title: data.title,
      slug,
      content: data.content ?? existing.content,
      status: data.status ?? existing.status,
      showInMenu: data.showInMenu ?? existing.showInMenu,
      menuOrder: data.menuOrder ?? existing.menuOrder,
    })
    .where(eq(pages.id, id));
  return { id };
}

export async function deletePage(db: AppDb, id: string) {
  await db.delete(pages).where(eq(pages.id, id));
}

// ---------------------------------------------------------------------------
// Friendly links (友链)
// ---------------------------------------------------------------------------
export async function listLinks(db: AppDb, includeHidden = false) {
  const cond = includeHidden ? undefined : eq(links.status, 'active');
  return db.select().from(links).where(cond).orderBy(links.order, links.name).all();
}

export async function createLink(db: AppDb, data: LinkInputData) {
  const id = createId();
  await db.insert(links).values({
    id,
    name: data.name,
    url: data.url,
    description: data.description,
    avatar: data.avatar,
    order: data.order ?? 0,
    status: data.status ?? 'active',
  });
  return { id };
}

export async function updateLink(db: AppDb, id: string, data: LinkInputData) {
  await db
    .update(links)
    .set({
      name: data.name,
      url: data.url,
      description: data.description,
      avatar: data.avatar,
      order: data.order ?? 0,
      status: data.status ?? 'active',
    })
    .where(eq(links.id, id));
}

export async function deleteLink(db: AppDb, id: string) {
  await db.delete(links).where(eq(links.id, id));
}

// ---------------------------------------------------------------------------
// Subscribers (newsletter)
// ---------------------------------------------------------------------------
export async function listSubscribers(db: AppDb, q?: string) {
  const likeQ = q ? `%${q}%` : undefined;
  const cond = likeQ ? like(subscribers.email, likeQ) : undefined;
  return db
    .select()
    .from(subscribers)
    .where(cond)
    .orderBy(desc(subscribers.subscribedAt))
    .all();
}

export async function addSubscriber(db: AppDb, data: SubscriberInputData) {
  const existing = await db
    .select()
    .from(subscribers)
    .where(eq(subscribers.email, data.email))
    .get();
  if (existing) return { id: existing.id, alreadyExists: true };
  const id = createId();
  await db.insert(subscribers).values({ id, email: data.email, name: data.name });
  return { id, alreadyExists: false };
}

export async function deleteSubscriber(db: AppDb, id: string) {
  await db.delete(subscribers).where(eq(subscribers.id, id));
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function pageSlugExists(db: AppDb, slug: string, excludeId?: string) {
  const row = await db.select({ id: pages.id }).from(pages).where(eq(pages.slug, slug)).get();
  return row ? row.id !== excludeId : false;
}
