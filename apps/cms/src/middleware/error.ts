import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { AppBindings } from './auth';
import { ApiError } from '../lib/http';

export async function errorHandler(err: unknown, c: Context<AppBindings>): Promise<Response> {
  if (err instanceof ApiError) {
    return c.json({ success: false, error: err.message }, err.status as any);
  }
  if (err instanceof HTTPException) {
    return c.json({ success: false, error: err.message }, err.status);
  }
  console.error('Unhandled error:', err);
  return c.json({ success: false, error: 'Internal server error' }, 500);
}
