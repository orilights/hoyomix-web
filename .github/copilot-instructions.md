# HOYO-MiX Online 项目指南

HOYO-MiX Online 是一个展示 HOYO-MiX（米哈游旗下音乐团队）专辑与歌曲信息的 Web 应用。

## 技术栈

- **框架**: Vite + Vue 3.5 + TypeScript 5.8（严格模式，启用 `noUnusedLocals`、`noUnusedParameters`）
- **路由**: Vue Router 4（路由组件全部懒加载）
- **状态管理**: Pinia 3（单 store `main`）
- **样式**: Tailwind CSS 4（通过 `@tailwindcss/vite` 集成，无独立配置文件）+ Sass
- **工具库**: @vueuse/core（`useElementSize`、`useDateFormat` 等）
- **代码规范**: @antfu/eslint-config（默认配置，单引号、无分号）

## 项目结构

```
src/
├── api/          # fetch 封装，从静态 JSON API 获取数据
├── assets/       # 样式（tailwind.css）和图片资源
├── components/   # 可复用组件（common/ 通用组件、icon/ SVG 图标组件）
├── constants/    # 常量（环境变量、productMap 产品映射表、artistTypeSort 排序）
├── layout/       # 页面布局（DefaultLayout：导航栏 + 背景图 + 内容区）
├── router/       # 路由配置（routes.ts 定义路由，index.ts 创建实例）
├── store/        # Pinia 状态（albumList、backgroundUrl、pageLoading）
├── types/        # 类型定义（export.ts 导出格式、netease.ts 平台）
├── utils/        # 工具函数（time.ts 时间、misc.ts 封面/平台）
├── views/        # 页面视图（Home、Album、Music、Product、Artist、Settings）
plugins/          # Vite 自定义插件（buildInfo 构建时间注入到 HTML）
```

## 编码约定

- 组件使用 `<script setup lang="ts">` + Composition API
- 路径别名 `@` 指向 `src/`
- Vue/Vue Router/Pinia 的 API（`ref`、`computed`、`useRoute` 等）已自动导入，无需手动 import
- 组件已自动注册，使用时直接引用即可
- 响应式布局使用 Tailwind 断点（`md:`、`xl:`）
- 图片统一使用 `loading="lazy"` 懒加载
- 组件内使用 `storeToRefs()` 解构 store 状态以保持响应性
- 工具函数统一从 `@/utils` 导入（barrel export）
- 新增页面路由在 `src/router/routes.ts` 中注册，使用 `() => import()` 懒加载
- SVG 图标组件放在 `src/components/icon/`，使用 `currentColor` 继承颜色
- 注释需使用中文并保持简洁，禁止长句、英文长文或带序号的注释，仅关键与复杂逻辑需要注释

## API 与数据

- API 基于静态 JSON 文件（`VITE_API_BASE` 环境变量配置）
- 资源地址通过 `VITE_RESOURCE_BASE` 配置
- 反馈页面通过 `VITE_FEEDBACK_URL` 配置
- 核心数据类型定义在 `src/types/core.ts`（内部格式）和 `src/types/export.ts`（导出格式）
- 两套数据类型：`core.ts` 为原始 API 数据结构，`export.ts` 为前端展示结构（含 `ExportPlatforms`）
- 支持网易云音乐和 QQ 音乐两个平台的链接跳转

## 关键模式

- **背景图切换**: 通过 Pinia store 的 `backgroundUrl` + CSS 变量 `--background-image` + 双层 opacity 渐变实现平滑切换
- **数据聚合**: `src/utils/data.ts` 中的 `getArtistsData`（按艺术家维度）/ `getArtistsData2`（按类型维度）聚合艺术家数据
- **封面 URL**: `getCoverUrl()` 根据平台（ncm/qq）生成封面地址，支持指定尺寸
- **产品映射**: `productMap` 将产品代码映射为中文名称（如 `genshin` → `原神`）
- **加载状态**: `pageLoading` + `pageLoadKey` 配合防止竞态（仅当 key 匹配时才清除 loading）
- **布局**: `DefaultLayout` 提供固定头部（毛玻璃效果）+ 两层背景图过渡 + 内容区白色半透明卡片
