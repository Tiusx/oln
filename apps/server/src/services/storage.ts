import { z } from 'zod';
import type { AppDb } from '../db';
import type { Env } from '../env';
import { getSetting, setSetting } from './config';
import { mediaUrl, MEDIA_PREFIX } from './media';

// ---------------------------------------------------------------------------
// Storage provider configuration (persisted in the settings table)
//   - local  : the deployment's own Cloudflare R2 bucket (MEDIA binding),
//              files stored under the `medias/` prefix.
//   - r2     : a Cloudflare R2 bucket reached via the S3 API (config-driven).
//   - s3     : any S3-compatible bucket reached via the S3 API (config-driven).
//   - github : a GitHub repository reached via the Contents API (a PAT token).
// ---------------------------------------------------------------------------

/**
 * Shared S3-compatible configuration used by both the `r2` (Cloudflare R2)
 * and `s3` (generic S3) providers. Config-driven: stored in D1, so it can be
 * edited in the admin UI without re-deploying.
 */
export const r2ConfigSchema = z.object({
  region: z.string().optional().default('auto'),
  endpoint: z.string().optional().default(''),
  publicUrl: z.string().optional().default(''),
  bucket: z.string().default(''),
  accessKeyId: z.string().default(''),
  secretAccessKey: z.string().default(''),
});

export const s3ConfigSchema = z.object({
  region: z.string().optional().default('auto'),
  endpoint: z.string().optional().default(''),
  publicUrl: z.string().optional().default(''),
  bucket: z.string().default(''),
  accessKeyId: z.string().default(''),
  secretAccessKey: z.string().default(''),
});

export const githubConfigSchema = z.object({
  repo: z.string().default(''),
  branch: z.string().optional().default('main'),
  path: z.string().default(''),
  token: z.string().default(''),
  publicUrl: z.string().optional().default(''),
});

export const storageConfigSchema = z.object({
  provider: z.enum(['local', 'r2', 's3', 'github']).default('local'),
  r2: r2ConfigSchema.default({}),
  s3: s3ConfigSchema.default({}),
  github: githubConfigSchema.default({}),
});

export type StorageConfig = z.infer<typeof storageConfigSchema>;
export type Provider = StorageConfig['provider'];
export type R2Config = StorageConfig['r2'];
export type S3Config = StorageConfig['s3'];

const STORAGE_KEY = 'storage_config';

export const DEFAULT_STORAGE_CONFIG: StorageConfig = storageConfigSchema.parse({});

/** Local media key prefix used by the built-in R2 (MEDIA) bucket. */
export const LOCAL_PREFIX = MEDIA_PREFIX;

/** Load the storage configuration. */
export async function loadStorageConfig(db: AppDb): Promise<StorageConfig> {
  const raw = await getSetting(db, STORAGE_KEY);
  if (!raw) return DEFAULT_STORAGE_CONFIG;
  try {
    const parsed = storageConfigSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : DEFAULT_STORAGE_CONFIG;
  } catch {
    return DEFAULT_STORAGE_CONFIG;
  }
}

/** Persist the storage configuration. */
export async function saveStorageConfig(db: AppDb, config: StorageConfig): Promise<StorageConfig> {
  const valid = storageConfigSchema.parse(config);
  await setSetting(db, STORAGE_KEY, JSON.stringify(valid));
  return valid;
}

/** All providers support live listing/management in this deployment. */
export const LISTABLE_PROVIDERS: Provider[] = ['local', 'r2', 's3', 'github'];

/** Whether a provider currently supports browsing/uploading resources. */
export function isListable(provider: string): boolean {
  return (LISTABLE_PROVIDERS as string[]).includes(provider);
}

// ---------------------------------------------------------------------------
// Shared type helpers
// ---------------------------------------------------------------------------
export interface StoredObject {
  key: string;
  name: string;
  size: number;
  uploaded?: string;
  type: 'image' | 'video' | 'other';
  url: string;
  provider: Provider;
}

