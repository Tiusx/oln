import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { settings } from '../db/schema';
import type { AppDb } from '../db';

// ---------------------------------------------------------------------------
// Site-wide configuration schema
// The admin edits this as one document; the frontend consumes it as one blob
// (cached in KV for fast reads).
// ---------------------------------------------------------------------------

const socialSchema = z.object({
  label: z.string(),
  url: z.string(),
});

const navItemSchema = z.object({
  label: z.string(),
  url: z.string(),
  newWindow: z.boolean().default(false),
});

const builtinLinkSchema = z.object({
  label: z.string(),
  url: z.string(),
  enabled: z.boolean().default(true),
});

const DEFAULT_BUILTIN_LINKS = [
  { label: '友链', url: '/links', enabled: true },
  { label: '关于', url: '/about', enabled: true },
  { label: '留言板', url: '/message', enabled: true },
  { label: '一言', url: '/hitokoto', enabled: true },
];

export const siteConfigSchema = z.object({
  basic: z.object({
    siteName: z.string().default('My Blog'),
    tagline: z.string().default(''),
    logo: z.string().default(''),
    favicon: z.string().default(''),
    language: z.string().default('zh-CN'),
    timezone: z.string().default('Asia/Shanghai'),
    postsPerPage: z.coerce.number().int().min(1).max(50).default(10),
  }),
  seo: z.object({
    description: z.string().default(''),
    keywords: z.string().default(''),
    ogImage: z.string().default(''),
    enableSitemap: z.boolean().default(true),
    enableRobots: z.boolean().default(true),
  }),
  nav: z.object({
    menu: z.array(navItemSchema).default([]),
    builtin: z.object({
      show: z.boolean().default(true),
      links: z.array(builtinLinkSchema).default(DEFAULT_BUILTIN_LINKS),
    }).default({}),
  }),
  author: z.object({
    name: z.string().default(''),
    avatar: z.string().default(''),
    bio: z.string().default(''),
    socials: z.array(socialSchema).default([]),
  }),
  footer: z.object({
    footerText: z.string().default(''),
    beian: z.string().default(''),
  }),
  inject: z.object({
    headHtml: z.string().default(''),
    footHtml: z.string().default(''),
  }),
  features: z.object({
    comments: z.object({
      enabled: z.boolean().default(false),
      provider: z.enum(['self', 'giscus', 'utterances', 'waline']).default('self'),
      audit: z.boolean().default(true),
      giscusRepo: z.string().default(''),
      giscusRepoId: z.string().default(''),
      giscusCategory: z.string().default(''),
      giscusCategoryId: z.string().default(''),
      utterancesRepo: z.string().default(''),
      walineServerURL: z.string().default('https://waline.tius.cn'),
    }).default({}),
    newsletter: z.object({
      enabled: z.boolean().default(false),
    }).default({}),
    analytics: z.object({
      enabled: z.boolean().default(false),
      webAnalyticsToken: z.string().default(''),
    }).default({}),
  }),
});

export type SiteConfig = z.infer<typeof siteConfigSchema>;
export const DEFAULT_SITE_CONFIG: SiteConfig = siteConfigSchema.parse({ basic: {}, seo: {}, nav: {}, author: {}, footer: {}, inject: {}, features: {} });

const SETTINGS_KEY = 'site';
const CONFIG_CACHE_KEY = 'config:site';

/** Load the site config from D1 (no cache). */
export async function loadConfig(db: AppDb): Promise<SiteConfig> {
  const row = await db.select().from(settings).where(eq(settings.key, SETTINGS_KEY)).get();
  if (!row) return DEFAULT_SITE_CONFIG;
  const parsed = siteConfigSchema.safeParse(JSON.parse(row.value));
  return parsed.success ? parsed.data : DEFAULT_SITE_CONFIG;
}

/** Load the config with a KV read-through cache (public endpoints use this). */
export async function loadConfigCached(db: AppDb, cache: KVNamespace): Promise<SiteConfig> {
  const cached = await cache.get(CONFIG_CACHE_KEY, 'json');
  if (cached) return cached as SiteConfig;
  const config = await loadConfig(db);
  await cache.put(CONFIG_CACHE_KEY, JSON.stringify(config), { expirationTtl: 300 });
  return config;
}

/** Save the config; invalidates the cache. */
export async function saveConfig(
  db: AppDb,
  cache: KVNamespace,
  config: SiteConfig,
): Promise<SiteConfig> {
  const valid = siteConfigSchema.parse(config);
  await db
    .insert(settings)
    .values({ key: SETTINGS_KEY, value: JSON.stringify(valid) })
    .onConflictDoUpdate({ target: settings.key, set: { value: JSON.stringify(valid) } });
  await cache.delete(CONFIG_CACHE_KEY);
  return valid;
}

// ---------------------------------------------------------------------------
// Generic key -> value settings (feature flags, misc)
// ---------------------------------------------------------------------------
export async function getSetting(db: AppDb, key: string): Promise<string | null> {
  const row = await db.select().from(settings).where(eq(settings.key, key)).get();
  return row ? row.value : null;
}

export async function setSetting(db: AppDb, key: string, value: string): Promise<void> {
  await db
    .insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: settings.key, set: { value } });
}


