import { and, desc, eq, like, sql } from 'drizzle-orm';
import { moments } from '../db/schema';
import type { AppDb } from '../db';
import { createId } from '../lib/ids';
import { renderMarkdown } from './markdown';

export interface MomentInputData {
  content?: string;
  status?: 'draft' | 'published';
  pinned?: boolean;
}

export interface MomentListOptions {
  status?: string;
  q?: string;
  page?: number;
  limit?: number;
}

export async function listMoments(db: AppDb, opts: MomentListOptions = {}) {
  const page = Math.max(Number(opts.page || 1), 1);
  const limit = Math.min(Math.max(Number(opts.limit || 50), 1), 100);
  const offset = (page - 1) * limit;
  const conditions: any[] = [];
  if (opts.status) conditions.push(eq(moments.status, opts.status));
  if (opts.q) conditions.push(like(moments.content, `%${opts.q}%`));
  const where = conditions.length ? and(...conditions) : undefined;

  const total =
    (await db.select({ count: sql<number>`count(*)` }).from(moments).where(where).get())?.count ?? 0;
  const items = await db
    .select()
    .from(moments)
    .where(where)
    .orderBy(desc(moments.pinned), desc(moments.createdAt))
    .limit(limit)
    .offset(offset)
    .all();

  return { items, total, page, limit };
}

export async function getMoment(db: AppDb, id: string) {
  return db.select().from(moments).where(eq(moments.id, id)).get();
}

export async function createMoment(db: AppDb, data: MomentInputData) {
  const id = createId();
  const content = data.content ?? '';
  await db.insert(moments).values({
    id,
    content,
    contentHtml: content ? renderMarkdown(content) : null,
    status: data.status ?? 'draft',
    pinned: data.pinned ?? false,
  });
  return { id };
}

export async function updateMoment(db: AppDb, id: string, data: MomentInputData) {
  const existing = await db.select().from(moments).where(eq(moments.id, id)).get();
  if (!existing) return null;
  const content = data.content ?? existing.content;
  await db
    .update(moments)
    .set({
      content,
      contentHtml: content ? renderMarkdown(content) : null,
      status: data.status ?? existing.status,
      pinned: data.pinned ?? existing.pinned,
    })
    .where(eq(moments.id, id));
  return { id };
}

export async function updateMomentStatus(db: AppDb, id: string, status: 'draft' | 'published') {
  const existing = await db.select().from(moments).where(eq(moments.id, id)).get();
  if (!existing) return null;
  await db.update(moments).set({ status }).where(eq(moments.id, id));
  return { id };
}

export async function deleteMoment(db: AppDb, id: string) {
  await db.delete(moments).where(eq(moments.id, id));
}