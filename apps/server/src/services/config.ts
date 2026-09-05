import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { settings, pages } from '../db/schema';
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
  // 'page' entries reference a page row (label/url are overridden by the page);
  // 'link' entries are plain custom menu items;
  // 'builtin' entries are the built-in nav links (文章/归档/…) kept in the same
  // unified list — they cannot be deleted, only hidden via `enabled`.
  type: z.enum(['page', 'link', 'builtin']).default('link'),
  label: z.string(),
  url: z.string(),
  pageId: z.string().optional(),
  newWindow: z.boolean().default(false),
  enabled: z.boolean().default(true),
});

const builtinLinkSchema = z.object({
  label: z.string(),
  url: z.string(),
  enabled: z.boolean().default(true),
});

const DEFAULT_BUILTIN_LINKS = [
  { label: '文章', url: '/posts', enabled: true },
  { label: '归档', url: '/archive', enabled: true },
  { label: '标签', url: '/tags', enabled: true },
  { label: '友链', url: '/links', enabled: true },
  { label: '关于', url: '/about', enabled: true },
  { label: '留言板', url: '/message', enabled: true },
  { label: '一言', url: '/hitokoto', enabled: true },
];

// The built-in nav links live inside the unified `nav.menu` list as
// `type: 'builtin'` entries (fresh sites ship with them as the default menu).
const DEFAULT_NAV_MENU = DEFAULT_BUILTIN_LINKS.map((l) => ({ type: 'builtin' as const, ...l }));

// Available frontend theme ids (must match the skins defined in apps/web css).
export const THEME_IDS = [
  'default',
  'ocean',
  'forest',
  'sunset',
  'midnight',
] as const;

const themeSchema = z.object({
  active: z.enum(THEME_IDS).default('default'),
  allowToggle: z.boolean().default(true),
  preferred: z.enum(['system', 'light', 'dark']).default('system'),
});

