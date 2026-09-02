import { Hono } from 'hono';
import { withDb, loadUser, requireAuth, type AppBindings } from '../middleware/auth';
import { loadConfig, saveConfig, siteConfigSchema } from '../services/config';
import {
  loadStorageConfig,
  saveStorageConfig,
  storageConfigSchema,
  testProvider,
} from '../services/storage';
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

  // GET /admin/api/config/storage — storage provider config
  app.get('/storage', async (c) => {
    const db = c.get('db');
    const config = await loadStorageConfig(db);
    return c.json({ success: true, data: config });
  });

  // PUT /admin/api/config/storage — persist storage config
  app.put('/storage', async (c) => {
    const db = c.get('db');
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      throw new ApiError(400, 'Invalid JSON body');
    }
    const parsed = storageConfigSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(422, `Validation failed: ${parsed.error.issues.map((i) => i.message).join('; ')}`);
    }
    const saved = await saveStorageConfig(db, parsed.data);
    return c.json({ success: true, data: saved });
  });

  // POST /admin/api/config/storage/test — validate connectivity for the selected provider
  app.post('/storage/test', async (c) => {
    const db = c.get('db');
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      throw new ApiError(400, 'Invalid JSON body');
    }
    const parsed = storageConfigSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(422, `Validation failed: ${parsed.error.issues.map((i) => i.message).join('; ')}`);
    }
    const result = await testProvider(c.env, parsed.data);
    return c.json({
      success: true,
      data: {
        status: result.ok ? 'ok' : 'error',
        message: result.message,
      },
    });
  });

  return app;
}

