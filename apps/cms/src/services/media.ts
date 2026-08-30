import type { Env } from '../env';

const extByType: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/svg+xml': 'svg',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'application/pdf': 'pdf',
};

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // 20 MB

/** Derive an object key: <yyyy>/<MM>/<random>.<ext> */
export function makeKey(filename: string, contentType: string): string {
  const ext = extByType[contentType] || (filename.split('.').pop() || 'bin');
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const rand = crypto.getRandomValues(new Uint8Array(8));
  const name = Array.from(rand, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${y}/${m}/${name}.${ext}`;
}

/** Validate content length against the cap. */
export function exceedsLimit(contentLength: number | null): boolean {
  return contentLength !== null && contentLength > MAX_UPLOAD_BYTES;
}

export function isAllowedType(contentType: string): boolean {
  return contentType in extByType;
}

/** Build the public-facing URL for a stored media key. */
export function mediaUrl(env: Env, key: string): string {
  if (env.R2_PUBLIC_URL) {
    return `${env.R2_PUBLIC_URL.replace(/\/$/, '')}/${key}`;
  }
  return `/api/public/media/${key}`;
}
