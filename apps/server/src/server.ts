import type { Hono } from 'hono';
import type { AppBindings } from './middleware/auth';
import { errorHandler } from './middleware/error';
import { createApp } from './routes';

/** Build the Hono app with global error handling wired up. */
export function buildServer(): Hono<AppBindings> {
  const app = createApp();
  app.onError(errorHandler);
  return app;
}