function classify(key: string): 'image' | 'video' | 'other' {
  if (/\.(png|jpe?g|gif|webp|svg|avif|bmp|ico)$/i.test(key)) return 'image';
  if (/\.(mp4|webm|mov|m4v|ogv)$/i.test(key)) return 'video';
  return 'other';
}

const nameOf = (key: string) => key.split('/').pop() || key;

// ---------------------------------------------------------------------------
// Local (MEDIA R2 binding)
// ---------------------------------------------------------------------------
export async function listLocal(env: Env, prefix: string): Promise<StoredObject[]> {
  const listed = await env.MEDIA.list({ prefix: prefix || undefined, limit: 500 });
  return listed.objects
    .filter((o) => o.size > 0)
    .map((o) => ({
      key: o.key,
      name: nameOf(o.key),
      size: o.size,
      uploaded: o.uploaded ? new Date(o.uploaded).toISOString() : undefined,
      type: classify(o.key),
      url: mediaUrl(env, o.key),
      provider: 'local' as const,
    }));
}

export async function deleteLocal(env: Env, key: string): Promise<void> {
  await env.MEDIA.delete(key);
}

// ---------------------------------------------------------------------------
// Generic S3-compatible client (SigV4) — used by both `r2` and `s3` providers
// ---------------------------------------------------------------------------
const S3_SERVICE = 's3';

function s3Region(cfg: S3Config): string {
  return (cfg.region?.trim() || 'auto') || 'auto';
}

/** Path-style S3 endpoint base, e.g. https://<account>.r2.cloudflarestorage.com */
function s3Endpoint(cfg: S3Config): string {
  return (cfg.endpoint?.trim() || `https://s3.${s3Region(cfg)}.amazonaws.com`).replace(/\/$/, '') || '';
}

/** Object-level path-style URL: {endpoint}/{bucket}/{key...} */
function s3Target(cfg: S3Config, key: string): URL {
  const base = s3Endpoint(cfg);
  const path = [cfg.bucket, ...key.split('/').filter(Boolean)]
    .map(encodeURIComponent)
    .join('/');
  return new URL(`${base}/${path}`);
}

/** Bucket-level path-style URL (for list ops): {endpoint}/{bucket} */
function s3BucketUrl(cfg: S3Config): URL {
  return new URL(`${s3Endpoint(cfg)}/${encodeURIComponent(cfg.bucket)}`);
}

async function sha256hex(data: Uint8Array | string): Promise<string> {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function iso8601(date: Date): string {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, '');
}

function hmac(key: Uint8Array, data: string): Promise<Uint8Array> {
  return crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
    .then((k) => crypto.subtle.sign('HMAC', k, new TextEncoder().encode(data)))
    .then((buf) => new Uint8Array(buf));
}

