import { createMiddleware } from 'hono/factory';
import { eq } from 'drizzle-orm';
import { users } from '../db/schema';
import { createDb, type AppDb } from '../db';
import { findSession } from '../services/session';
import type { Env } from '../env';

export type AuthContext = {
  userId: string;
  user: typeof users.$inferSelect;
};

export type AppBindings = {
  Bindings: Env;
  Variables: {
    db: AppDb;
    user?: AuthContext;
  };
};

/** Attach the drizzle client to context. Mount first in every route group. */
export const withDb = createMiddleware<AppBindings>(async (c, next) => {
  c.set('db', createDb(c.env.DB));
  await next();
});

/** Resolve the current user from the session cookie, if any. */
export const loadUser = createMiddleware<AppBindings>(async (c, next) => {
  const db = c.get('db');
  const session = await findSession(db, c.req.raw.headers.get('cookie'));
  if (session && session.expiresAt.getTime() > Date.now()) {
    const user = await db.select().from(users).where(eq(users.id, session.userId)).get();
    if (user && user.active) {
      c.set('user', { userId: user.id, user });
    }
  }
  await next();
});

/** Reject with 401 when there is no authenticated user. */
export const requireAuth = createMiddleware<AppBindings>(async (c, next) => {
  const user = c.get('user');
  if (!user) return c.json({ success: false, error: 'unauthorized' }, 401);
  await next();
});
