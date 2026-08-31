# 将 CMS 部署到 Cloudflare Workers

> **本文档基于** `apps/cms` (Hono Worker) 项目，使用 `wrangler` CLI 部署至 Cloudflare。

---

## 🛠️ 前置准备

### 1. 安装 Wrangler

```bash
# 推荐全局安装 (后期随时使用)
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
# 进入 CMS 应用目录
cd J:\ai\blog\oln\apps\cms

# 确认关键文件存在
ls -la wrangler.toml .env.example env.ts
```

---

## 🌍 环境变量配置

### 1. 复制环境模板

```bash
# 已在 .gitignore 中，真实值不会提交到 git
copy .env.example .env

# 编辑 .env 填入本地开发值
notepad .env
```

### 2. `.env.example` 模板 (已创建)

```env
# D1 Database (部署后由 wrangler 自动填充)
DB_URL=

# R2 Bucket
R2_BUCKET_NAME=        # 如: blog-media

# KV Namespace (ID 会自动注入到 wrangler.toml)
KV_NAMESPACE_ID=

# Admin Secret (用于 CORS/CSRF 签名，可选)
ADMIN_SECRET=

# Environment
ENVIRONMENT=           # development | production
```

### 3. 三种秘密存储方式 (任选其一)

| 方式 | 命令 | 适用场景 |
|------|------|----------|
| **Wrangler Secrets** | `npx wrangler secret put ENVIRONMENT` | 生产环境密码/密钥/Token |
| **`.env` 文件** | 复制 `.env.example` → `.env` | 本地开发调试 |
| **`wrangler.toml` 占位符** | `database_id = "REPLACE_WITH_YOUR_D1_DATABASE_ID"` | ID 类非敏感标识符 |

> **最佳实践**：使用 `wrangler secret put` 存储真正的秘密，`.env` 仅用于本地开发。

---

## 🗄️ 基础设施配置 (一次性)

### 1. 创建 D1 数据库

```bash
cd apps/cms

# 创建数据库 (输出 ID, 稍后写入 wrangler.toml)
npx wrangler d1 create oln
# 输出: Created database "oln" with id: 0d59d0f3-6c53-430f-ac90-5fe09110d196

# 将 ID 写入 wrangler.toml:
# database_id = "0d59d0f3-6c53-430f-ac90-5fe09110d196"
```

### 2. 运行数据库迁移

```bash
# 确保在 apps/cms 目录
npx wrangler d1 execute oln --remote --file=migrations/0000_init.sql
npx wrangler d1 execute oln --remote --file=migrations/0001_messages_hitokoto.sql
npx wrangler d1 execute oln --remote --file=migrations/0002_drop_messages.sql
npx wrangler d1 execute oln --remote --file=migrations/0003_post_comments_enabled.sql

# 验证表是否创建
npx wrangler d1 execute oln --remote --command="SELECT name FROM sqlite_master WHERE type='table'"
```

### 3. 创建 R2 存储桶 (媒体文件)

```bash
npx wrangler r2 bucket create blog-media
# bucket_name = "blog-media" (已在 wrangler.toml 中配置)
```

### 4. 创建 KV 命名空间 (缓存)

```bash
# 运行后，wrangler.toml 的 [[kv_namespaces]].id 会自动填充
npx wrangler kv namespace create oln
# 输出: id: "79a289a5959f412598fbced061c6930a"

# 如需手动更新 wrangler.toml:
# id = "79a289a5959f412598fbced061c6930a"
```

### 5. 配置环境变量秘密

```bash
# 设置秘密 (存入 Cloudflare 账户层面，不在代码中)
npx wrangler secret put ENVIRONMENT
# 输入: production

npx wrangler secret put ADMIN_SECRET
# 输入: your-super-secret-key

# 查看已设置的秘密
npx wrangler secret list
```

---

## 🚀 部署流程

### 1. 本地开发测试

```bash
# 启动本地开发服务器 (使用本地 .env 文件)
npm run dev:cms
# 或
npx wrangler dev

# 访问 http://localhost:8787
# 此时会使用本地配置，不影响生产环境
```

### 2. 部署到生产环境

```bash
# 确保已完成下列配置:
# - wrangler.toml 有正确的占位符/真实 ID
# - secrets 已通过 wrangler secret put 设置
# - .env (本地) 已填充调试值 (可选)

# 执行部署
npx wrangler deploy

# 成功输出示例:
# ✨  Uploaded oln (3.45s)
# ✨  Deployed oln triggers (1.00s)
# 🌐  https://oln-xxxxxx.workers.dev
# 🆔  Current Version ID: xxx-xxx-xxx
```

### 3. 部署后验证

```bash
# 检查账户信息
npx wrangler whoami

# 实时日志 (查看运行时错误)
npx wrangler tail

# 验证绑定是否生效
npx wrangler secret list
```

---

## 🧪 功能测试

### 1. 基础可达性

```bash
# CMS 主入口
curl -s -o /dev/null -w "Status: %{http_code}\n" https://oln-work.tius.cn/

# API 配置 (测试 DB + CACHE 是否正常)
curl -s https://oln-work.tius.cn/api/public/config | head -3
# 应该返回 JSON 配置对象
```

### 2. D1 数据库测试

