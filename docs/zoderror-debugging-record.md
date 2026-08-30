# Cloudflare Workers 本地开发：一次隐蔽的 ZodError 排查实录

> 排障记录 · 关键词：`wrangler dev --local`、`workerd`、`ZodError`、模块顶层副作用、`siteConfigSchema.parse({})`

## 一句话结论

`wrangler dev --local` 启动时反复报 `Uncaught Error: ZodError`，排查到最后发现根源**不在 wrangler、不在配置绑定、也不在本地缓存**，而是 Worker 源码中一个模块在**被 import 时顶层直接执行了 `zod` 的 `parse({})`**，而该 schema 的多个对象字段缺省了 `.default({})`，导致 workerd 加载 Worker 代码的瞬间就抛错。这是典型的「模块顶层副作用」引发的启动期崩溃。

---

## 背景

项目是一个自托管博客，Monorepo 三应用：

- `apps/web` — Astro 前台
- `apps/admin` — React + Vite 后台管理 SPA
- `apps/cms` — Hono Worker（D1 / R2 / KV 绑定的 Cloudflare Worker）

日常本地开发用 `wrangler dev --local` 在 `apps/cms` 里跑 Worker。

某天起，这个命令在**每次**启动时都稳定复现：

```
⎔ Starting local server...
✘ [ERROR] service core:user:blog-cms: Uncaught Error: ZodError

    at index.js:9512:24 in get error
    at index.js:9588:18 in parse
    at index.js:13602:44

✘ [ERROR] The Workers runtime failed to start. There is likely additional logging output above.
```

Worker 起不来，任务卡在这里一整天。

---

## 排查过程（按时间顺序，含走过的弯路）

### 弯路一：怀疑 wrangler 版本与 `[assets] binding`

第一次遇到时第一反应是**版本太旧**。当时的 `wrangler 3.114.17` 的本地 `--local` 模式在启用 `[assets] binding = "ASSETS"` 时会偶发 ZodError，于是做了三件事：

- 注释掉 `wrangler.toml` 里的 `binding = "ASSETS"`
- 清空 `.wrangler` 状态目录
- 甚至升级到 `wrangler 4.127.1`

**结果：全部无效**，错误依旧。日志反复提示升级 wrangler，升级后连报错堆栈的行号都变了（`9512/9588/13602` → `2763/2842/7259`），但**同一个吞吐：启动时 `parse` 抛 `ZodError`**。

> 教训：`index.js` 这里是 **workerd 内嵌的 JS**，行号会随版本变化，但它统一指向「workerd 加载 Worker 模块 → 评估顶层代码 → `zod.parse` 抛错」。

### 弯路二：怀疑 bindings 占位符（UUID 格式）

`wrangler.toml` 里有 `database_id = "REPLACE_WITH_YOUR_D1_DATABASE_ID"` 这类占位符，怀疑 miniflare 校验不合法 UUID。把占位符改成合法 UUID，**也无济于事**。

### 弯路三：怀疑本地状态缓存

清空 `.wrangler`、删 node 进程、释放 8787 端口……一个都没用。此时已经能确认：

- 端口释放不解决问题
- 版本不解决问题
- 配置不解决问题

于是**判定病根一定在 Worker 自己的源码里**。

---

## 关键转折：二分定位到具体模块

既然 workerd 是在**加载 Worker 并评估顶层代码**时报错，那就用**最小还原法**，逐步把 `src/index.ts` 的内容一点点加回来，看哪一步触发 ZodError：

| 版本 | `index.ts` 内容 | 结果 |
|---|---|---|
| 1 | `export default { fetch() { return new Response("ok"); } }` | ✅ 正常启动 |
| 2 | 只 `import { Hono } from 'hono'` | ✅ 正常启动 |
| 3 | 只 `import { z } from 'zod'` | ✅ 正常启动 |
| 4 | 只 `import { drizzle } from 'drizzle-orm/d1'` | ✅ 正常启动 |
| 5 | 只 `import * as schema from './db/schema'` | ✅ 正常启动 |
| 6 | 只 `import { loadConfigCached } from './services/config'` | ❌ **ZodError！** |

**病根锁定在 `src/services/config.ts`。**

> 二分法排除了 hono、zod、drizzle、schema 等所有「库」，最终定位到**业务模块**——这正是高质量排障里「一次只改动一个变量」的价值。

---

## 病根

打开 `src/services/config.ts`，关键在**文件顶层这几行**：

