import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { timestamps } from './_shared';
import { categories, tags } from './taxonomy';

// ---------------------------------------------------------------------------
// Posts
// ---------------------------------------------------------------------------
export const posts = sqliteTable(
  'posts',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    slug: text('slug').notNull().unique(),
    excerpt: text('excerpt'),
    // Markdown body
    content: text('content').notNull().default(''),
    // Rendered HTML (produced at request time / cached in KV)
    contentHtml: text('content_html'),
    categoryId: text('category_id').references(() => categories.id, {
      onDelete: 'set null',
    }),
    coverImage: text('cover_image'),
    status: text('status').notNull().default('draft'), // draft | published
    pinned: integer('pinned', { mode: 'boolean' }).notNull().default(false),
    commentsEnabled: integer('comments_enabled', { mode: 'boolean' }).notNull().default(true),
    publishedAt: integer('published_at', { mode: 'timestamp_ms' }),
    authorId: text('author_id'),
    // SEO custom fields (optional per post)
    seoTitle: text('seo_title'),
    seoDescription: text('seo_description'),
    ...timestamps,
  },
  (t) => ({
    posts_slug: index('idx_posts_slug').on(t.slug),
    posts_status: index('idx_posts_status').on(t.status),
    posts_published: index('idx_posts_published').on(t.publishedAt),
    posts_category: index('idx_posts_category').on(t.categoryId),
  }),
);

// ---------------------------------------------------------------------------
// Post <-> Tag many-to-many join
// ---------------------------------------------------------------------------
export const postTags = sqliteTable(
  'post_tags',
  {
    postId: text('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    tagId: text('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (t) => ({
    post_tags_post: index('idx_post_tags_post').on(t.postId),
    post_tags_tag: index('idx_post_tags_tag').on(t.tagId),
  }),
);

// ---------------------------------------------------------------------------
// Pages (about, links page, custom pages)
// ---------------------------------------------------------------------------
export const pages = sqliteTable(
  'pages',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    slug: text('slug').notNull().unique(),
    content: text('content').notNull().default(''),
    contentHtml: text('content_html'),
    status: text('status').notNull().default('published'), // draft | published
    commentsEnabled: integer('comments_enabled', { mode: 'boolean' }).notNull().default(true),
    showInMenu: integer('show_in_menu', { mode: 'boolean' }).notNull().default(false),
    menuOrder: integer('menu_order').notNull().default(0),
    ...timestamps,
  },
  (t) => ({
    pages_slug: index('idx_pages_slug').on(t.slug),
  }),
);

// ---------------------------------------------------------------------------
// Moments (朋友圈 / 说说 — short status updates on a timeline)
// ---------------------------------------------------------------------------
export const moments = sqliteTable(
  'moments',
  {
    id: text('id').primaryKey(),
    content: text('content').notNull().default(''),
    contentHtml: text('content_html'),
    status: text('status').notNull().default('draft'), // draft | published
    pinned: integer('pinned', { mode: 'boolean' }).notNull().default(false),
    ...timestamps,
  },
  (t) => ({
    moments_status: index('idx_moments_status').on(t.status),
    moments_created: index('idx_moments_created').on(t.createdAt),
  }),
);
