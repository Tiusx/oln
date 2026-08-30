import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';

export type DB = D1Database;

export function createDb(db: DB) {
  return drizzle(db, { schema });
}

export type AppDb = ReturnType<typeof createDb>;
