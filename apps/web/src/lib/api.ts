const BASE = import.meta.env.PUBLIC_API_URL ? import.meta.env.PUBLIC_API_URL : '/api/public';

async function get<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init);
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

async function getOrNull<T>(path: string, init?: RequestInit): Promise<T | null> {
  const res = await fetch(`${BASE}${path}`, init);
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export interface SiteConfig {
  basic: { siteName: string; tagline: string; bio: string; logo: string; favicon: string; language: string; timezone: string; homeLatestCount: number; postsPerPage: number };
  theme: { active: string; allowToggle: boolean; preferred: 'system' | 'light' | 'dark' };
  seo: { description: string; keywords: string; ogImage: string; enableSitemap: boolean; enableRobots: boolean };
  nav: { menu: { type?: 'page' | 'link' | 'builtin'; label: string; url: string; pageId?: string; newWindow: boolean; enabled?: boolean }[]; builtin?: { show: boolean; links: { label: string; url: string; enabled: boolean }[] } };
  author: { name: string; avatar: string; bio: string; socials: { label: string; url: string }[] };
  footer: { footerText: string; beian: string };
  inject: { headHtml: string; footHtml: string };
  features: { comments: { enabled: boolean; provider: string; audit: boolean; giscusRepo: string; giscusRepoId: string; giscusCategory: string; giscusCategoryId: string; utterancesRepo: string; walineServerURL: string }; newsletter: { enabled: boolean }; analytics: { enabled: boolean; webAnalyticsToken: string } };
}

interface Envelope<T> {
  success: boolean;
  data: T;
}

export interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  coverImage: string | null;
  status: string;
  pinned: boolean;
  commentsEnabled?: boolean;
  seoTitle?: string | null;
  seoDescription?: string | null;
  publishedAt: string | null;
  updatedAt: string | null;
  categoryId: string | null;
  category: { id: string; name: string; slug: string } | null;
  tags: { id: string; name: string; slug: string }[];
  html?: string;
}

export interface PostListResult {
  items: Post[];
  total: number;
  page: number;
  limit: number;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

export interface Page {
  id: string;
  title: string;
  slug: string;
  content: string;
  status: string;
  showInMenu: boolean;
  html?: string;
}

export interface LinkItem {
  id: string;
  name: string;
  url: string;
  description: string | null;
  avatar: string | null;
}

export const api = {
  config: (): Promise<SiteConfig> => get<Envelope<SiteConfig>>('/config').then((r) => r.data),
  posts: async (page = 1, limit = 20): Promise<PostListResult> => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    return (await get<Envelope<PostListResult>>(`/posts?${params}`)).data;
  },
  post: async (slug: string): Promise<Post | null> => {
    const res = await getOrNull<Envelope<Post>>(`/posts/${encodeURIComponent(slug)}`);
    return res ? res.data : null;
  },
  tags: async (): Promise<Tag[]> => {
    return (await get<Envelope<Tag[]>>('/tags')).data;
  },
  categories: async (): Promise<Category[]> => {
    return (await get<Envelope<Category[]>>('/categories')).data;
  },
  page: async (slug: string): Promise<Page | null> => {
    const res = await getOrNull<Envelope<Page>>(`/pages/${encodeURIComponent(slug)}`);
    return res ? res.data : null;
  },
  links: async (): Promise<LinkItem[]> => {
    return (await get<Envelope<LinkItem[]>>('/links')).data;
  },
  hitokoto: async (): Promise<{ content: string; creator: string | null } | null> => {
    const res = await getOrNull<Envelope<{ content: string; creator: string | null }>>('/hitokoto');
    return res ? res.data : null;
  },
};
