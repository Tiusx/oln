import { Hono } from 'hono';
import { withDb, loadUser, requireAuth, type AppBindings } from '../middleware/auth';
import { parseBody, ApiError } from '../lib/http';
import { postSchema, tagSchema, categorySchema } from '../schemas';
import {
  listPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
  listTags,
  createTag,
  updateTag,
  deleteTag,
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../services/posts';

export function postRoutes(): Hono<AppBindings> {
  const app = new Hono<AppBindings>();
  app.use('*', withDb);
  app.use('*', loadUser);
  app.use('*', requireAuth);

  // ---- Tags (registered before /:id to avoid param capture) ----
  app.get('/tags', async (c) => c.json({ success: true, data: await listTags(c.get('db')) }));
  app.post('/tags', async (c) => c.json({ success: true, data: await createTag(c.get('db'), await parseBody(c.req, tagSchema)) }));
  app.put('/tags/:id', async (c) => {
    await updateTag(c.get('db'), c.req.param('id'), await parseBody(c.req, tagSchema));
    return c.json({ success: true });
  });
  app.delete('/tags/:id', async (c) => {
    await deleteTag(c.get('db'), c.req.param('id'));
    return c.json({ success: true });
  });

  // ---- Categories (registered before /:id) ----
  app.get('/categories', async (c) => c.json({ success: true, data: await listCategories(c.get('db')) }));
  app.post('/categories', async (c) => c.json({ success: true, data: await createCategory(c.get('db'), await parseBody(c.req, categorySchema)) }));
  app.put('/categories/:id', async (c) => {
    await updateCategory(c.get('db'), c.req.param('id'), await parseBody(c.req, categorySchema));
    return c.json({ success: true });
  });
  app.delete('/categories/:id', async (c) => {
    await deleteCategory(c.get('db'), c.req.param('id'));
    return c.json({ success: true });
  });

  // ---- Post list ----
  app.get('/list', async (c) => {
    const db = c.get('db');
    const data = await listPosts(db, {
      status: c.req.query('status'),
      q: c.req.query('q'),
      tagId: c.req.query('tag'),
      categoryId: c.req.query('category'),
      page: Number(c.req.query('page') || 1),
      limit: Number(c.req.query('limit') || 50),
    });
    return c.json({ success: true, data });
  });

  // GET /admin/api/posts/:id
  app.get('/:id', async (c) => {
    const row = await getPost(c.get('db'), c.req.param('id'));
    if (!row) throw new ApiError(404, 'Post not found');
    return c.json({ success: true, data: row });
  });

  // POST /admin/api/posts
  app.post('/', async (c) => {
    const db = c.get('db');
    const authorId = c.get('user')!.userId;
    const body = await parseBody(c.req, postSchema);
    const result = await createPost(db, body, authorId);
    return c.json({ success: true, data: result });
  });

  // PUT /admin/api/posts/:id
  app.put('/:id', async (c) => {
    const db = c.get('db');
    const authorId = c.get('user')!.userId;
    const id = c.req.param('id');
    const body = await parseBody(c.req, postSchema);
    const result = await updatePost(db, id, body, authorId);
    if (!result) throw new ApiError(404, 'Post not found');
    return c.json({ success: true, data: result });
  });

  // DELETE /admin/api/posts/:id
  app.delete('/:id', async (c) => {
    await deletePost(c.get('db'), c.req.param('id'));
    return c.json({ success: true });
  });

  return app;
}