async function hmacHex(key: Uint8Array, data: string): Promise<string> {
  const d = await hmac(key, data);
  return Array.from(d).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function sigv4Headers(
  cfg: S3Config,
  method: string,
  url: URL,
  payloadHash: string,
): Promise<Record<string, string>> {
  const now = new Date();
  const amzDate = iso8601(now);
  const dateStamp = amzDate.slice(0, 8);
  const host = url.host;
  const canonicalUri = url.pathname || '/';
  const canonicalQuery = url.search ? url.search.slice(1) : '';
  const region = s3Region(cfg);

  const canonicalHeaders =
    `host:${host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amzDate}\n`;
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';

  const canonicalRequest = [method, canonicalUri, canonicalQuery, canonicalHeaders, signedHeaders, payloadHash].join('\n');

  const scope = `${dateStamp}/${region}/${S3_SERVICE}/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    scope,
    await sha256hex(canonicalRequest),
  ].join('\n');

  const kDate = await hmac(new TextEncoder().encode(`AWS4${cfg.secretAccessKey}`), dateStamp);
  const kRegion = await hmac(kDate, region);
  const kService = await hmac(kRegion, S3_SERVICE);
  const kSigning = await hmac(kService, 'aws4_request');
  const signature = await hmacHex(kSigning, stringToSign);

  return {
    host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
    Authorization: `AWS4-HMAC-SHA256 Credential=${cfg.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
  };
}

async function s3Fetch(
  cfg: S3Config,
  method: string,
  url: URL,
  body?: Uint8Array,
  contentType?: string,
): Promise<Response> {
  const payloadHash = body ? await sha256hex(body) : await sha256hex('');
  const headers = await sigv4Headers(cfg, method, url, payloadHash);
  const init: RequestInit = { method, headers };
  if (body) init.body = body;
  if (contentType) (init.headers as Record<string, string>)['content-type'] = contentType;
  return fetch(url.toString(), init);
}

/** List objects in an S3 bucket via ListObjectsV2. */
export async function listS3(cfg: S3Config, prefix: string): Promise<StoredObject[]> {
  const url = s3BucketUrl(cfg);
  url.searchParams.set('list-type', '2');
  url.searchParams.set('max-keys', '500');
  if (prefix) url.searchParams.set('prefix', prefix);
  const res = await s3Fetch(cfg, 'GET', url);
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`S3 list failed (${res.status}): ${stripXml(text)}`);
  }
  const matches = [...text.matchAll(/<Contents>[\s\S]*?<\/Contents>/g)].map((m) => m[0]);
  const items: StoredObject[] = [];
  for (const c of matches) {
    const key = xmlField(c, 'Key') || '';
    const size = Number(xmlField(c, 'Size') || 0);
    if (!key) continue;
    items.push({
      key,
      name: nameOf(key),
      size,
      type: classify(key),
      url: s3PublicUrl(cfg, key),
      provider: 'r2',
    });
  }
  return items;
}

export async function deleteS3(cfg: S3Config, key: string): Promise<void> {
  const url = s3Target(cfg, key);
  const res = await s3Fetch(cfg, 'DELETE', url);
  if (!res.ok && res.status !== 404) {
    throw new Error(`S3 delete failed (${res.status}): ${stripXml(await res.text())}`);
  }
}

/** Upload an object via S3 PUT. Returns the public URL. */
export async function putS3(cfg: S3Config, key: string, body: Uint8Array, contentType: string): Promise<string> {
  const url = s3Target(cfg, key);
  const res = await s3Fetch(cfg, 'PUT', url, body, contentType);
  if (!res.ok) {
    throw new Error(`S3 upload failed (${res.status}): ${stripXml(await res.text())}`);
  }
  return s3PublicUrl(cfg, key);
}

/** Construct a public URL for an S3 object.
 *  Prefers cfg.publicUrl (custom domain), then falls back to S3 endpoint. */
export function s3PublicUrl(cfg: S3Config, key: string): string {
  const pub = cfg.publicUrl?.trim();
  if (pub) return `${pub.replace(/\/$/, '')}/${key}`;
  const base = s3Endpoint(cfg);
  return `${base}/${cfg.bucket}/${key}`;
}

/** Build the public-facing URL for an R2 object.
 *  Prefers cfg.publicUrl (custom domain), then falls back to S3 endpoint. */
export function r2Url(cfg: R2Config, key: string): string {
  const pub = cfg.publicUrl?.trim();
  if (pub) return `${pub.replace(/\/$/, '')}/${key}`;
  return s3PublicUrl(cfg, key);
}

/** Convert R2Config to S3Config so we can reuse the S3 client. */
function r2toS3(cfg: R2Config): S3Config {
  return { region: cfg.region, endpoint: cfg.endpoint, publicUrl: cfg.publicUrl, bucket: cfg.bucket, accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey };
}

export async function listR2(cfg: R2Config, prefix: string): Promise<StoredObject[]> {
  const items = await listS3(r2toS3(cfg), prefix);
  return items.map(it => ({ ...it, url: r2Url(cfg, it.key), provider: 'r2' as const }));
}

