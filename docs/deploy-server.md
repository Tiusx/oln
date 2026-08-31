# 部署 Server (Hono Worker)

`apps/server` 是后端服务（Hono Worker），托管**公开 API**、**管理 API** 与 **admin SPA**。

- 部署方式：`wrangler deploy`（在 `apps/server` 目录）
- 自定义域名：`https://api.example.com`

> 文档中的域名、ID、密钥均为**示例**，请替换为你自己的真实值。

---

## 架构

```
apps/server (Hono Worker)
   ├─ 公开 API   /api/public/*   前端 (Web) 读取
   ├─ 管理 API   /admin/api/*    admin 后台调用
   └─ 静态资源   /admin/*        ASSETS binding 服务 admin SPA
          │
          ▼
   Worker → https://api.example.com/
```

## 绑定（`apps/server/wrangler.toml`）

| Binding | 类型 | 示例 | 用途 |
|---------|------|------|------|
| `DB` | D1 | 库 `blog`, id `d1-xxxxxxxx` | 数据库 |
| `MEDIA` | R2 | bucket `blog-media` | 媒体文件 |
| `CACHE` | KV | id `kv-xxxxxxxx` | 缓存 |
| `ASSETS` | static | `./public` | 托管 admin SPA |

## 本地开发

三个服务各有独立端口，通过代理串联。**server 是核心**，admin/web 都依赖它。

| 服务 | 命令（根目录） | 端口 |
|------|---------------|------|
| server (Hono Worker) | `npm run dev:server` | `http://localhost:8787` |
| admin (React Vite) | `npm run dev:admin` | `http://localhost:5173/admin/` |
| web (Astro SSR) | `npm run dev:web` | `http://localhost:4321` |

启动步骤（分别开三个终端）：

```bash
# 终端 A：server（wrangler dev --local）
npm run dev:server

# 终端 B：admin
npm run dev:admin

# 终端 C：web
npm run dev:web
```

首次可能需初始化本地 D1：

```bash
npm --prefix apps/server run db:migrate:local
```

本地 seed 首个管理员（本地 D1 是空的，调本地接口）：

```powershell
$body = '{"usernameOrEmail":"admin","password":"admin"}'
[byte[]]$b = [System.Text.Encoding]::UTF8.GetBytes($body)
Invoke-WebRequest -Uri "http://localhost:8787/admin/api/auth/seed" -Method Post `
  -ContentType "application/json; charset=utf-8" -Body $b -UseBasicParsing
```

> 提示：服务器代码改动用 wrangler dev 热重载；admin/web 各自有 HMR 自动刷新。

## 部署

```bash
cd apps/server

# 首次：设置秘密（不提交 git）
wrangler secret put ADMIN_SECRET    # 输入你的密钥
wrangler secret put ENVIRONMENT     # 输入 production

# 部署
npm run deploy   # 即 wrangler deploy
```

## 验证

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://api.example.com/          # 200
curl -s https://api.example.com/api/public/config                           # JSON 配置
curl -s "https://api.example.com/api/public/posts?limit=1"                  # JSON 文章
curl -s -o /dev/null -w "%{http_code}\n" https://api.example.com/admin/     # 200 (admin SPA)
```

## 数据库迁移

首次部署后需执行迁移（换上真实迁移文件名）：

```bash
cd apps/server
wrangler d1 execute blog --remote --file=migrations/0000_init.sql
wrangler d1 execute blog --remote --file=migrations/0001_messages_hitokoto.sql
wrangler d1 execute blog --remote --file=migrations/0002_drop_messages.sql
wrangler d1 execute blog --remote --file=migrations/0003_post_comments_enabled.sql
```

## 常见问题

| 问题 | 解决 |
|------|------|
| `Binding ID is not valid` | `wrangler.toml` 的 ID 占位，需用真实 D1/R2/KV ID |
| 迁移失败 | 加 `--remote` 并确认真实数据库名 |
| admin 空白/404 | 先构建 admin（见 deploy-admin.md），产物在 `apps/server/public` |
| README 提到部署文档 | Web 走 [deploy-web.md](deploy-web.md)，admin 走 [deploy-admin.md](deploy-admin.md) |

---

项目位置：`apps/server`
