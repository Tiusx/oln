# 项目日志 (LOG)

> 记录本站开发过程中所有发生的事（功能、修复、部署、决策），按日期倒序。

---

## 时间线速览

| 日期 | 类型 | 事件摘要 |
|------|------|----------|
| **2026-09-05** | ✨ 功能 | 自定义页面支持开关评论：`pages.comments_enabled`、新增可勾选、列表一键切换、前台按页面渲染评论 |
| **2026-09-05** | ✨ 功能 | 新增「动态（朋友圈/说说）」：moments 表 + API + 后台发布管理 + 前台时间线页 `/moments` + 导航「动态」入口（幂等回填） |
| **2026-09-05** | ⚡ 性能/修复 | 修复主题切换白屏（`data-astro-rerun`）、页面切换提速（HTML 边缘缓存中间件） |
| **2026-09-05** | ✨ 功能 | RSS 自动发现链接、关于页文档（`docs/about-page.md` + `about-content.md`） |
| **2026-09-05** | 🔌 接入 | Markdown 支持 B站/YouTube 等 iframe 白名单嵌入 |
| **2026-09-05** | 📦 提交 | `777b350` 统一可排序导航菜单、编辑器资源库选择器、ico 上传、导航列表响应式 |
| 2026-09-04 | ✨ 功能 | `3f87838` Markdown 改 `marked`+`hljs`（GFM/高亮）、代码块复制、柔化暗色、View Transitions |
| 2026-09-03 | 🏗 重构 | `b0c1069` 前端基于后端配置重建；`fb7f607` 标题两行截断与字体栈现代化 |
| 2026-09-01 | 🚀 功能 | `50e7524` S3/GitHub 存储、资源库、归档懒加载、TOC、首页 bio/最新文章 |
| 2026-09-01 | 🔧 迭代 | 密码修改、批量操作、友链编辑、每页文章数、后台入口可配置 |
| 2026-09-01 | 🧹 安全/清理 | `login.json` 脱敏并 gitignore、仓库清理、`cms`→`server` 改名、Node 22、CI |

---

## 2026-09-05 — 当日明细

### ✨ 自定义页面：开关评论
- **数据层**：`pages` 表加 `comments_enabled`（默认开），迁移 `apps/server/migrations/0005_pages_comments_enabled.sql`（需 `db:migrate`）。
- **API**：`pageSchema` 支持 `commentsEnabled`；新增 `PATCH /admin/api/content/pages/:id/comments` 一键切换；公开 `GET /api/public/pages/:slug` 返回 `commentsEnabled`。
- **后台**：新增页面时勾选「允许评论」；列表行显示「开/关评论」徽章 + 一键切换按钮；编辑表单可改评论开关。
- **前台**：`apps/web/src/pages/[slug].astro` 按页面 `commentsEnabled`（且评论系统开启）渲染 giscus/utterances/waline 评论区（含 waline 客户端脚本）。
- 默认 `true`，存量页面（旧库无该列）自动按「开评论」处理。
- 三个 app 均通过 build / typecheck。

### ✨ 新增「动态（朋友圈 / 说说）」
- **数据层**：`moments` 表（`content` Markdown、`contentHtml` 缓存、`status`、`pinned`、时间戳）+ 迁移 `apps/server/migrations/0004_moments.sql`（手写 SQL，需 `db:migrate`）。
- **API**：
  - 后台 CRUD：`/admin/api/content/moments`（列表/详情/新建/更新/状态切换/删除，auth 保护），服务层 `services/moments.ts`。
  - 公开列表：`GET /api/public/moments?page=&limit=`（只返回已发布，置顶优先 + 时间倒序，服务端渲染 HTML）。
- **后台**：`apps/admin/src/pages/Moments.tsx` — 移动端友好：顶部「发一条」发布框（MarkdownEditor + 置顶 + 一键发布），列表行支持发布/下架、置顶/取消、内联编辑、删除、分页；侧边栏「动态（朋友圈）」入口。
- **前台**：`apps/web/src/pages/moments.astro` — 时间线样式（竖线 + 圆点）、相对时间（x 分钟/小时/天前 via `astro:page-load`）、置顶徽章、分页、View Transitions。
- **导航**：`config.ts` `DEFAULT_NAV_MENU` 加内置「动态」；老站点通过一次性 marker 迁移 `ensureMomentsNav` 自动补加（改后不再回加，幂等）。
- 三个 app 均通过 build / typecheck。

