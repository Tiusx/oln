import { Hono } from 'hono';
import { eq, or } from 'drizzle-orm';
import { users } from '../db/schema';
import { withDb, loadUser, requireAuth, type AppBindings } from '../middleware/auth';
import { createSession, destroySession, clearSessionCookie } from '../services/session';
import { hashPassword, verifyPassword } from '../lib/password';
import { parseBody, ApiError } from '../lib/http';
import { loginSchema, changePasswordSchema } from '../schemas';
import { createId } from '../lib/ids';

export function authRoutes(): Hono<AppBindings> {
  const app = new Hono<AppBindings>();
  app.use('*', withDb);

  // POST /admin/api/auth/seed — one-time first admin bootstrap
  app.post('/seed', async (c) => {
    const db = c.get('db');
    const existing = await db.select({ id: users.id }).from(users).limit(1).get();
    if (existing) throw new ApiError(409, 'User already exists');
    const body = await parseBody(
      c.req,
      loginSchema.extend({
        displayName: loginSchema.shape.usernameOrEmail.optional(),
        email: loginSchema.shape.usernameOrEmail.optional(),
      }),
    );
    const ident = body.usernameOrEmail;
    const username = ident.includes('@') ? ident.split('@')[0] : ident;
    const email = body.email ?? (ident.includes('@') ? ident : `${ident}@local`);
    const passwordHash = await hashPassword(body.password);
    await db.insert(users).values({
      id: createId(),
      username,
      email,
      passwordHash,
      displayName: body.displayName ?? username,
      role: 'admin',
    });
    return c.json({ success: true });
  });

  // POST /admin/api/auth/login
  app.post('/login', async (c) => {
    const db = c.get('db');
    const body = await parseBody(c.req, loginSchema);
    const user = await db
      .select()
      .from(users)
      .where(or(eq(users.username, body.usernameOrEmail), eq(users.email, body.usernameOrEmail)))
      .get();
    if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
      throw new ApiError(401, 'Invalid credentials');
    }
    if (!user.active) throw new ApiError(403, 'Account disabled');
    const { setCookie } = await createSession(db, user.id);
    c.header('Set-Cookie', setCookie);
    return c.json({
      success: true,
      data: { id: user.id, username: user.username, displayName: user.displayName, role: user.role },
    });
  });

  // POST /admin/api/auth/logout
  app.post('/logout', loadUser, async (c) => {
    const db = c.get('db');
    await destroySession(db, c.req.raw.headers.get('cookie'));
    c.header('Set-Cookie', clearSessionCookie);
    return c.json({ success: true });
  });

  // GET /admin/api/auth/me
  app.get('/me', loadUser, requireAuth, async (c) => {
    const { user } = c.get('user')!;
    return c.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        role: user.role,
      },
    });
  });

  // POST /admin/api/auth/change-password
  app.post('/change-password', loadUser, requireAuth, async (c) => {
    const db = c.get('db');
    const { user } = c.get('user')!;
    const body = await parseBody(c.req, changePasswordSchema);
    const stored = await db.select().from(users).where(eq(users.id, user.id)).get();
    if (!stored || !(await verifyPassword(body.currentPassword, stored.passwordHash))) {
      throw new ApiError(401, 'Current password is incorrect');
    }
    const passwordHash = await hashPassword(body.newPassword);
    await db.update(users).set({ passwordHash }).where(eq(users.id, user.id));
    return c.json({ success: true });
  });

  return app;
}