```ts
export const siteConfigSchema = z.object({
  basic: z.object({
    siteName: z.string().default('My Blog'),
    tagline: z.string().default(''),
    // ...
  }),
  seo: z.object({ ... }),
  nav: z.object({ menu: z.array(navItemSchema).default([]) }),
  author: z.object({ ... }),
  footer: z.object({ ... }),
  inject: z.object({ ... }),
  features: z.object({
    comments: z.object({ ... }),      // ← 缺 .default({})
    newsletter: z.object({ ... }),    // ← 缺 .default({})
    analytics: z.object({ ... }),     // ← 缺 .default({})
  }),
  // ...
});

// 🔴 顶层副作用！
export const DEFAULT_SITE_CONFIG: SiteConfig = siteConfigSchema.parse({});
```

问题链条：

1. `export const DEFAULT_SITE_CONFIG = siteConfigSchema.parse({})` 是**模块顶层语句**，只要这个文件被 `import`，它就会立刻执行。
2. `siteConfigSchema` 里每个**对象字段**（`basic`/`seo`/`nav`/`author`/`footer`/`inject`/`features`，以及 `features` 里的 `comments`/`newsletter`/`analytics`）都是 `z.object({ ... })` **没有 `.default({})`**。
3. 当 `parse({})` 传一个空对象时，这些对象字段全部缺失，zod 校验失败 → **抛出 `ZodError`**。
4. workerd 加载 Worker 时评估该模块顶层 → 异常传播 → 整个 runtime 起不来。

> 它的诡异之处在于：**代码「看起来」完全正确**，`siteName` 等叶子字段都有 `.default(...)`，给人的错觉是 `parse({})` 一定能成。但 zod 的 `.default()` 是「字段级」的，落在 `z.string().default(...)` 这种叶子字段上，而**对象这一层**没有 `.default({})`，于是整个对象缺失时报错。

---

## 解决方案

### 方案一（最终采用）：给对象字段补 `.default({})`

把每个嵌套对象字段的闭合 `})` 改成 `}).default({})`，让「整个对象缺失时用空对象兜底」，叶子字段再各自用 `.default(...)` 填充初值：

```ts
features: z.object({
  comments: z.object({ ... }).default({}),
  newsletter: z.object({ ... }).default({}),
  analytics: z.object({ ... }).default({}),
}),
```

### 方案二：把顶层的 parse 改成容错构造

如果不想动 schema 结构，可以在顶层显式传入每个对象层：

```ts
export const DEFAULT_SITE_CONFIG: SiteConfig = siteConfigSchema.parse({
  basic: {}, seo: {}, nav: {}, author: {}, footer: {}, inject: {}, features: {},
});
```

这样每个对象字段都收到 `{}`，内部叶子字段再用各自的 `.default(...)` 填充。

> 推荐**方案一**（补 `.default({})`），它根治问题：不仅顶层 `parse({})` 能过，今后任何「从部分 JSON 反序列化」的场景（比如从 D1 读出的不完整配置）也能安全兜底。

另外顺带修了一处类型问题——`Response.redirect(new URL(...))` 的第一个参数要求 `string`，需要 `.toString()`：

```ts
return Response.redirect(new URL('/admin/', url.origin).toString(), 301);
```

---

## 修复后验证

```
⎔ Starting local server...
[wrangler:info] Ready on http://127.0.0.1:8787
```

API 正常返回：

```
GET http://127.0.0.1:8787/api/public/config
HTTP/1.1 200 OK
{"success":true,"data":{"basic":{"siteName":"My Blog", ...},"features":{"comments":{...},...}}}
```

---

## 复盘 / 经验总结

1. **「名字带 ZodError ≠ 是你数据校验的错」**。这里的 ZodError 来自 workerd 加载 Worker 模块时的**顶层 `zod.parse`**，跟「接口请求参数校验」完全是两码事。别被错误名带偏。
2. **workerd 的 `index.js` 堆栈是「工作台」，不是「凶手」**。它只告诉你「启动阶段有问题」，具体模块要靠二分法定位。
3. **警惕「模块顶层副作用」**。`export const x = schema.parse({...})`、`new Hono()`、顶层 `await` 等在 `import` 时就执行，一旦抛错，Worker 直接起不来。这类逻辑尽量放进函数体、懒执行，或保证绝对安全。
4. **zod 的 `.default()` 是「字段级」**。想让「整个对象缺失时兜底」，必须在**对象这一层**也加 `.default({})`，而不是只给叶子字段加。
5. **二分法永远是定位问题的银弹**：每次只改变一个变量（这里是「多恢复一个 import」），快速收敛到触发点，省去无数瞎猜。

---

*记录时间：2026-08-30*
