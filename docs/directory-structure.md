# 项目目录结构规范

Monorepo 结构，三个独立应用统一放在 `apps/` 下，根目录只放编排文件和文档。

```
oln/
├─ package.json                  # 根：脚本编排（dev/build/deploy 聚合命令）
├─ .gitignore
├─ README.md
├─ docs/                         # 项目文档
│  ├─ architecture.md            # 架构总览（数据流、部署拓扑）
│  ├─ directory-structure.md     # 目录规范（本文件）
│  └─ api.md                     # API 接口清单
│
└─ apps/
   ├─ web/                       # ① 站点前台 (Astro, 部署到 Cloudflare Pages)
   │  ├─ package.json
   │  ├─ astro.config.mjs
   │  ├─ tsconfig.json
   │  ├─ src/
   │  │  ├─ layouts/             # 页面布局（Layout.astro）
   │  │  ├─ components/          # 组件（Header、PostCard、Footer…）
   │  │  ├─ pages/               # 路由页面（index、posts/[slug]、about…）
   │  │  ├─ styles/              # 全局样式
   │  │  └─ lib/                 # api 客户端、工具函数
   │  └─ public/                 # 静态资源
   │
   ├─ admin/                     # ② 后台管理 SPA (React + Vite)
   │  ├─ package.json
   │  ├─ vite.config.ts
   │  ├─ index.html
   │  ├─ tsconfig.json
   │  └─ src/
   │     ├─ main.tsx             # 入口
   │     ├─ App.tsx             # 路由配置
   │     ├─ api/                # API 客户端 + 类型
   │     ├─ pages/              # 页面组件（Login、Posts、PostEditor、Settings…）
   │     ├─ components/         # 通用 UI 组件（布局、表单、列表）
   │     ├─ hooks/              # 自定义 hooks
   │     └─ styles/
   │
   └─ server/                     # ③ 后台 API + 数据层 (Hono Worker)
      ├─ package.json
      ├─ wrangler.toml           # D1 / R2 / KV 绑定
      ├─ drizzle.config.ts
      ├─ tsconfig.json
      ├─ migrations/             # D1 数据库迁移 SQL
      │  └─ 0000_init.sql
      ├─ drizzle/                # drizzle-kit 生成结果
      └─ src/
         ├─ index.ts             # Worker 入口（export default）
         ├─ server.ts            # Hono app 组装（挂载中间件 + 路由）
         ├─ env.ts               # Env bindings 类型
         ├─ db/
         │  ├─ index.ts          # drizzle client 工厂
         │  └─ schema/           # 数据库表定义（按域拆分）
         │     ├─ index.ts       # 汇总导出
         │     ├─ user.ts        # users, sessions
         │     ├─ taxonomy.ts    # categories, tags, post_tags
         │     ├─ content.ts     # posts, pages
         │     ├─ engagement.ts  # links(友链), subscribers, comments
         │     └─ config.ts      # settings, audit_logs
         ├─ middleware/          # Hono 中间件
         │  ├─ auth.ts           # withDb, loadUser, requireAuth
         │  └─ error.ts          # 统一错误处理
         ├─ lib/                 # 纯工具（无副作用）
         │  ├─ ids.ts            # createId / slugify
         │  ├─ password.ts       # PBKDF2 哈希
         │  └─ http.ts           # ok/fail/parseBody
         ├─ services/            # 业务逻辑层（被 routes 调用，含缓存）
         │  ├─ config.ts         # 站点配置读写 + KV 缓存
         │  ├─ posts.ts          # 文章 CRUD / 标签 / 分类 业务
         │  └─ markdown.ts       # md -> html 渲染（前台用）
         └─ routes/              # API 路由（薄层，只做校验+调用 service）
            ├─ index.ts          # adminApi() 组装
            ├─ auth.ts           # /admin/api/auth/*
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
