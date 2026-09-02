import { Hono } from 'hono';
import { withDb, loadUser, requireAuth, type AppBindings } from '../middleware/auth';
import { ApiError } from '../lib/http';
import { loadStorageConfig, listProvider, deleteProvider, isListable, type Provider } from '../services/storage';

export function resourceRoutes(): Hono<AppBindings> {
  const app = new Hono<AppBindings>();
  app.use('*', withDb);
  app.use('*', loadUser);
  app.use('*', requireAuth);

  const resolveProvider = (req: string, configured: Provider | undefined): Provider => {
    const p = req as Provider;
    if ((['local', 'r2', 's3', 'github'] as Provider[]).includes(p)) return p;
    return configured || 'local';
  };

  // GET /admin/api/resources/list?provider=local|r2|s3|github&prefix=...
  app.get('/list', async (c) => {
    const db = c.get('db');
    const config = await loadStorageConfig(db);
    const activeProvider = resolveProvider(c.req.query('provider') || '', config.provider);

    if (!isListable(activeProvider)) {
      return c.json({
        success: true,
        data: [],
        listable: false,
        message: '该第三方存储当前仅保存配置，实时浏览尚未接入（仅本地存储可用）。请在「存储配置」中切换到本地存储。',
      });
    }

    const prefix = c.req.query('prefix') || '';
    try {
      const items = await listProvider(c.env, config, activeProvider, prefix);
      return c.json({ success: true, data: items, listable: true });
    } catch (e: any) {
      throw new ApiError(502, `资源列表获取失败: ${e?.message || e}`);
    }
  });

  // DELETE /admin/api/resources/:key?provider=... — delete a resource on the chosen provider
  app.delete('/:key', async (c) => {
    const db = c.get('db');
    const config = await loadStorageConfig(db);
    const activeProvider = resolveProvider(c.req.query('provider') || '', config.provider);
    if (!isListable(activeProvider)) {
      throw new ApiError(400, '第三方存储当前仅保存配置，暂不支持删除操作');
    }
    const key = decodeURIComponent(c.req.param('key'));
    if (!key) throw new ApiError(400, 'Missing key');
    try {
      await deleteProvider(c.env, config, activeProvider, key);
      return c.json({ success: true });
    } catch (e: any) {
      throw new ApiError(502, `资源删除失败: ${e?.message || e}`);
    }
  });

  return app;
}
