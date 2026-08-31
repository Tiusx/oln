import { sql } from 'drizzle-orm';
import { integer } from 'drizzle-orm/sqlite-core';

/** Common created/updated timestamp columns for tables. */
export const timestamps = {
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`)
    .$onUpdate(() => new Date()),
};
