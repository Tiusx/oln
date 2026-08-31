import { Hono } from 'hono';
import { withDb, loadUser, requireAuth, type AppBindings } from '../middleware/auth';
import { ApiError } from '../lib/http';
import { makeKey, exceedsLimit, isAllowedType, mediaUrl } from '../services/media';

export function mediaRoutes(): Hono<AppBindings> {
  const app = new Hono<AppBindings>();
  app.use('*', withDb);
  app.use('*', loadUser);
  app.use('*', requireAuth);

  // POST /admin/api/media/upload — multipart upload to R2
  app.post('/upload', async (c) => {
    const form = await c.req.formData();
    const entry = form.get('file');
    if (entry == null || typeof entry === 'string') {
      throw new ApiError(400, 'Missing "file" field');
    }
    const file = entry as File;
    if (exceedsLimit(file.size)) throw new ApiError(413, 'File too large (max 20 MB)');
    if (!isAllowedType(file.type)) throw new ApiError(415, `Unsupported type: ${file.type}`);

    const filename = file.name || 'file';
    const key = makeKey(filename, file.type);
    const buffer = new Uint8Array(await file.arrayBuffer());
    await c.env.MEDIA.put(key, buffer, {
      httpMetadata: { contentType: file.type },
    });

    return c.json({ success: true, data: { key, url: mediaUrl(c.env, key) } });
  });

  // GET /admin/api/media?prefix= — list recent uploads (by key)
  app.get('/list', async (c) => {
    const prefix = c.req.query('prefix') || '';
    const listed = await c.env.MEDIA.list({ prefix, limit: 100 });
    const items = listed.objects.map((o) => ({
      key: o.key,
      size: o.size,
      uploaded: o.uploaded,
      url: mediaUrl(c.env, o.key),
    }));
    return c.json({ success: true, data: items });
  });

  // DELETE /admin/api/media/:key — delete an object
  app.delete('/:key', async (c) => {
    const key = c.req.param('key');
    await c.env.MEDIA.delete(key);
    return c.json({ success: true });
  });

  return app;
}
