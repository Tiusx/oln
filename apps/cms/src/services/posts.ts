import { and, desc, eq, like, or, sql } from 'drizzle-orm';
import { posts, tags, categories, postTags, pages } from '../db/schema';
import type { AppDb } from '../db';
import { createId, uniqueSlug } from '../lib/ids';

export interface PostInputData {
  title: string;
  slug?: string;
  excerpt?: string | null;
  content?: string;
  categoryId?: string | null;
  coverImage?: string | null;
  status?: 'draft' | 'published';
  pinned?: boolean;
  commentsEnabled?: boolean;
  publishedAt?: string | null;
  tagIds?: string[];
  seoTitle?: string | null;
  seoDescription?: string | null;
}
export interface TagInputData {
  name: string;
  slug?: string;
}
export interface CategoryInputData {
  name: string;
  slug?: string;
  description?: string | null;
  parentId?: string | null;
  order?: number;
}

// ---------------------------------------------------------------------------
// Posts
// ---------------------------------------------------------------------------
export async function listPosts(db: AppDb, opts: {
  status?: string;
  q?: string;
  tagId?: string;
  categoryId?: string;
  page: number;
  limit: number;
}) {
  const { page, limit } = opts;
  const offset = (page - 1) * limit;
  const conditions: any[] = [];
  if (opts.status) conditions.push(eq(posts.status, opts.status as 'draft' | 'published'));
  if (opts.categoryId) conditions.push(eq(posts.categoryId, opts.categoryId));
  if (opts.q) {
    const likeQ = `%${opts.q}%`;
    conditions.push(
      or(like(posts.title, likeQ), like(posts.excerpt, likeQ), like(posts.content, likeQ)),
    );
  }

  let where: any = conditions.length ? and(...conditions) : undefined;
  if (opts.tagId) {
    const tagged = db
      .select({ postId: postTags.postId })
      .from(postTags)
      .where(eq(postTags.tagId, opts.tagId));
    where = sql`${posts.id} IN (${tagged})`;
    if (conditions.length) where = and(where, ...conditions);
  }

  const total = (
    await db.select({ count: sql<number>`count(*)` }).from(posts).where(where).get()
  )?.count ?? 0;

  const rows = await db
    .select()
    .from(posts)
    .where(where)
    .orderBy(desc(posts.pinned), desc(posts.publishedAt), desc(posts.createdAt))
    .limit(limit)
    .offset(offset)
    .all();

  const items = await Promise.all(rows.map(async (p) => ({ ...p, tags: await getPostTags(db, p.id) })));
  return { items, total, page, limit };
}

export async function getPost(db: AppDb, id: string) {
  const row = await db.select().from(posts).where(eq(posts.id, id)).get();
  if (!row) return null;
  return { ...row, tags: await getPostTags(db, id) };
}

export async function getPostBySlug(db: AppDb, slug: string) {
  const row = await db.select().from(posts).where(eq(posts.slug, slug)).get();
  if (!row) return null;
  return { ...row, tags: await getPostTags(db, row.id) };
}

export async function createPost(db: AppDb, data: PostInputData, authorId: string) {
  const id = createId();
  const slug = await uniqueSlug(data.slug || data.title, (s) => postSlugExists(db, s));
  const publishedAt =
    data.status === 'published'
      ? new Date(data.publishedAt ?? Date.now())
      : data.publishedAt
        ? new Date(data.publishedAt)
        : null;
  await db.insert(posts).values({
    id,
    title: data.title,
    slug,
    excerpt: data.excerpt,
    content: data.content ?? '',
    categoryId: data.categoryId,
    coverImage: data.coverImage,
    status: data.status ?? 'draft',
    pinned: data.pinned ?? false,
    commentsEnabled: data.commentsEnabled ?? true,
    publishedAt,
    authorId,
    seoTitle: data.seoTitle,
    seoDescription: data.seoDescription,
  });
  await setPostTags(db, id, data.tagIds ?? []);
  return { id };
}

