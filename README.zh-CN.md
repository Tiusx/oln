# oln - 自托管博客平台

一个部署在 Cloudflare 上的现代自托管博客，由三个应用组成：

- **web**（Astro SSR）— 前端博客，通过 Cloudflare Pages Git 集成自动部署
- **server**（Hono Worker）— 后端：公开 API、管理 API、媒体与配置，托管为 Cloudflare Worker
- **admin**（React SPA）— 管理后台，构建产物随 server 一起托管在 `/admin/`

## 功能特性

- **分类 / 标签 / 置顶 / 草稿** 完整文章管理
- **文章导入导出**：自动识别 JSON / Markdown，可下载数据格式模板、逐篇错误提示、tag 名称自动解析
- **批量操作**：文章列表可勾选，支持批量删除
- **友链、页面、留言板、导航、分类标签** 等内容管理
- **评论系统**：支持 giscus / utterances / Waline（可选启用）
- **存储与资源库**：存储提供商配置（本地 / R2 / GitHub），本地资源库可在线浏览
- **站点配置**：全站设置可视化编辑、首页每页文章数可控、SEO / 注入代码 / 页脚 / 作者信息
- **代码高亮**：文章详情使用 highlight.js，自动跟随明暗主题
- **多主题**：浅色 / 深色，跟随系统或手动切换
- **安全**：后台登录、会话管理、修改密码

## 技术栈

| 应用 | 技术 |
|------|------|
| web | Astro 5, @astrojs/cloudflare (SSR), TypeScript, Waline |
| server | Hono, Drizzle ORM, TypeScript |
| admin | React 18, Vite 5, React Router |
| 数据 | Cloudflare D1（SQLite）、KV（缓存）、R2（媒体） |

## 项目结构

```
/
├── package.json           根配置与脚本
├── dev.bat                一键本地开发启动器
├── apps/
│   ├── admin/             管理后台 (Vite + React) → 构建到 server/public
│   ├── server/            后端服务 (Hono Worker)，含 migrations/
│   └── web/               前端博客 (Astro SSR)
├── docs/                  部署与目录结构文档
├── README.md              (英文)
└── README.zh-CN.md        (中文)
```

## 本地开发

需要 Node.js >= 20。三个服务各有端口，通过代理串联，**server 是核心**。

```bash
npm install

# 一键启动（推荐）：依次拉起 server / admin / web
.\dev.bat

# 或分别启动
npm run dev:server   # http://localhost:8787
npm run dev:admin    # http://localhost:5173/admin/
npm run dev:web      # http://localhost:4321
```

首次需要初始化本地数据库与首个管理员：

```bash
# 应用 D1 迁移到本地
npm --prefix apps/server run db:migrate:local

# seed 首个管理员（admin / admin）
# 调本地接口 POST http://localhost:8787/admin/api/auth/seed
```

> 管理后台默认登录 `admin / admin`，登录后可在侧边栏「修改密码」（新密码至少 8 位）。
> 前端页脚有「管理」入口，其地址可用环境变量 `PUBLIC_ADMIN_URL` 配置（默认 `/admin/`）。

## 常用脚本

| 命令 | 说明 |
|------|------|
| `npm run dev:web` / `dev:server` / `dev:admin` | 启动各服务 |
| `npm run build:web` / `build:admin` | 构建 web / admin |
| `npm run typecheck:server` / `typecheck:admin` | 类型检查 |
| `npm run deploy` | 部署 server（含 admin 产物） |

## 部署

- **server + admin**：push 到 `master`，GitHub Actions（`.github/workflows/deploy-server.yml`）自动构建 admin、对远端 D1 执行迁移（幂等 `wrangler d1 migrations apply`），再 `wrangler deploy`。仅当 `apps/server/**`、`apps/admin/**` 变化时触发。
- **web**：Cloudflare Pages Git 集成自动构建部署（SSR，需配置 `PUBLIC_API_URL` 等环境变量）。

详细部署见 [DEPLOYMENT.md](./DEPLOYMENT.md) 与 [docs/](docs/)。
