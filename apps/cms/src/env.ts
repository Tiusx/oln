export interface Env {
  DB: D1Database;
  MEDIA: R2Bucket;
  CACHE: KVNamespace;
  // Admin SPA static assets (served at /admin/*)
  ASSETS: Fetcher;
  // Optional: secret for signing CORS/CSRF if admin served on a different origin
  ADMIN_SECRET?: string;
  // Optional: direct link base for R2 public media, e.g. media.example.com
  R2_PUBLIC_URL?: string;
  // Environment
  ENVIRONMENT?: 'development' | 'production';
}
