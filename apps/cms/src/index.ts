import { buildServer } from './server';
import type { Env } from './env';

const server = buildServer();

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Normalize /admin -> /admin/
    if (path === '/admin') {
      return Response.redirect(new URL('/admin/', url.origin).toString(), 301);
    }

    // Admin SPA - serve static assets; note /admin/api must be excluded.
    if (request.method === 'GET' && path.startsWith('/admin') && !path.startsWith('/admin/api')) {
      return serveAdmin(env.ASSETS, request, url, path);
    }

    // Bare root -> admin dashboard
    if (path === '/' || path === '') {
      return Response.redirect(new URL('/admin/', url.origin).toString(), 301);
    }

    return server.fetch(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;

async function serveAdmin(assets: Fetcher, request: Request, url: URL, path: string): Promise<Response> {
  const normalizedPath = path === '/admin/' ? '/index.html' : path.replace(/^\/admin/, '') || '/index.html';
  const assetUrl = new URL(normalizedPath, url.origin).toString();
  const assetReq = new Request(assetUrl, { method: request.method, headers: request.headers });
  const res = await assets.fetch(assetReq);

  if (res.status === 200) return res;

  const indexReq = new Request(new URL('/index.html', url.origin).toString(), { method: 'GET', headers: request.headers });
  return assets.fetch(indexReq);
}

