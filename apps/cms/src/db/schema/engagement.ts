import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { timestamps } from './_shared';
import { posts } from './content';

// ---------------------------------------------------------------------------
// Friendly links (友链)
// ---------------------------------------------------------------------------
export const links = sqliteTable('links', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  url: text('url').notNull(),
  description: text('description'),
  avatar: text('avatar'),
  order: integer('order').notNull().default(0),
  status: text('status').notNull().default('active'), // active | hidden
  ...timestamps,
});

// ---------------------------------------------------------------------------
// Email newsletter subscribers
// ---------------------------------------------------------------------------
export const subscribers = sqliteTable(
  'subscribers',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull().unique(),
    name: text('name'),
    subscribedAt: integer('subscribed_at', { mode: 'timestamp_ms' })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    active: integer('active', { mode: 'boolean' }).notNull().default(true),
  },
  (t) => ({
    subscribers_email: index('idx_subscribers_email').on(t.email),
  }),
);

// ---------------------------------------------------------------------------
// Comments (self-hosted option)
// ---------------------------------------------------------------------------
export const comments = sqliteTable(
  'comments',
  {
    id: text('id').primaryKey(),
    postId: text('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    parentId: text('parent_id'),
    authorName: text('author_name').notNull(),
    authorEmail: text('author_email'),
    content: text('content').notNull(),
    status: text('status').notNull().default('pending'), // pending | approved | spam
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => ({
    comments_post: index('idx_comments_post').on(t.postId),
    comments_status: index('idx_comments_status').on(t.status),
  }),
);

// ---------------------------------------------------------------------------
// Hitokoto (一言)
// ---------------------------------------------------------------------------
export const hitokoto = sqliteTable('hitokoto', {
  id: text('id').primaryKey(),
  content: text('content').notNull(),
  creator: text('creator'),
  order: integer('order').notNull().default(0),
});
