# 关于页（/about）

`apps/web` 的关于页在 Astro（SSR）服务端渲染，内容来自**站点配置 + 可选的「页面」覆盖**。

- 站点路由：`/about`（导航内置「关于」）
- 页面文件：`apps/web/src/pages/about.astro`
- 数据源：`/api/public/pages/:slug` + `/api/public/config`

---

## 数据流

```
浏览器 ──get /about──▶ Web Worker (SSR)
                          │
                api.config()  │  api.page('about')
                ▼             ▼
        Server Worker Public API
          config (KV 缓存)   pages 表
                          │
                          ▼
        override 命中? ──是──▶ 渲染页面(slug=about) 的标题 + Markdown→HTML
                          │
                          否
                          ▼
                回退静态模板（作者卡片 + 站点简介）
```

## 两种渲染分支（about.astro）

### 1. 覆盖分支（优先）

当 `pages` 表中存在 **slug 为 `about`** 且 **status 为 `published`** 的记录时：

- 用该页面的 `title` 作为页面标题
- 用 `content`（Markdown）经服务端 `renderMarkdown()` 渲染后的 HTML 作为正文
- 布局：单栏 `prose` 文章样式

对应实现：

```ts
// server: GET /api/public/pages/:slug
if (!row || row.status !== 'published') throw new ApiError(404, 'Page not found');
return c.json({ data: { title: row.title, slug: row.slug, html: renderMarkdown(row.content) } });
```

```ts
// web: apps/web/src/lib/api.ts
page: async (slug: string): Promise<Page | null> =>
  getOrNull<Envelope<Page>>(`/pages/${encodeURIComponent(slug)}`),
```

### 2. 回退分支（默认模板）

没有覆盖页面时，渲染内置静态模板：

- 作者卡片：`config.author`（头像、姓名、简介、社交链接）
- 站点名/简介：`config.basic.siteName`、`config.basic.bio`
- 固定的「技术栈」「联系我」段落

## 如何编辑

| 想改什么 | 去哪里 | 说明 |
|----------|--------|------|
| 关于页正文 | 管理后台 → **页面**，新建/编辑 slug = `about` | 正文用 Markdown；状态必须为 **已发布** |
| 作者头像 / 姓名 / 简介 / 社交链接 | 管理后台 → **作者** | 仅回退模板用到 |
| 站点名称 / 简介 | 管理后台 → **站点**（basic 配置） | 仅回退模板用到 |
| 导航 **关于** 入口 | 管理后台 → **导航** | 内置项，可改标签/关闭，不可删除 |

> ⚠️ 覆盖分支要求 slug **精确等于 `about`**、状态为 `published`。
> 若页面是草稿或 slug 不符，`api.page('about')` 返回 `null`，自动走回退模板（不会 404）。

## 相关文件

| 文件 | 职责 |
|------|------|
| `apps/web/src/pages/about.astro` | 页面渲染与分支逻辑 |
| `apps/web/src/lib/api.ts` | `api.page()` 调用公共 API |
| `apps/server/src/routes/public.ts` | `/api/public/pages/:slug`（公开，只返回已发布） |
| `apps/server/src/services/content.ts` | `getPageBySlug` |
| `apps/server/src/db/schema/content.ts` | `pages` 表结构 |
| `apps/admin/src/pages/PagesPage.tsx` | 后台页面管理（CRUD） |
| `apps/server/src/services/config.ts` | 站点配置 + 导航内置项 |

---

项目位置：`apps/web`（页面）、`apps/server`（API）