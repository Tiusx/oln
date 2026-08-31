# 部署 Web (Astro) 到 Cloudflare Pages

`apps/web` 是前端博客（Astro，SSR），通过 **Cloudflare Pages Git 集成** 自动构建部署。

- 部署方式：push 到 `master` 自动触发构建（无需手动 `wrangler deploy`）
- 自定义域名：`https://www.example.com`

> 文档中的域名均为**示例**，请替换为你自己的真实值。

---

## 架构

```
GitHub (git remote) ──push master──▶ Cloudflare Pages
                                        │
                                        ▼
                                https://www.example.com/
                                        │  (SSR 运行时)
                                        │  fetch PUBLIC_API_URL
                                        ▼
                                Server Worker (api.example.com)
```

| 项 | 值 |
|----|-----|
| 构建命令 | `npm run build`（`astro build`） |
| 构建输出目录 | `dist` |
| Root directory | `apps/web` |
| Adapter | `@astrojs/cloudflare`（`output: 'server'`） |

> ⚠️ 本项目是 **SSR**（页面 `export const prerender = false`），**必须保留 adapter**。
> 改为 `output: 'static'` 会报 `[NoAdapterInstalled]` 构建失败。

## 环境变量（关键）

| 变量 | 用途 | 必需 | 示例值 |
|------|------|:---:|--------|
| `PUBLIC_API_URL` | SSR 运行时 fetch server 公开 API | ✅ | `https://api.example.com/api/public` |
| `PUBLIC_SITE_URL` | sitemap/rss/robots 的站点 URL | ✅ | `https://www.example.com` |
| `PUBLIC_WALINE_SERVER_URL` | 评论 Waline 地址 | 可选 | 默认 `https://waline.example.com` |
| `PUBLIC_SERVER_URL` | **仅本地** `astro dev` 代理 target | 生产不用 | `http://localhost:8787` |

> ### 🚨 关键区别：`PUBLIC_API_URL` ≠ `PUBLIC_SERVER_URL`
> | 变量 | 作用 | 指向 |
> |------|------|------|
> | `PUBLIC_API_URL` | **生产** fetch server 公开 API | `https://api.example.com/api/public`（**带 `/api/public`**） |
> | `PUBLIC_SERVER_URL` | 仅本地 `astro dev` 代理 target | server 根地址 |
>
> `PUBLIC_API_URL` 生产必须。**若缺失，代码回退到相对路径 `/api/public`，Worker 运行时 fetch 缺协议主机 → 站点 500。**

### 在 Cloudflare Pages 添加环境变量

1. Dashboard → **Workers & Pages → Pages → 项目** → **Settings → Environment variables**
2. **Add variable**：

   | Name | Value | Scope |
   |------|-------|-------|
   | `PUBLIC_API_URL` | `https://api.example.com/api/public` | **Build** |
   | `PUBLIC_SITE_URL` | `https://www.example.com` | **Build** |
   | `PUBLIC_WALINE_SERVER_URL` | `https://waline.example.com` | **Build**（可选） |

3. 保存 → **Deployments → Trigger deploy**

> `PUBLIC_` 前缀变量会被 Vite 在 **Build** 时注入，必须勾选 Build 作用域。

## 排查「返回 500」

1. **构建是否成功**：Deployments 标签看 Status 是否为 `Success`。
2. **`PUBLIC_API_URL` 是否已配**：日志出现 `Found _worker.js ... Uploading` 但访问仍 500 → 多半是 `PUBLIC_API_URL` 未设置。
3. **构建是否正确**：日志应含 `output: "server"`、`Found _worker.js in output directory. Uploading.`。看到 `[NoAdapterInstalled]` 或 `output: "static"` 说明配置错误。

## 部署

### 首次（一次性）
1. Dashboard → **Workers & Pages → Pages → Create → Connect to Git**
2. 选仓库和分支 `master`
3. Build configuration：Root `apps/web`、命令 `npm run build`、输出 `dist`
4. 添加上表环境变量，保存自动构建

### 日常更新
```bash
git add .
git commit -m "changes"
git push origin master   # 自动构建部署
```

## 验证

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://www.example.com/   # 200
curl -s https://www.example.com/sitemap.xml | head -10               # XML
curl -s https://www.example.com/ | head -20                          # SSR 内容
```

## 本地开发

```bash
cd apps/web
# .env (本地):
#   PUBLIC_API_URL=http://localhost:8787/api/public
#   PUBLIC_SITE_URL=http://localhost:3000
#   PUBLIC_SERVER_URL=http://localhost:8787
npm run dev    # 访问 http://localhost:3000
```

## 不提交 git

| 文件 | 说明 |
|------|------|
| `apps/web/.env` | 本地值 |
| `apps/web/wrangler.toml` | 已删除（Pages 不需要，存在反而干扰） |
| `apps/web/dist/` | 构建产物 |

## 小贴士

- **不要手动 `wrangler deploy` Web**：走 Pages Git 集成。
- **`_worker.js` 正常**：SSR + adapter 会生成它，Pages 自动进入 Advanced Mode。
- **`SESSION` KV**：adapter 日志会提示 "Enabling sessions"，但本项目未用 Astro sessions。若报 `Invalid binding SESSION`，在 Dashboard → Pages → 项目 → **Settings → Functions** 添加 `SESSION` KV binding（任意 KV）。
- **sharp 警告可忽略**：`Cloudflare does not support sharp` 只是警告。

---

项目位置：`apps/web`
