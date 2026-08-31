# 将 Web (Astro) 部署到 Cloudflare

> **本文档基于** `apps/web` (Astro 项目) 使用 `@astrojs/cloudflare` adapter 部署至 Cloudflare Workers Sites。

---

## 🛠️ 前置准备

### 1. 安装 Wrangler (如果尚未安装)

```bash
# 全局安装 (后期随时使用)
npm install -g wrangler

# 或项目局部安装
npm install wrangler --save-dev

# 验证
wrangler --version
# 应输出 v4.x.x (当前项目兼容 v4.127.1)
```

### 2. 登录 Cloudflare

```bash
wrangler login
# 浏览器会弹出授权页，登录后返回成功即可
```

### 3. 确认项目位置

```bash
# 进入 Web 应用目录
cd J:\ai\blog\oln\apps\web

# 确认关键文件存在
ls -la package.json astro.config.mjs wrangler.toml
```

---

## 🌍 环境变量配置

### 1. Web 专用环境变量

Web 项目使用 Astro 的环境变量前缀 `PUBLIC_`。仅暴露以 `PUBLIC_` 开头的变量给前端。

```bash
# 进入 Web 目录
cd apps/web

# 复制环境模板 (若已存在则跳过)
copy ..\..\..\.\env.example .env 2>nul || copy .env.example .env

# 编辑 .env 填入值
notepad .env
```

### 2 `.env.example` (若不存在则创建)

```env
# Astro 公开环境变量 (前端可访问)
# 仅以 PUBLIC_ 开头的变量会暴露给前端

PUBLIC_SITE_URL=https://oln.tius.cn
PUBLIC_CMS_URL=https://oln-work.tius.cn/api/public

# 可选: 其他配置
# PUBLIC_ANALYTICS_ID=          # 如: Google Analytics ID
```

> **重要**：`PUBLIC_CMS_URL` 用于前端代理到 CMS API。确保与你的 CMS Worker URL 匹配。

### 3. 三种秘密存储方式 (任选其一)

| 方式 | 命令 | 适用场景 |
|------|------|----------|
| **Wrangler Secrets** | `npx wrangler secret put VAR` | 需要隐藏的 API 密钥、Token |
| **`.env` 文件** | 复制 `.env.example` → `.env` | 本地开发、非敏感配置 |
| **Wrangler Config** | `wrangler.toml` 中直接写入 | `compatibility_flags` 相关设置 |

> **最佳实践**：敏感值用 `wrangler secret put`，非敏感值用 `.env` 或 `wrangler.toml`。

---

## 🏗️ 构建项目

### 1. 运行 Astro Build

```bash
# 在 apps/web 目录
npm run build
# 或者
npx astro build
```

> **输出**：`dist/` 目录将包含：
> - `_astro/` (服务器端入口)
> - `_worker.js` (Cloudflare Worker 入口)
> - `assets/` (静态资源)
> - `_routes.json` (路由映射)
> - `sitemap.xml`, `robots.txt` 等

### 2. 验证构建输出

```bash
ls -la dist/
# 应该包含: _astro, _worker.js, _routes.json 等
```

---

## ⚙️ Wrangler 配置

### 1. 创建/更新 `wrangler.toml`

```toml
# 在 apps/web 目录创建/覆盖 wrangler.toml

name = "blog-web"
main = "dist/_worker.js"
compatibility_date = "2026-08-31"
compatibility_flags = ["nodejs_compat"]

# Assets binding (关键: 上传 dist 目录)
[assets]
directory = "./dist"
binding = "ASSETS"

# 可选: 如果有自定义域名
# site = "https://your-domain.com"
```

> **关键点**：
> - `main = "dist/_worker.js"`: 指向 Astro 生成的 Worker 入口
> - `compatibility_flags = ["nodejs_compat"]`: 启用 Node.js API (sharp, fs 等)
> - `[assets]`: 必须配置，否则会上传整个 `_worker.js` 目录导致错误

### 2. 处理常见错误 (基于前一次部署经验)

#### 错误: "Could not resolve 'child_process'"
**原因**：`nodejs_compat` 标志未启用，或 `sharp` 包需要 Node.js API。

