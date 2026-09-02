import { Hono } from 'hono';
import { withDb, loadUser, requireAuth, type AppBindings } from '../middleware/auth';
import { ApiError } from '../lib/http';
import { makeKey, exceedsLimit, isAllowedType } from '../services/media';
import { loadStorageConfig, putProvider, listProvider, deleteProvider, type Provider } from '../services/storage';

export function mediaRoutes(): Hono<AppBindings> {
  const app = new Hono<AppBindings>();
  app.use('*', withDb);
  app.use('*', loadUser);
  app.use('*', requireAuth);

  // POST /admin/api/media/upload — multipart upload to the active storage provider
  app.post('/upload', async (c) => {
    const form = await c.req.formData();
    const entry = form.get('file');
    if (entry == null || typeof entry === 'string') {
      throw new ApiError(400, 'Missing "file" field');
    }
    const file = entry as File;
    if (exceedsLimit(file.size)) throw new ApiError(413, 'File too large (max 20 MB)');
    if (!isAllowedType(file.type)) throw new ApiError(415, `Unsupported type: ${file.type}`);

    const db = c.get('db');
    const config = await loadStorageConfig(db);
    // Optional target provider from query; defaults to the active config provider.
    const reqProvider = c.req.query('provider') as Provider | undefined;
    const provider: Provider = (reqProvider && ['local', 'r2', 's3', 'github'].includes(reqProvider))
      ? reqProvider
      : config.provider;
    if (provider === 'github') {
      throw new ApiError(400, 'GitHub provider does not support direct upload.');
    }

    const filename = file.name || 'file';
    const key = makeKey(filename, file.type);
    const buffer = new Uint8Array(await file.arrayBuffer());
    const url = await putProvider(c.env, config, provider, key, buffer, file.type);

    return c.json({ success: true, data: { key, url, provider } });
  });

  // GET /admin/api/media?prefix= — list recent uploads (by key) on the active provider
  app.get('/list', async (c) => {
    const db = c.get('db');
    const config = await loadStorageConfig(db);
    const prefix = c.req.query('prefix') || '';
    const provider: Provider = config.provider;
    const items = await listProvider(c.env, config, provider, prefix);
    return c.json({ success: true, data: items });
  });

  // DELETE /admin/api/media/:key — delete an object on the active provider
  app.delete('/:key', async (c) => {
    const db = c.get('db');
    const config = await loadStorageConfig(db);
    const provider: Provider = config.provider;
    const key = decodeURIComponent(c.req.param('key'));
    await deleteProvider(c.env, config, provider, key);
    return c.json({ success: true });
  });

  return app;
}