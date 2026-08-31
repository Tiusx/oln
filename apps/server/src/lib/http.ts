import type { ZodSchema, ZodError } from 'zod';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function ok<T>(data: T) {
  return { success: true, data };
}

export function fail(message: string, status = 400) {
  return { success: false, error: message, status };
}

/** Parse JSON body against a zod schema; throws ApiError on invalid. */
export async function parseBody<T>(request: { json(): Promise<unknown> }, schema: ZodSchema<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new ApiError(400, 'Invalid JSON body');
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    const details = formatErrors(result.error);
    throw new ApiError(422, `Validation failed: ${details}`);
  }
  return result.data;
}

function formatErrors(err: ZodError): string {
  return err.issues
    .map((i) => `${i.path.join('.') || 'body'}: ${i.message}`)
    .join('; ');
}

export function handleError(err: unknown) {
  if (err instanceof ApiError) {
    return fail(err.message, err.status);
  }
  console.error('Unhandled error:', err);
  return fail('Internal server error', 500);
}
