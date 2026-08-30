# oln - Cloudflare 全栈博客部署指南

## 项目概览

oln 是一个由三个部分组成的现代博客平台：

- **web** (Astro) - 前端博客，部署到 Cloudflare Pages
- **cms** (Hono Worker) - 后端 CMS/内容 API，部署为 Cloudflare Worker
- **admin** (React) - 内容管理面板，部署到 Cloudflare

## 1. 项目构建

### 1.1 Web 前端 (`apps/web`)

```bash
cd J:\ai\blog\my-blog\apps\web
npm run build
# 输出: apps/web/dist/ (或 apps/web/build/, 视配置而定)
```

### 1.2 CMS 后端 (`apps/cms`)

```bash
cd J:\ai\blog\my-blog\apps\cms
npm run build
# 输出: dist/
```

### 1.3 管理后台 (`apps/admin`)

```bash
cd J:\ai\blog\my-blog\apps\admin
npm run build
# 输出: dist/
```

## 2. Cloudflare Pages (Web 前端)

### 2.1 创建项目

1. Cloudflare Dashboard → Pages → "Create a new project"
2. 连接 GitHub 仓库

### 2.2 Build 设置

- Framework: `Other`
- Build command: `npm run build` (在 `apps/web` 目录下，或根目录的 package.json scripts 中)
- Build output: `dist` (视实际输出路径而定)
- Root directory: `apps/web` (如果 build 输出在该目录)

### 2.3 环境变量

在 Cloudflare Pages → Settings → Variables 中添加：

| 变量名 | 说明 | 示例值 |
|--------|------|--------|
| `PUBLIC_CMS_URL` | CMS Worker 的 URL | `https://your-worker-url.cloudflare-workers.com` |
| `PUBLIC_SITE_URL` | 站点域名 | `https://your-domain.com` |

### 3. Cloudflare Workers (CMS 后端)

#### 3.1 部署 Worker

```bash
cd J:\ai\blog\my-blog\apps\cms
npm run build
# 进入 Cloudflare Dashboard → Workers & Queues → "Create a Worker"
# 上传 dist/ 目录内容
# 设置入口文件 (通常是 src/index.js 或 src/index.ts)
```

#### 3.2 配置环境变量

在 Workers 设置中添加：

| 变量名 | 说明 |
|--------|------|
| `ADMIN_API_URL` | admin 后端地址 (如 `https://your-admin-domain` ) |
| 其他所需变量 | 根据 cms/src 代码检查 |

### 4. 管理后台 (admin)

#### 4.1 部署方案

**方案 A：同 Pages 项目 (推荐，简化)**

- 在同一个 Pages 项目中
- 通过路由 `/admin` 区分
- 使用 JWT 或 Session 进行认证

**方案 B：单独部署**

- 作为独立 Worker 部署
- 使用 Cloudflare D1 或 KV 存储状态

### 5. 环境变量配置

所有应用统一使用这些环境变量：

| 变量名 | 说明 | 适用应用 |
|--------|------|----------|
| `PUBLIC_CMS_URL` | CMS API 地址 | web, admin |
| `PUBLIC_ADMIN_URL` | admin 入口地址 | admin |
| `SITE_URL` | 站点域名 | web |
| `ADMIN_SECRET` | 管理登录密钥 | admin |

### 5. 域名配置

#### 1. 自定义域名

- Pages: Settings → Custom Domains → 输入域名
- Workers: Settings → Custom Domains

#### 2. SSL/TLS

- Full (strict) 推荐
- 或使用 Cloudflare 的免费 SSL

### 5. 验证部署

访问以下 URL 验证：

| 服务 | 预期 URL | 检查点 |
|------|----------|--------|
| 前端 | `https://your-site.pages.dev` | 页面加载正常 |
| CMS API | `https://your-worker-url/api/config` | 返回 JSON 配置 |
| admin | `https://your-site.pages.dev/admin` | 登录页面正常 |

### 5. 常见问题排查

| 问题 | 解决方案 |
|------|----------|
| `404 Not Found` | 检查 Build output directory 配置 |
| API 请求失败 | 验证 `PUBLIC_CMS_URL` 环境变量 |
| 样式丢失 | 检查 `base` 配置，确保路径正确 |
| 登录后跳转异常 | 验证 `ADMIN_SECRET` 和 `ADMIN_API_URL` |

### 6. 更新与维护

```bash
# 重新构建 (仅当代码有变化时)
npm run build:web
npm run build:cms
npm run build:admin

# Cloudflare 会自动检测并重新部署 (若已连接 GitHub)

# 如需强制重新部署
# Cloudflare Dashboard → Trigger Purge 或 Redeploy
```

## 6. 项目结构

```
my-blog/
├── package.json          (根配置)
├── README.md            (英文说明)
├── README.zh-CN.md      (中文说明)
├── DEPLOYMENT.md        (本文件)
└── apps/
    ├── admin/           管理后台 (Vite + React)
    ├── cms/             后端 CMS (Hono Worker)
    └── web/             前端博客 (Astro)
```

## 6. 常见错误修复表

| 错误 | 原因 | 修复 |
|------|------|------|
| `npm: command not found` | PowerShell PATH 问题 | 使用 `cmd /c npm` 或修复 Node.js PATH |
| `typecheck` 失败 | 查 `tsconfig.json` 路径引用 | 逐一修复报错行 |
| `Build failed` | 检查 `package.json` scripts 配置 | 确保路径正确 |
| 部署后白屏 | 环境变量缺失 | 在 Cloudflare 中补充变量 |

## 7. 常见问题 (FAQ)

**Q: 如何获取 CMS 的 API 地址？**
A: 部署 CMS Worker 后，在 Cloudflare Dashboard → Workers 查看 Worker 的默认域名，或绑定自定义域名。

**Q: admin 登录后无法跳转？**
A: 检查 `ADMIN_SECRET` 是否配置一致，以及 `ADMIN_API_URL` 是否可达。

**Q: 如何备份数据？**
A: Cloudflare Workers 有有限的持久存储 (KV, D1)，建议重要数据也导出本地备份。

---

**部署完成后**，你的 oln 博客就可以访问了！

- 前端：`https://your-site.pages.dev`
- CMS API：`https://your-worker-url.cloudflare-workers.com`
- admin 后台：`https://your-site.pages.dev/admin`

---

*本文档根据项目现状编写，最后更新：2025*