# 项目目录结构规范

Monorepo 结构，三个独立应用统一放在 `apps/` 下，根目录只放编排文件和文档。

```
oln/
├─ package.json                  # 根：脚本编排（dev/build/deploy 聚合命令）
├─ .gitignore
├─ README.md
├─ DEPLOYMENT.md                 # 部署总览（拆分为 docs/deploy-*.md）
├─ docs/                         # 项目文档
│  ├─ directory-structure.md     # 目录规范（本文件）
│  ├─ deploy-web.md              # Web (Astro) 部署
│  ├─ deploy-server.md           # Server (Hono Worker) 部署 + 本地开发
│  └─ deploy-admin.md            # Admin (React) 部署 + 构建
│
└─ apps/
   ├─ web/                       # ① 站点前台 (Astro, 部署到 Cloudflare Pages)
   │  ├─ package.json
   │  ├─ astro.config.mjs
   │  ├─ tsconfig.json
   │  ├─ .env                    # 本地 env（gitignore）
   │  └─ src/
   │     ├─ layouts/             # 页面布局（Layout.astro）
   │     ├─ components/          # 组件（Header、Footer…）
   │     ├─ pages/               # 路由页面（index、posts/[slug]、about、404…）
   │     ├─ styles/              # 全局样式（global.css）
   │     └─ lib/                 # api 客户端、markdown、vendor/recaptcha 垫片
   │
   ├─ admin/                     # ② 后台管理 SPA (React + Vite)
   │  ├─ package.json
   │  ├─ vite.config.ts
   │  ├─ index.html
   │  ├─ tsconfig.json
   │  └─ src/
   │     ├─ main.tsx             # 入口
   │     ├─ App.tsx              # 路由配置 + 认证上下文
   │     ├─ styles.css           # 全局样式
   │     ├─ api/client.ts        # API 客户端 + 类型
   │     ├─ pages/               # 页面组件（Login、Posts、PostEditor、Settings…）
   │     └─ ui/Feedback.tsx      # Toast / Confirm 通用 UI
   │
   └─ server/                     # ③ 后台 API + 数据层 (Hono Worker)
      ├─ package.json
      ├─ wrangler.toml           # 部署配置 + D1 / R2 / KV 绑定
      ├─ drizzle.config.ts        # drizzle-kit 配置
      ├─ tsconfig.json
      ├─ migrations/             # D1 数据库迁移 SQL
      │  ├─ 0000_init.sql
      │  ├─ 0001_messages_hitokoto.sql
      │  ├─ 0002_drop_messages.sql
      │  └─ 0003_post_comments_enabled.sql
      ├─ public/                 # admin SPA 构建产物（gitignore，wrangler ASSETS 服务）
      └─ src/
         ├─ index.ts             # Worker 入口（export default, serveAdmin）
         ├─ server.ts            # Hono app 组装（挂载中间件 + 路由）
         ├─ env.ts               # Env bindings 类型
         ├─ schemas.ts           # zod 校验 schema（login/change-password 等）
         ├─ db/
         │  ├─ index.ts          # drizzle client 工厂
         │  └─ schema/           # 数据库表定义（按域拆分）
         │     ├─ index.ts       # 汇总导出
         │     ├─ _shared.ts     # 共用基类字段（时间戳、审计）
         │     ├─ user.ts        # users, sessions
         │     ├─ taxonomy.ts    # categories, tags, post_tags
         │     ├─ content.ts     # posts, pages, comments_enabled
         │     ├─ engagement.ts  # subscribers, comments, links
         │     └─ config.ts      # settings, audit_logs
         ├─ middleware/          # Hono 中间件
         │  ├─ auth.ts           # withDb, loadUser, requireAuth
         │  └─ error.ts          # 统一错误处理 + ApiError
         ├─ lib/                 # 纯工具（无副作用）
         │  ├─ ids.ts            # createId / slugify
         │  ├─ password.ts       # 密码哈希 / 校验
         │  └─ http.ts           # ok/fail/parseBody 响应辅助
         ├─ services/            # 业务逻辑层（被 routes 调用，含缓存）
         │  ├─ config.ts         # 站点配置读写 + KV 缓存
         │  ├─ posts.ts          # 文章 CRUD / 标签 / 分类 业务
         │  ├─ content.ts        # pages / 友链 / 订阅 业务
         │  ├─ media.ts          # R2 媒体上传业务
         │  ├─ markdown.ts       # md -> html 渲染
         │  └─ session.ts        # 会话创建/销毁
         └─ routes/              # API 路由（薄层，只做校验+调用 service）
            ├─ index.ts          # adminApi() 组装
            ├─ auth.ts           # /admin/api/auth/* (seed/login/logout/me/change-password)
            ├─ posts.ts          # /admin/api/posts/*
            ├─ content.ts        # /admin/api/content/* (pages/links/subscribers)
            ├─ config.ts         # /admin/api/config/*
            ├─ media.ts          # /admin/api/media/* (R2 上传)
            └─ public.ts         # /api/public/* (前台读接口, 公开)
```

## 命名约定

- **目录名**：全小写，单词间用 `-`（如 `db`, `db/schema`, `post_tags`）。
- **源文件**：小写驼峰或小写 + 连字符（`server.ts`, `drizzle.config.ts`）。
- **路由文件**：按资源命名（`posts.ts`, `content.ts`）。
- **schema 表**：`snake_case`（`post_tags`, `audit_logs`）。
- **API 前缀**：
  - 后台管理接口：`/admin/api/*`（需认证）
  - 前台公开接口：`/api/public/*`（无需认证）
- **三层分层**：`routes`（薄层校验）→ `services`（业务+缓存）→ `db/schema`（数据）。

## 数据流

```
Admin SPA (React)  ──写──▶  /admin/api/*  ──▶  Hono Worker  ──▶  D1 / R2
Astro 前台 (Pages)  ──读──▶  /api/public/*  ──▶  Hono Worker  ──▶  D1 / KV(缓存)
```