export async function updatePost(db: AppDb, id: string, data: PostInputData, authorId: string) {
  const existing = await db.select().from(posts).where(eq(posts.id, id)).get();
  if (!existing) return null;
  const slug = await uniqueSlug(data.slug || data.title, (s) => postSlugExists(db, s, id));
  const publishedAt =
    data.status === 'published'
      ? new Date(data.publishedAt ?? existing.publishedAt ?? Date.now())
      : data.publishedAt
        ? new Date(data.publishedAt)
        : existing.publishedAt;
  await db
    .update(posts)
    .set({
      title: data.title,
      slug,
      excerpt: data.excerpt,
      content: data.content ?? '',
      categoryId: data.categoryId,
      coverImage: data.coverImage,
      status: data.status ?? existing.status,
      pinned: data.pinned ?? existing.pinned,
      commentsEnabled: data.commentsEnabled ?? existing.commentsEnabled,
      publishedAt,
      authorId: authorId,
      seoTitle: data.seoTitle,
      seoDescription: data.seoDescription,
    })
    .where(eq(posts.id, id));
  await setPostTags(db, id, data.tagIds ?? []);
  return { id };
}

export async function deletePost(db: AppDb, id: string) {
  await db.delete(posts).where(eq(posts.id, id));
}

// ---------------------------------------------------------------------------
// Tags
// ---------------------------------------------------------------------------
export async function listTags(db: AppDb) {
  return db.select().from(tags).orderBy(tags.name).all();
}

export async function createTag(db: AppDb, data: TagInputData) {
  const id = createId();
  const slug = await uniqueSlug(data.slug || data.name, (s) => tagSlugExists(db, s));
  await db.insert(tags).values({ id, name: data.name, slug });
  return { id };
}

export async function updateTag(db: AppDb, id: string, data: TagInputData) {
  const slug = await uniqueSlug(data.slug || data.name, (s) => tagSlugExists(db, s, id));
  await db.update(tags).set({ name: data.name, slug }).where(eq(tags.id, id));
}

export async function deleteTag(db: AppDb, id: string) {
  await db.delete(postTags).where(eq(postTags.tagId, id));
  await db.delete(tags).where(eq(tags.id, id));
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------
export async function listCategories(db: AppDb) {
  return db.select().from(categories).orderBy(categories.order, categories.name).all();
}

export async function createCategory(db: AppDb, data: CategoryInputData) {
  const id = createId();
  const slug = await uniqueSlug(data.slug || data.name, (s) => categorySlugExists(db, s));
  await db
    .insert(categories)
    .values({
      id,
      name: data.name,
      slug,
      description: data.description,
      parentId: data.parentId,
      order: data.order ?? 0,
    });
  return { id };
}

export async function updateCategory(db: AppDb, id: string, data: CategoryInputData) {
  const slug = await uniqueSlug(data.slug || data.name, (s) => categorySlugExists(db, s, id));
  await db
    .update(categories)
    .set({
      name: data.name,
      slug,
      description: data.description,
      parentId: data.parentId,
      order: data.order ?? 0,
    })
    .where(eq(categories.id, id));
}

export async function deleteCategory(db: AppDb, id: string) {
  await db.delete(categories).where(eq(categories.id, id));
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function postSlugExists(db: AppDb, slug: string, excludeId?: string) {
  const row = await db.select({ id: posts.id }).from(posts).where(eq(posts.slug, slug)).get();
  return row ? row.id !== excludeId : false;
}
async function tagSlugExists(db: AppDb, slug: string, excludeId?: string) {
  const row = await db.select({ id: tags.id }).from(tags).where(eq(tags.slug, slug)).get();
  return row ? row.id !== excludeId : false;
}
async function categorySlugExists(db: AppDb, slug: string, excludeId?: string) {
  const row = await db.select({ id: categories.id }).from(categories).where(eq(categories.slug, slug)).get();
  return row ? row.id !== excludeId : false;
}
async function pageSlugExists(db: AppDb, slug: string, excludeId?: string) {
  const row = await db.select({ id: pages.id }).from(pages).where(eq(pages.slug, slug)).get();
  return row ? row.id !== excludeId : false;
}
export { pageSlugExists };

export async function getPostTags(db: AppDb, postId: string) {
  return db
    .select({ id: tags.id, name: tags.name, slug: tags.slug })
    .from(postTags)
    .innerJoin(tags, eq(postTags.tagId, tags.id))
    .where(eq(postTags.postId, postId))
    .all();
}

async function setPostTags(db: AppDb, postId: string, tagIds: string[]) {
  await db.delete(postTags).where(eq(postTags.postId, postId));
  if (tagIds.length) {
    await db.insert(postTags).values(tagIds.map((tagId) => ({ postId, tagId })));
  }
}
