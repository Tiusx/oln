import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { timestamps } from './_shared';

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------
export const categories = sqliteTable(
  'categories',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    description: text('description'),
    parentId: text('parent_id'),
    order: integer('order').notNull().default(0),
    ...timestamps,
  },
  (t) => ({
    categories_slug: index('idx_categories_slug').on(t.slug),
  }),
);

// ---------------------------------------------------------------------------
// Tags
// ---------------------------------------------------------------------------
export const tags = sqliteTable(
  'tags',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    ...timestamps,
  },
  (t) => ({
    tags_slug: index('idx_tags_slug').on(t.slug),
  }),
);
