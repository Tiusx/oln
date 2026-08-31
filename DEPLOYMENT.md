# oln - Cloudflare 全栈博客部署指南

## 项目概览

oln 由三个部分组成：

- **web** (Astro) - 前端博客，部署到 Cloudflare Pages
- **server** (Hono Worker) - 后端服务/内容 API，部署为 Cloudflare Worker
- **admin** (React) - 内容管理面板，由 server Worker 托管

详细分步文档见 [docs/](docs/) 目录：
- [docs/deploy-web.md](docs/deploy-web.md) - Web (Astro) 部署
- [docs/deploy-server.md](docs/deploy-server.md) - Server (Hono Worker) 部署
- [docs/deploy-admin.md](docs/deploy-admin.md) - Admin (React) 部署

## 目录结构

```
/
├── package.json          (根配置)
├── apps/
│   ├── admin/           管理后台 (Vite + React)
│   ├── server/          后端服务 (Hono Worker)
│   └── web/             前端博客 (Astro)
└── docs/                部署与调试文档
```

*示例说明：本文档以 `example.com` 等作为示例域名，实际部署请替换为你的真实域名。*
