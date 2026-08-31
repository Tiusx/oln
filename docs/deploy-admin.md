# 部署 Admin (React) 管理后台

`apps/admin` 是管理后台（Vite + React SPA），构建后由 **server Worker 的 ASSETS binding** 在同域 `/admin` 提供，**无需单独部署**。

- 访问地址：`https://api.example.com/admin/`

> 文档中的域名均为**示例**，请替换为你自己的真实值。

---

## 架构

```
apps/admin (Vite + React SPA)
    │  npm run build
    ▼
apps/server/public/   (outDir: '../server/public')
    │  （随 server Worker 上传）
    ▼
Worker server 的 [assets] = ./public
    │  /admin/*  →  ASSETS
    ▼
https://api.example.com/admin/
```

## 关键配置（`apps/admin/vite.config.ts`）

```ts
export default defineConfig({
  base: '/admin/',            // 托管在 /admin，资源带 /admin/ 前缀
  plugins: [react()],
  build: {
    outDir: '../server/public',  // 输出到 server 的静态目录
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/admin/api': 'http://localhost:8787',  // 本地代理到 server
      '/api': 'http://localhost:8787',
    },
  },
});
```

> admin **无环境变量**，API 用相对路径 `/admin/api`（同域，带 Cookie 鉴权）。

## 部署

每次改动 admin 后，**先构建再部署 server**：

```bash
cd apps/admin
npm run build                  # 生成到 ../server/public

cd ../server
npm run deploy                 # wrangler deploy，带上 admin SPA
```

## 验证

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://api.example.com/admin/      # 200
curl -s -o /dev/null -w "%{http_code}\n" https://api.example.com/admin/index.html
```

## 本地开发

```bash
cd apps/server && npm run dev       # 先启动 server (端口 8787)
cd ../../admin && npm run dev       # 再启动 admin (端口 5173, 代理到 8787)
```

## 小贴士

- admin 与 server 强耦合：admin 产物即 server 的静态目录，两者一起发布。
- 改动 admin 必须重新构建 `npm run build`，否则部署用的是旧 `public/`。
- 不要单独建 Pages 托管 admin：它依赖同域 `/admin/api`（带 Cookie），必须与 server 同源。

---

项目位置：`apps/admin`
