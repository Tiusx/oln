---
title: "Tailwind CSS v4 的新特性"
description: "探索 Tailwind CSS v4 带来的 CSS-first 配置方式和性能改进。"
pubDate: 2026-08-20
tags: ["CSS", "Tailwind", "前端"]
---

## CSS-first 配置

Tailwind CSS v4 最大的变化是转向了 CSS-first 的配置方式。不再需要 `tailwind.config.js`，所有配置都写在 CSS 文件中。

```css
@import "tailwindcss";

@theme inline {
  --color-primary: #3b82f6;
  --radius: 8px;
}
```

## 性能提升

v4 使用 Oxide 引擎重写了底层，构建速度提升了 10 倍以上。

## 更好的内容检测

新的 `@source` 指令让内容检测更加精确：

```css
@source "../pages/**/*.astro";
@source "../components/**/*.{tsx,astro}";
```

## 升级建议

对于新项目，直接使用 v4。对于已有项目，可以参考官方迁移指南逐步升级。