### ⚡ 性能优化与主题修复（web）
- **修复主题切换白屏**：View Transitions 换页时 Astro 用新页 `<html>` 属性整体替换旧页（`swapRootAttributes`），而主题脚本只在首屏执行一次，导致 `.dark/.light` 类丢失、白底闪烁。
  - `apps/web/src/layouts/Layout.astro`：主题内联脚本加 `data-astro-rerun`，每次导航绘制前同步恢复主题。
  - `apps/web/src/components/ThemeToggle.tsx`：`applyTheme` 同步写回 `dataset.theme`。
- **优化页面切换慢**：`output: 'server'` 每次导航全量 SSR + 回源 D1。
  - 新增 `apps/web/src/middleware.ts`：`GET + Accept: text/html` 的 200 响应写入 Cloudflare Cache API（`s-maxage=300, stale-while-revalidate=3600`）。
  - 已通过 `astro build`（Complete!）。

### ✨ RSS
- `Layout.astro` head 加入 RSS 自动发现链接（`<link rel="alternate" type="application/rss+xml" href="/rss.xml">`）。
- 新增 `apps/web/src/pages/rss.xml.ts` 生成 `/rss.xml`（最近 20 篇，绝对链接）。

### 📄 关于页
- 新增 `docs/about-page.md`：关于页双分支渲染逻辑与后台编辑指引。
- 新增 `docs/about-content.md`：「关于我」内容模板（待用户自行修改）。

### 🔌 Markdown iframe 白名单
- `apps/server/src/services/markdown.ts`：`renderer.html` 从「全部转义」改为白名单放行：
  - 允许 `player.bilibili.com`、`www.youtube.com`、`www.youtube-nocookie.com`；协议相对路径补 `https:`；输出 `width:100%; aspect-ratio:16/9`。
  - 其余 HTML/脚本一律转义。实测：B站分享正常渲染，`<script>` 与非白名单 iframe 被挡。

### 📦 提交（commit `777b350`）
- 导航统一为 `config.nav.menu` 单列表，旧 `builtin` 幂等迁移。
- Markdown 编辑器接入资源库（`ResourcePicker.tsx`：provider 切换、图片网格、自动上传、插入 `![alt](url)`）；封面图支持「资源库」按钮。
- `.ico` 上传放行；导航列表响应式。
- 已推送 `origin/master`（`3f87838..777b350`）。

---

## 历史提交参考（git log）

```
777b350 feat(admin/server/web): unified sortable nav menu, resource-library picker in editor, ico upload, responsive nav list
3f87838 feat(server/web): markdown via marked+hljs (GFM/syntax highlight), code block copy+lang, softer dark theme, view transitions
b0c1069 refactor(web): rebuild blog frontend on backend config, archive old web
fb7f607 style(web): clamp article titles to 2 lines, modernize font stack, slightly reduce base font size
50e7524 feat(server/admin/web): storage S3/GitHub config, resources library, archive lazy-load, article list, TOC sidebar, homepage bio & latest
5148d32 feat(admin/web/server): password change, code highlight, batch ops, friend-link edit, posts-per-page, configurable admin URL
3fd2d24 feat(server/admin/web): add storage config & resource library, fix post import 500, improve web mobile
c90e3ad chore: add dev.bat one-click local dev launcher
245316e feat(admin): overhaul admin UI design system and polish all pages
97a76cc chore: clean up repo — remove secrets, leftovers, stale docs
cf0ecb8 chore: untrack login.json (contains plaintext admin creds) and gitignore it
e0e0c3c ci: use Node 22 (wrangler v4 requires >=22)
1db6259 refactor: rename apps/cms to apps/server, add CI deploy, tidy docs
e6e84b1 fix: restore @astrojs/cloudflare adapter with output:server
```

---

## 维护说明

- 新条目：在「时间线速览」表格最上方插入一行，并在对应日期的「当日明细」补充细节。
- 未提交的开发中变更，记录在当日明细即可；提交后顺手补 commit 号。