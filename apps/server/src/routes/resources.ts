import { Hono } from 'hono';
import { withDb, loadUser, requireAuth, type AppBindings } from '../middleware/auth';
import { ApiError } from '../lib/http';
import { mediaUrl } from '../services/media';
import { loadStorageConfig, isListable } from '../services/storage';

export function resourceRoutes(): Hono<AppBindings> {
  const app = new Hono<AppBindings>();
  app.use('*', withDb);
  app.use('*', loadUser);
  app.use('*', requireAuth);

  // GET /admin/api/resources/list?provider=local|r2|github
  app.get('/list', async (c) => {
    const db = c.get('db');
    const provider = (c.req.query('provider') || 'local') as 'local' | 'r2' | 'github';
    const config = await loadStorageConfig(db);
    const activeProvider = (['local', 'r2', 'github'].includes(provider) ? provider : config.provider) as 'local' | 'r2' | 'github';

    // 仅本地（R2/MEDIA）支持实时浏览；第三方仅保存配置、返回空列表并附说明
    if (!isListable(activeProvider)) {
      return c.json({
        success: true,
        data: [],
        listable: false,
        message: '该第三方存储当前仅保存配置，实时浏览尚未接入（仅本地存储可用）。请在「存储配置」中切换到本地存储。',
      });
    }

    const prefix = c.req.query('prefix') || '';
    const listed = await c.env.MEDIA.list({ prefix: prefix || undefined, limit: 200 });
    const items = listed.objects.map((o) => {
      const isImage = /\.(png|jpe?g|gif|webp|svg|avif|bmp|ico)$/i.test(o.key);
      const isVideo = /\.(mp4|webm|mov|m4v|ogv)$/i.test(o.key);
      return {
        key: o.key,
        name: o.key.split('/').pop() || o.key,
        url: mediaUrl(c.env, o.key),
        size: o.size,
        uploaded: o.uploaded,
        type: isImage ? 'image' : isVideo ? 'video' : 'other',
        provider: activeProvider,
      };
    });
    return c.json({ success: true, data: items, listable: true });
  });

  // DELETE /admin/api/resources/:key — delete a resource on the active provider
  app.delete('/:key', async (c) => {
    const db = c.get('db');
    const provider = (c.req.query('provider') || 'local') as 'local' | 'r2' | 'github';
    const config = await loadStorageConfig(db);
    const active = (['local', 'r2', 'github'].includes(provider) ? provider : config.provider) as 'local' | 'r2' | 'github';
    if (!isListable(active)) {
      throw new ApiError(400, '第三方存储当前仅保存配置，暂不支持删除操作');
    }
    const key = decodeURIComponent(c.req.param('key'));
    await c.env.MEDIA.delete(key);
    return c.json({ success: true });
  });

  return app;
}