```bash
# 写入测试
npx wrangler d1 execute oln --remote --command="INSERT INTO test_table (name) VALUES ('verify')"

# 读取测试
npx wrangler d1 execute oln --remote --command="SELECT * FROM test_table"
# 应该返回刚才插入的数据
```

### 3. R2 存储桶测试

```bash
# 通过 CMS API 测试上传 (或手动测试)
curl -s https://oln-work.tius.cn/api/media/list | head -5
# 应该返回媒体列表
```

### 4. KV 缓存测试

```bash
# 写入测试
npx wrangler kv key put oln:test_key "hello_cache" --namespace oln

# 读取测试
npx wrangler kv key get oln:test_key --namespace oln
# 输出: hello_cache
```

### 5. 环境变量测试

```bash
# 验证 ENVIRONMENT 变量是否生效
curl -s https://oln-work.tius.cn/api/public/config | node -e "process.stdin.on('data', d => console.log(d))" | grep environment
# 应该返回 "production" 或设定的值
```

---

## ⚠️ 常见问题与排查

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| **`KV namespace 'REPLACE_WITH_YOUR_KV_NAMESPACE_ID' is not valid` | `wrangler.toml` id 仍是占位符 | 运行 `npx wrangler kv namespace create oln` 让 wrangler 自动填充 |
| **`Unable to read SQL text file "migrations"` | `--file` 路径错误 | `cd apps/cms && --file=migrations/0000_init.sql` |
| **`Unknown argument: sql`** | 用 `--sql` 而非 `--command`/`--file` | 改用 `--command="SELECT 1"` |
| **Web 返回 500** | Astro adapter 配置问题 | 使用 `output: 'static'` 或部署到 Cloudflare Pages |
| **CACHE 不生效** | KV 没绑定或 ID 未更新 | 确认 `wrangler kv namespace create oln` 已运行 |
| **R2 上传失败** | 权限不足或 bucket_name 错误 | 检查 `wrangler.toml` 的 `bucket_name` 配置 |

---

## 📦 完整部署清单

```bash
# ► 0. 前置检查
☐ Node.js v20+ 已安装
☐ wrangler login 已登录
☐ 项目代码已在 git (但 .env/.secrets 不提交)

# ► 1. 基础设施
☐ npx wrangler d1 create oln          → 记录 database_id
☐ npx wrangler r2 bucket create blog-media
☐ npx wrangler kv namespace create oln → ID 自动写入 toml
☐ npx wrangler secret put ENVIRONMENT
☐ npx wrangler secret put ADMIN_SECRET

# ► 2. 数据库迁移
☐ cd apps/cms
☐ npx wrangler d1 execute oln --remote --file=migrations/0000_init.sql
☐ npx wrangler d1 execute oln --remote --file=migrations/0001_messages_hitokoto.sql
☐ npx wrangler d1 execute oln --remote --file=migrations/0002_drop_messages.sql
☐ npx wrangler d1 execute oln --remote --file=migrations/0003_post_comments_enabled.sql

# ► 3. 部署
☐ npx wrangler deploy

# ► 4. 验证
☐ curl https://oln-work.tius.cn/api/public/config (应返回 JSON)
☐ curl https://oln-work.tius.cn/ (状态码 200)
☐ npx wrangler kv key put/get oln:test (测试 KV)
☐ 上传测试图片 (测试 R2)
```

---

## 🎯 部署后配置

### 1. 绑定自定义域名

- Cloudflare Dashboard → Workers & Pages → 你的 Worker → **Domains**
- 添加: `api.your-domain.com`, `admin.your-domain.com`

### 2. 设置 Cron 触发器 (如有定时任务)

```toml
# wrangler.toml 中添加
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
npx wrangler analytics range requests --services your-worker
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
| `apps/cms/.env` | ❌ No | 已 gitignore, 含真实值 |
| `apps/cms/.env.example` | ✅ Yes | 只含模板, 提交仓库 |
| `apps/cms/wrangler.toml` | ✅ Yes | 含占位符 ID, 真实 ID 由 wrangler 自动填充 |
| `apps/cms/.wrangler/` | ❌ No | 生成目录, gitignore 已包含 |
| `apps/cms/.dev.vars` | ❌ No | 本地开发用, gitignore |
| `wrangler secret put ...` | ❌ No | 存云端, 不在代码中 |
| `node_modules/` | ❌ No | gitignore 已包含 |
| `dist/` / `public/` | ⚠️ Build output | 视构建工具而定 |

---

## 💡 小贴士

1. **首次部署耗时**：D1 数据库全球复制需要几分钟，KV 也需要传播时间
2. **局域网测试**：`npx wrangler dev` 使用本地 D1/R2，便于调试
3. **环境区分**：开发用 `ENVIRONMENT=development`，生产用 `production`
4. **日志监控**：生产环境定期运行 `npx wrangler tail` 检查错误
5. **备份策略**：D1 支持书签备份，养成定期导出习惯
6. **成本提醒**：KV 读写次数有限额，生产前请检查使用量

---

**文档最后更新**：2026-09-01  
**适用版本**：Wrangler v4.127.1, Hono + Astro 集成项目  
**项目位置**：`J:\ai\blog\oln\apps\cms`