export const siteConfigSchema = z.object({
  basic: z.object({
    siteName: z.string().default('My Blog'),
    tagline: z.string().default(''),
    bio: z.string().default(''),
    logo: z.string().default(''),
    favicon: z.string().default(''),
    language: z.string().default('zh-CN'),
    timezone: z.string().default('Asia/Shanghai'),
    postsPerPage: z.coerce.number().int().min(1).max(50).default(10),
    homeLatestCount: z.coerce.number().int().min(1).max(20).default(5),
  }),
  theme: themeSchema.default({}),
  seo: z.object({
    description: z.string().default(''),
    keywords: z.string().default(''),
    ogImage: z.string().default(''),
    enableSitemap: z.boolean().default(true),
    enableRobots: z.boolean().default(true),
  }),
  nav: z.object({
    menu: z.array(navItemSchema).default(DEFAULT_NAV_MENU),
    // Legacy location for the built-in nav links. When present, `loadConfig` /
    // `saveConfig` fold them into `menu` as `type: 'builtin'` and drop this key.
    builtin: z.object({
      show: z.boolean().default(true),
      links: z.array(builtinLinkSchema).default(DEFAULT_BUILTIN_LINKS),
    }).optional(),
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
export const DEFAULT_SITE_CONFIG: SiteConfig = siteConfigSchema.parse({ basic: {}, theme: {}, seo: {}, nav: {}, author: {}, footer: {}, inject: {}, features: {} });

const SETTINGS_KEY = 'site';
const CONFIG_CACHE_KEY = 'config:site';

export interface PageLike {
  id?: string;
  slug: string;
  title: string;
  status?: string;
}

/**
 * When a nav entry (custom menu or built-in) points at a URL that matches a
 * published page's slug, the page wins: its title replaces the nav label.
 * This makes "页面" override the nav menu's default entry automatically.
 */
export function enrichNavWithPages(
  config: SiteConfig,
  pages: PageLike[],
): SiteConfig {
  const pagesById = new Map<string, PageLike>();
  const pagesBySlug = new Map<string, PageLike>();
  for (const p of pages) {
    if (p.id) pagesById.set(p.id, p);
    if (!p.slug) continue;
    const prev = pagesBySlug.get(p.slug);
    // Prefer published pages over drafts when slugs collide.
    if (!prev || (p.status === 'published' && prev.status !== 'published')) {
      pagesBySlug.set(p.slug, p);
    }
  }
  const apply = (label: string, url: string) => {
    const slug = url.replace(/^\/+/, '').replace(/\/+$/, '');
    const page = slug ? pagesBySlug.get(slug) : undefined;
    return page && page.status === 'published' ? page.title : label;
  };
  return {
    ...config,
    nav: {
      menu: config.nav.menu.map((m) => {
        // Page entries stay linked to their page row (keeps title/slug fresh).
        if (m.type === 'page' && m.pageId) {
          const page = pagesById.get(m.pageId);
          if (page) {
            return {
              ...m,
              label: page.title,
              url: `/${page.slug.replace(/^\/+|\/+$/g, '')}`,
            };
          }
        }
        return { ...m, label: apply(m.label, m.url) };
      }),
    },
  };
}

/**
 * Fold legacy `nav.builtin` links into the unified `nav.menu` list.
 *
 * Legacy configs stored built-in nav links separately under `nav.builtin.links`;
 * they are appended to `menu` as `type: 'builtin'` entries (preserving the
 * previous visual order: 首页, custom menu, built-in links). If the whole
 * built-in nav was hidden, the migrated entries are marked disabled. Any
 * defaults still missing are appended too, and the `builtin` key is dropped.
 * Idempotent: once the key is gone, nothing happens.
 */
function migrateNavToUnified(config: SiteConfig): SiteConfig {
  const nav = config.nav;
  if (!nav || !nav.builtin) return config;

  const menu: any[] = (nav.menu || []).map((m) => ({
    type: m.type || ('link' as const),
    label: m.label || '',
    url: m.url || '',
    pageId: m.pageId,
    newWindow: !!m.newWindow,
    enabled: m.enabled !== false,
  }));
  const urls = new Set(menu.map((m) => m.url));
  const hiddenAll = nav.builtin.show === false;
  for (const l of nav.builtin.links || []) {
    if (urls.has(l.url)) continue;
    menu.push({
      type: 'builtin' as const,
      label: l.label || '',
      url: l.url || '',
      newWindow: false,
      enabled: hiddenAll ? false : l.enabled !== false,
    });
    urls.add(l.url);
  }
  for (const def of DEFAULT_NAV_MENU) {
    if (urls.has(def.url)) continue;
    menu.push({ ...def });
    urls.add(def.url);
  }
  const { builtin, ...rest } = nav;
  return { ...config, nav: { ...rest, menu } };
}

/** Load the site config from D1 (no cache). */
export async function loadConfig(db: AppDb): Promise<SiteConfig> {
  const row = await db.select().from(settings).where(eq(settings.key, SETTINGS_KEY)).get();
  if (!row) return DEFAULT_SITE_CONFIG;
  const raw = JSON.parse(row.value) as SiteConfig;
  const parsed = siteConfigSchema.safeParse(raw);
  if (!parsed.success) return DEFAULT_SITE_CONFIG;
  const config = parsed.data;
  return migrateNavToUnified(config);
}

/** Load the config with a KV read-through cache (public endpoints use this). */
export async function loadConfigCached(db: AppDb, cache: KVNamespace): Promise<SiteConfig> {
  const cached = await cache.get(CONFIG_CACHE_KEY, 'json');
  if (cached) {
    return enrichNavWithPages(cached as SiteConfig, await getPagesForNav(db));
  }
  const config = await loadConfig(db);
  const enriched = enrichNavWithPages(config, await getPagesForNav(db));
  await cache.put(CONFIG_CACHE_KEY, JSON.stringify(enriched), { expirationTtl: 300 });
  return enriched;
}

/** Pages used to let a matching nav URL be overridden by the page. */
async function getPagesForNav(db: AppDb): Promise<PageLike[]> {
  return db
    .select({ id: pages.id, slug: pages.slug, title: pages.title, status: pages.status })
    .from(pages)
    .all();
}

/** Save the config; invalidates the cache. */
export async function saveConfig(
  db: AppDb,
  cache: KVNamespace,
  config: SiteConfig,
): Promise<SiteConfig> {
const valid = siteConfigSchema.parse(config);
  const migrated = migrateNavToUnified(valid);
  await db
    .insert(settings)
    .values({ key: SETTINGS_KEY, value: JSON.stringify(migrated) })
    .onConflictDoUpdate({ target: settings.key, set: { value: JSON.stringify(migrated) } });
  await cache.delete(CONFIG_CACHE_KEY);
  return migrated;
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


