---
title: "Cloudflare Pages 部署指南"
description: "如何将 Astro 项目部署到 Cloudflare Pages，包括 SSR 和静态模式。"
pubDate: 2026-08-10
tags: ["Cloudflare", "部署", "教程"]
---

## 静态部署

最简单的方式是静态导出：

```bash
npm run build
npx wrangler pages deploy dist
```

## SSR 部署

如果需要服务端渲染，使用 `@astrojs/cloudflare` 适配器：

```js
// astro.config.mjs
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  output: 'server',
  adapter: cloudflare(),
});
```

## 环境变量

在 Cloudflare Dashboard 中配置环境变量，或者使用 `.env` 文件进行本地开发。

## D1 数据库

Cloudflare D1 是一个基于 SQLite 的边缘数据库，适合存储博客文章、用户数据等。

```bash
wrangler d1 create my-database
```

## 总结

Cloudflare Pages 提供了优秀的开发者体验和全球边缘网络，是部署现代 Web 应用的理想选择。
