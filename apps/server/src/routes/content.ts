import { Hono } from 'hono';
import { withDb, loadUser, requireAuth, type AppBindings } from '../middleware/auth';
import { parseBody, ApiError } from '../lib/http';
import { pageSchema, linkSchema, subscriberCreateSchema, momentSchema, postStatusSchema, pageCommentsSchema } from '../schemas';
import {
  listPages,
  getPage,
  createPage,
  updatePage,
  updatePageComments,
  deletePage,
  listLinks,
  createLink,
  updateLink,
  deleteLink,
  listSubscribers,
  addSubscriber,
  deleteSubscriber,
} from '../services/content';
import {
  listMoments,
  getMoment,
  createMoment,
  updateMoment,
  updateMomentStatus,
  deleteMoment,
} from '../services/moments';

export function contentRoutes(): Hono<AppBindings> {
  const app = new Hono<AppBindings>();
  app.use('*', withDb);
  app.use('*', loadUser);
  app.use('*', requireAuth);

  // ---- Pages ----
  app.get('/pages', async (c) => c.json({ success: true, data: await listPages(c.get('db')) }));
  app.patch('/pages/:id/comments', async (c) => {
    const result = await updatePageComments(c.get('db'), c.req.param('id'), (await parseBody(c.req, pageCommentsSchema)).commentsEnabled);
    if (!result) throw new ApiError(404, 'Page not found');
    return c.json({ success: true, data: result });
  });
  app.get('/pages/:id', async (c) => {
    const row = await getPage(c.get('db'), c.req.param('id'));
    if (!row) throw new ApiError(404, 'Page not found');
    return c.json({ success: true, data: row });
  });
  app.post('/pages', async (c) => c.json({ success: true, data: await createPage(c.get('db'), await parseBody(c.req, pageSchema)) }));
  app.put('/pages/:id', async (c) => {
    const id = c.req.param('id');
    const result = await updatePage(c.get('db'), id, await parseBody(c.req, pageSchema));
    if (!result) throw new ApiError(404, 'Page not found');
    return c.json({ success: true, data: result });
  });
  app.delete('/pages/:id', async (c) => {
    await deletePage(c.get('db'), c.req.param('id'));
    return c.json({ success: true });
  });

  // ---- Friendly links ----
  app.get('/links', async (c) => c.json({ success: true, data: await listLinks(c.get('db'), true) }));
  app.post('/links', async (c) => c.json({ success: true, data: await createLink(c.get('db'), await parseBody(c.req, linkSchema)) }));
  app.put('/links/:id', async (c) => {
    await updateLink(c.get('db'), c.req.param('id'), await parseBody(c.req, linkSchema));
    return c.json({ success: true });
  });
  app.delete('/links/:id', async (c) => {
    await deleteLink(c.get('db'), c.req.param('id'));
    return c.json({ success: true });
  });

  // ---- Subscribers ----
  app.get('/subscribers', async (c) =>
    c.json({ success: true, data: await listSubscribers(c.get('db'), c.req.query('q')) }),
  );
  app.post('/subscribers', async (c) =>
    c.json({ success: true, data: await addSubscriber(c.get('db'), await parseBody(c.req, subscriberCreateSchema)) }),
  );
  app.delete('/subscribers/:id', async (c) => {
    await deleteSubscriber(c.get('db'), c.req.param('id'));
    return c.json({ success: true });
  });

  // ---- Moments (朋友圈 / 说说) ----
  app.get('/moments', async (c) => {
    const data = await listMoments(c.get('db'), {
      status: c.req.query('status'),
      q: c.req.query('q'),
      page: Number(c.req.query('page') || 1),
      limit: Number(c.req.query('limit') || 50),
    });
    return c.json({ success: true, data });
  });
  app.get('/moments/:id', async (c) => {
    const row = await getMoment(c.get('db'), c.req.param('id'));
    if (!row) throw new ApiError(404, 'Moment not found');
    return c.json({ success: true, data: row });
  });
  app.post('/moments', async (c) =>
    c.json({ success: true, data: await createMoment(c.get('db'), await parseBody(c.req, momentSchema)) }),
  );
  app.put('/moments/:id', async (c) => {
    const result = await updateMoment(c.get('db'), c.req.param('id'), await parseBody(c.req, momentSchema));
    if (!result) throw new ApiError(404, 'Moment not found');
    return c.json({ success: true, data: result });
  });
  app.patch('/moments/:id/status', async (c) => {
    const result = await updateMomentStatus(c.get('db'), c.req.param('id'), (await parseBody(c.req, postStatusSchema)).status);
    if (!result) throw new ApiError(404, 'Moment not found');
    return c.json({ success: true, data: result });
  });
  app.delete('/moments/:id', async (c) => {
    await deleteMoment(c.get('db'), c.req.param('id'));
    return c.json({ success: true });
  });

  return app;
}
