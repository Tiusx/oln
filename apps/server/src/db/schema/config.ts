import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// ---------------------------------------------------------------------------
// Site configuration (key -> JSON blob values)
// ---------------------------------------------------------------------------
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  // JSON-encoded value; shape is defined by the config service schema
  value: text('value').notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`)
    .$onUpdate(() => new Date()),
});

// ---------------------------------------------------------------------------
// Audit log lives here as it is infrastructure, not user-facing content
// ---------------------------------------------------------------------------
export const auditLogs = sqliteTable('audit_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  action: text('action').notNull(), // e.g. post.create, post.update, settings.save, login
  entityType: text('entity_type'),
  entityId: text('entity_id'),
  meta: text('meta'), // JSON
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});
