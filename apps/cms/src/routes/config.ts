import { Hono } from 'hono';
import { withDb, loadUser, requireAuth, type AppBindings } from '../middleware/auth';
import { loadConfig, saveConfig, siteConfigSchema } from '../services/config';
import { ApiError } from '../lib/http';

export function configRoutes(): Hono<AppBindings> {
  const app = new Hono<AppBindings>();
  app.use('*', withDb);
  app.use('*', loadUser);
  app.use('*', requireAuth);

  // GET /admin/api/config — current site config
  app.get('/', async (c) => {
    const db = c.get('db');
    const config = await loadConfig(db);
    return c.json({ success: true, data: config });
  });

  // PUT /admin/api/config — save full site config (validated)
  app.put('/', async (c) => {
    const db = c.get('db');
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      throw new ApiError(400, 'Invalid JSON body');
    }
    const parsed = siteConfigSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(422, `Validation failed: ${parsed.error.issues.map((i) => i.message).join('; ')}`);
    }
    const saved = await saveConfig(db, c.env.CACHE, parsed.data);
    return c.json({ success: true, data: saved });
  });

  return app;
}