**解决**：确保 `wrangler.toml` 包含 `compatibility_flags = ["nodejs_compat"]`。

#### 错误: "Uploading a Pages _worker.js directory as an asset."
**原因**：`dist/_worker.js` 是一个目录，而非文件，且未被 `.assetsignore` 忽略。

**解决**：
- 方法 A: 在 `dist/` 根目录创建空的 `.assetsignore` 文件
- 方法 B: 从 `dist/` 移除 `_worker.js` 目录 (不推荐，会丢失 Worker 入口)

**推荐做法**: 在 `dist/` 中创建 `.assetsignore`，内容如下：
```
_*.js
```
或保持空白以忽略所有 `_worker.js`。

---

## 🚀 部署流程

### 1. 本地开发测试

```bash
# 启动 Astro 开发服务器 (使用本地 .env)
npm run dev
# 或指定远程 CMS
PUBLIC_CMS_URL=https://oln-work.tius.cn/api/public npm run dev

# 访问 http://localhost:3000 (Astro 默认端口)
# 或 http://localhost:8787 (如果配置了 Wrangler dev)
```

### 2. 部署到生产环境

```bash
# 确保已完成:
# - wrangler.toml 配置正确
# - .env 包含 PUBLIC_SITE_URL 和 PUBLIC_CMS_URL
# - dist/ 已通过 npm run build 生成

# 执行部署
npx wrangler deploy

# 成功输出示例:
# ✨  Building site...
# ✨  Uploading assets...
# 🌐  https://blog-web.xxxxxx.pages.dev (或 workers.dev 域名)
```

### 3. 部署后验证

```bash
# 检查部署状态
npx wrangler whoami

# 查看实时日志
npx wrangler tail

# 验证访问
curl -s -o /dev/null -w "Status: %{http_code}\n" https://oln.tius.cn/
# 预期: 200 (如果域名已正确配置)
```

---

## 🧪 功能测试

### 1. 基础可达性

```bash
# Web 主入口
curl -s -o /dev/null -w "Status: %{http_code}\n" https://oln.tius.cn/

# 检查 Sitemap (Astro 自动生成)
curl -s https://oln.tius.cn/sitemap.xml | head -10
# 应该返回 XML sitemap

# 检查 Robots.txt
curl -s https://oln.tius.cn/robots.txt
# 应该返回 robots.txt 内容
```

### 2. CMS API 集成测试

```bash
# 前端配置是否正确 (访问 CMS 配置 API)
curl -s https://oln-work.tius.cn/api/public/config | head -3
# 应该返回 JSON (前端会从这里获取站点配置)

# 文章列表
curl -s https://oln-work.tius.cn/api/public/posts?limit=1 | head -5
# 应该返回文章数据
```

### 3. 环境变量测试

```bash
# 验证 PUBLIC_SITE_URL 是否生效
# 在 Astro 源码中: const siteUrl = useSiteUrl() 或 process.env.PUBLIC_SITE_URL
# 部署后可通过网页源码检查是否包含正确的域名
```

---

## ⚠️ 常见问题与排查

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| **Web 返回 500** | `nodejs_compat` 标志缺失 | 确保 `wrangler.toml` 包含 `compatibility_flags = ["nodejs_compat"]` |
| **`Uploading a Pages _worker.js directory as an asset.`** | `dist/_worker.js` 是目录且未被忽略 | 在 `dist/` 创建 `.assetsignore` 文件 |
| **CMS API 请求失败 (CORS)** | `PUBLIC_CMS_URL` 域名不匹配 | 检查 `.env` 中 `PUBLIC_CMS_URL` 是否与 CMS Worker 域名一致 |
| **资源 (CSS/JS) 404** | `dist/` 未正确上传 | 重新运行 `npm run build` 后 `npx wrangler deploy` |
| **自定义域名解析错误** | DNS 未指向 Cloudflare | 在 Cloudflare Dashboard 中添加自定义域名并等待传播 |
| **首次加载慢** | Workers Sites 冷启动 | 预期现象，后续访问会加速 |

---

## 📦 完整部署清单

