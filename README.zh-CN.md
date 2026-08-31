# oln - 自托管博客

一个现代博客平台，由三个部分组成：

## 架构

- **web** (Astro) - 前端博客，部署到 Cloudflare Pages
- **server** (Hono Worker) - 后端服务/内容 API，部署为 Cloudflare Worker
- **admin** (React) - 内容管理面板，部署到 Cloudflare

## 快速开始

```bash
# 安装依赖
npm install

# 开发
npm run dev:web     # 前端 dev server
npm run dev:server  # server Worker dev server
npm run dev:admin   # 管理面板 dev server

# 构建
npm run build:web
npm run build:admin
```

## 部署

查看 [DEPLOYMENT.md](./DEPLOYMENT.md) 了解详细的部署说明。

## 技术栈

- **前端**: Astro 4, React, TypeScript
- **后端**: Hono, Cloudflare Workers
- **管理面板**: React, Vite

## 项目结构

```
/
├── package.json          (根配置)
├── apps/
│   ├── admin/           管理后台
│   ├── server/          后端服务
│   └── web/             前端博客
├── README.md            (英文)
├── README.zh-CN.md      (中文)
└── DEPLOYMENT.md        (部署说明)
```