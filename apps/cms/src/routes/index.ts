import { Hono } from 'hono';
import type { AppBindings } from '../middleware/auth';
import { authRoutes } from './auth';
import { postRoutes } from './posts';
import { contentRoutes } from './content';
import { configRoutes } from './config';
import { mediaRoutes } from './media';
import { publicRoutes } from './public';

/**
 * Full API app.
 *  - /admin/api/* — authenticated admin API (backing the admin SPA)
 *  - /api/public/* — public read API (backing the Astro frontend)
 */
export function createApp(): Hono<AppBindings> {
  const app = new Hono<AppBindings>();
  app.route('/admin/api', adminApi());
  app.route('/api/public', publicRoutes());
  return app;
}

function adminApi(): Hono<AppBindings> {
  const app = new Hono<AppBindings>();
  app.route('/auth', authRoutes());
  app.route('/posts', postRoutes());
  app.route('/content', contentRoutes());
  app.route('/config', configRoutes());
  app.route('/media', mediaRoutes());
  return app;
}