```bash
# ► 0. 前置检查
☐ Node.js v20+ 已安装
☐ wrangler login 已登录
☐ Astro 依赖已安装: npm install

# ► 1. 环境变量
☐ cd apps/web
☐ copy .env.example .env (或创建)
☐ 编辑 .env: PUBLIC_SITE_URL, PUBLIC_CMS_URL

# ► 2. 构建项目
☐ npm run build
☐ ls dist/ 验证输出

# ► 2. Wrangler 配置
☐ 创建/检查 wrangler.toml
☐ 确保 compatibility_flags 包含 nodejs_compat
☐ 确保 [assets] 配置正确

# ► 3. 部署
☐ npx wrangler deploy

# ► 4. 验证
☐ curl https://oln.tius.cn/ (状态码 200)
☐ curl https://oln.tius.cn/sitemap.xml (应返回 XML)
☐ curl https://oln-work.tius.cn/api/public/config (应返回 JSON)
```

---

## 🎯 部署后配置

### 1. 绑定自定义域名

- Cloudflare Dashboard → Workers & Pages → 你的 Worker → **Domains**
- 添加: `api.your-domain.com`, `admin.your-domain.com`
- 或绑定到 Pages: `https://your-domain.com`

### 2. 设置 Cron 触发器 (如有定时任务)

```toml
# wrangler.toml 中添加 (如果 Worker 需要定时任务)
[[cronjobs]]
hour = "*/6"  # 每 6 小时
minute = "0"
path = "/cron/backup"  # 你的 Worker 处理路径
```

### 3. 监控与日志

```bash
# 查看实时日志
npx wrangler tail

# 检查错误率
npx wrangler analytics range requests --services blog-web
```

### 4. 回滚版本 (如需要)

```bash
# 查看历史版本
npx wrangler versions

# 回滚到之前版本
npx wrangler versions edit --deployments your-version-id
```

---

## 📝 不要提交到 git 的文件

| 文件/资源 | 是否提交 git | 备注 |
|-----------|--------------|------|
| `apps/web/.env` | ❌ No | 已 gitignore, 含真实值 |
| `apps/web/.env.example` | ✅ Yes | 只含模板, 提交仓库 |
| `apps/web/wrangler.toml` | ✅ Yes | 配置模板, 真实值由环境变量提供 |
| `apps/web/.wrangler/` | ❌ No | 生成目录, gitignore 已包含 |
| `apps/web/.dev.vars` | ❌ No | 本地开发用, gitignore |
| `node_modules/` | ❌ No | gitignore 已包含 |
| `dist/` | ⚠️ Build output | 每次构建后生成, 不应手动提交 |

---

## 💡 小贴士

1. **`output: 'static'` vs `output: 'server'`**：
   - `output: 'static'`: 生成纯静态文件，适合内容型网站（博客）
   - `output: 'server'`: 生成服务器渲染应用，适合需要后端逻辑的项目
   - **本项目推荐**: `output: 'static'` (参考 `astro.config.mjs` 中的当前配置)

2. **`PUBLIC_` 前缀**：
   - 仅以 `PUBLIC_` 开头的变量会被打包到前端 bundle
   - 敏感变量（API 密钥等）不要以 `PUBLIC_` 开头，改用 `wrangler secret put`

3. **Astro + Cloudflare Adapter 注意事项**：
   - 某些 npm 包 (如 `sharp`) 需要 `nodejs_compat` 标志
   - `dist/_worker.js` 是关键入口，必须通过 `[assets]` 配置上传
   - `public/` 目录下的静态资源会自动转移到 Cloudflare CDN

4. **首次部署耗时**：
   - Astro build: 通常 30秒 - 2分钟
   - Wrangler 上传: 取决于资源大小
   - 域名传播: 如绑定自定义域名，需等待 DNS 传播 (通常 < 5 分钟)

5. **成本提醒**：
   - Workers Sites 相对便宜，但请监控 KV 使用量
   - 如有大量图片，考虑使用 R2 存储并通过 Worker 转发

---

**文档最后更新**：2026-09-01  
**适用版本**：Wrangler v4.127.1, Astro v5.7.0, @astrojs/cloudflare adapter  
**项目位置**：`J:\ai\blog\oln\apps\web`