export async function deleteR2(cfg: R2Config, key: string): Promise<void> {
  await deleteS3(r2toS3(cfg), key);
}

export async function putR2(cfg: R2Config, key: string, body: Uint8Array, contentType: string): Promise<string> {
  await putS3(r2toS3(cfg), key, body, contentType);
  return r2Url(cfg, key);
}

function xmlField(xml: string, tag: string): string | null {
  const m = xml.match(new RegExp(`<${tag}>(.*?)<\\/${tag}>`));
  return m ? m[1] : null;
}

function stripXml(xml: string): string {
  return xml
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200);
}

// ---------------------------------------------------------------------------
// GitHub (Contents API)
// ---------------------------------------------------------------------------
function githubEndpoint(cfg: StorageConfig['github']): string {
  const repo = cfg.repo.replace(/^https?:\/\/(www\.)?github\.com\//, '').replace(/\.git$/, '').replace(/\/$/, '');
  const branch = cfg.branch || 'main';
  return `https://api.github.com/repos/${repo}/contents/${cfg.path.split('/').filter(Boolean).join('/')}?ref=${encodeURIComponent(branch)}`;
}

async function githubFetch(cfg: StorageConfig['github'], path: string, init?: RequestInit): Promise<Response> {
  const repo = cfg.repo.replace(/^https?:\/\/(www\.)?github\.com\//, '').replace(/\.git$/, '').replace(/\/$/, '');
  const url = `https://api.github.com/repos/${repo}/contents/${path.split('/').map(encodeURIComponent).join('/')}`;
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'oln-blog',
  };
  if (cfg.token) headers.Authorization = `Bearer ${cfg.token}`;
  return fetch(url, { ...init, headers: { ...headers, ...(init?.headers || {}) } });
}

/** List files in a remote GitHub folder via the Contents API. */
export async function listGithub(cfg: StorageConfig['github']): Promise<StoredObject[]> {
  const res = await githubFetch(cfg, cfg.path, { method: 'GET' });
  const body = await res.text();
  if (!res.ok) {
    throw new Error(`GitHub list failed (${res.status}): ${(stripJson(body) || body).slice(0, 200)}`);
  }
  let parsedBody: any;
  try {
    parsedBody = JSON.parse(body);
  } catch {
    throw new Error('GitHub returned an unexpected response.');
  }
  let entries: any = parsedBody;
  if (!Array.isArray(entries)) {
    // A single file or a non-directory response.
    if (entries && entries.type === 'file') entries = [entries];
    else return [];
  }
  return (entries as any[])
    .filter((e) => e && e.type === 'file' && typeof e.name === 'string')
    .map((e) => {
      const rel = normalizeRel(cfg.path, e.name);
      return {
        key: rel,
        name: e.name,
        size: e.size || 0,
        type: classify(e.name),
        url: githubRawUrl(cfg, rel),
        provider: 'github' as const,
      };
    });
}

function normalizeRel(path: string, name: string): string {
  return [...path.split('/').filter(Boolean), name].join('/');
}

export async function deleteGithub(cfg: StorageConfig['github'], key: string): Promise<void> {
  // key is e.g. uploads/foo.png ; we must delete relative to the repo root.
  const res = await githubFetch(cfg, key, { method: 'GET' });
  const body = await res.text();
  if (!res.ok) {
    if (res.status === 404) return;
    throw new Error(`GitHub delete failed (${res.status}): ${body.slice(0, 200)}`);
  }
  const file = JSON.parse(body);
  if (!file.sha) throw new Error('GitHub file has no sha.');
  const del = await githubFetch(cfg, key, {
    method: 'DELETE',
    body: JSON.stringify({ message: `Delete ${key}`, sha: file.sha }),
  });
  if (!del.ok) {
    throw new Error(`GitHub delete failed (${del.status}): ${(await del.text()).slice(0, 200)}`);
  }
}

/** Construct a raw.githubusercontent.com URL for a stored GitHub file. */
export function githubRawUrl(cfg: StorageConfig['github'], key: string): string {
  const repo = cfg.repo.replace(/^https?:\/\/(www\.)?github\.com\//, '').replace(/\.git$/, '').replace(/\/$/, '');
  const branch = cfg.branch || 'main';
  const encoded = key.split('/').filter(Boolean).map(encodeURIComponent).join('/');
  const pub = cfg.publicUrl?.trim();
  if (pub) return `${pub.replace(/\/$/, '')}/${repo}/${encodeURIComponent(branch)}/${encoded}`;
  return `https://raw.githubusercontent.com/${repo}/${encodeURIComponent(branch)}/${encoded}`;
}

function stripJson(s: string): string {
  try {
    const o = JSON.parse(s);
    if (o && o.message) return `message: ${o.message}`;
  } catch { /* not json */ }
  return s;
}

// ---------------------------------------------------------------------------
// Provider dispatch (list / delete / URL) used by the resource library
// ---------------------------------------------------------------------------
export async function listProvider(
  env: Env,
  cfg: StorageConfig,
  provider: Provider,
  prefix: string,
): Promise<StoredObject[]> {
  switch (provider) {
    case 'local':
      return listLocal(env, prefix);
    case 'r2':
      return listR2(cfg.r2, prefix);
    case 's3':
      return listS3(cfg.s3, prefix);
    case 'github':
      return listGithub(cfg.github);
  }
}

export async function deleteProvider(
  env: Env,
  cfg: StorageConfig,
  provider: Provider,
  key: string,
): Promise<void> {
  switch (provider) {
    case 'local':
      return deleteLocal(env, key);
    case 'r2':
      return deleteR2(cfg.r2, key);
    case 's3':
      return deleteS3(cfg.s3, key);
    case 'github':
      return deleteGithub(cfg.github, key);
  }
}

/** Upload a resource to the selected provider. Returns the public URL. */
export async function putProvider(
  env: Env,
  cfg: StorageConfig,
  provider: Provider,
  key: string,
  body: Uint8Array,
  contentType: string,
): Promise<string> {
  switch (provider) {
    case 'local': {
      await env.MEDIA.put(key, body, { httpMetadata: { contentType } });
      return mediaUrl(env, key);
    }
    case 'r2':
      return putR2(cfg.r2, key, body, contentType);
    case 's3':
      return putS3(cfg.s3, key, body, contentType);
    case 'github':
      throw new Error('GitHub provider does not support direct upload via this deployment.');
  }
}

// ---------------------------------------------------------------------------
// Connectivity test
// ---------------------------------------------------------------------------
export interface ConnTestResult {
  ok: boolean;
  message: string;
}

export async function testProvider(env: Env, cfg: StorageConfig): Promise<ConnTestResult> {
  switch (cfg.provider) {
    case 'local': {
      try {
        await env.MEDIA.list({ limit: 1 });
        return { ok: true, message: '本地存储（R2 MEDIA 桶）连接正常，资源位于 medias/ 前缀下。' };
      } catch (e: any) {
        return { ok: false, message: `本地存储不可用: ${e?.message || e}` };
      }
    }
    case 'r2': {
      try {
        const items = await listR2(cfg.r2, '');
        return { ok: true, message: `R2 连接成功，共列出 ${items.length} 个对象。` };
      } catch (e: any) {
        return { ok: false, message: `R2 连接失败: ${e?.message || e}` };
      }
    }
    case 's3': {
      try {
        const items = await listS3(cfg.s3, '');
        return { ok: true, message: `S3 连接成功，共列出 ${items.length} 个对象。` };
      } catch (e: any) {
        return { ok: false, message: `S3 连接失败: ${e?.message || e}` };
      }
    }
    case 'github': {
      try {
        const items = await listGithub(cfg.github);
        return { ok: true, message: `GitHub 连接成功，目录下共 ${items.length} 个文件。` };
      } catch (e: any) {
        return { ok: false, message: `GitHub 连接失败: ${e?.message || e}` };
      }
    }
  }
}
