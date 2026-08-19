# AGENTS.md — 项目指引

> HOYO-MiX Online:米哈游游戏原声带(OST)在线收听网站。纯前端 SPA,数据来自独立音乐/用户 API。
> 完整架构见 [docs/frontend-design-spec.md](docs/frontend-design-spec.md),视觉样式见 [docs/visual-style-spec.md](docs/visual-style-spec.md)。

## 技术栈
- Vue 3.5(`<script setup>` + TS 严格模式)、Vite 8 + rolldown、TypeScript 6、vue-router 5、Pinia 4、@tanstack/vue-query 5
- 样式:Tailwind CSS 4(`@tailwindcss/vite`),视觉体系为「浅色玻璃拟态 + 主题化背景」
- 图标:@lucide/vue;图表:ECharts 6 + vue-echarts;认证:better-auth;提示:vue-sonner;工具:@vueuse/core
- 代码规范:@antfu/eslint-config(无分号、单引号、2 空格缩进)

## 常用命令
- `pnpm dev` — 启动开发服务器
- `pnpm build` — 类型检查 + 构建(`vue-tsc -b && vite build`)
- `pnpm lint` / `pnpm lintf` — 检查 / 自动修复
- 包管理器为 pnpm(存在 `pnpm-workspace.yaml`),勿用 npm/yarn

## 路径与自动导入
- 别名 `@` → `src`(见 `vite.config.ts`)
- `unplugin-auto-import`:`vue`、`vue-router`、`pinia` 的 API(ref/computed/watch/useRoute 等)已自动导入,无需手写 import
- `unplugin-vue-components`:组件自动注册;`Lucide*` 图标透传到 @lucide/vue,`OverlayScrollbarsComponent` 透传到 overlayscrollbars-vue
- `src/auto-imports.d.ts`、`src/components.d.ts` 为自动生成文件,勿手改

## 目录结构
- `src/api/music.ts` — 全部 API 函数与请求封装
- `src/composables/queries.ts` — vue-query hooks(useXxxQuery)
- `src/store/` — Pinia stores:main(产品/专辑/收藏)、player(播放器)、auth(认证)、media-source(媒体源)
- `src/types/` — 数据模型(TS 接口);`src/constants/index.ts` — 常量与环境变量
- `src/router/` — 路由(routes.ts 定义,懒加载);`src/views/` — 页面
- `src/components/` — 组件(common/、player/、playlist/、user/、icon/);`plugins/` — 自定义 Vite 插件

## 数据请求约定(重要)
- 组件内**不要直接 fetch**;所有数据获取都走 `src/composables/queries.ts` 的 `useXxxQuery` hooks
- API 函数集中在 `src/api/music.ts`,统一经 `fetchJson` / `fetchJsonMutation` 封装(`credentials: include`,404 抛 `NotFoundError`)
- 全局 queryClient 配置见 `src/utils/query-client.ts`(staleTime 5min、retry 1、refetchOnWindowFocus false)
- 新接口流程:在 `music.ts` 加函数 → 在 `queries.ts` 加对应 hook → 组件调用 hook

## 状态管理
- setup 语法 store:auth、media-source;options 语法 store:main、player
- 持久化用 `persist: { pick: [...] }` 指定写入 localStorage 的字段
- 乐观更新:main store 收藏先改本地再请求,失败回滚并抛错

## 环境变量
- `src/constants/index.ts` 从 `import.meta.env.VITE_*` 读取(apiBase、resourceBase、userApiBase、feedbackUrl)
- 产品映射 `productMap`、音质 `audioQualityOptions`、排序 `artistTypeSort` 等常量也在此

## 路由
- `src/router/routes.ts` 集中定义,页面用 `() => import('@/views/...')` 懒加载
- 新增页面:在 routes.ts 加路由 → 在 views/ 建 `.vue`

## 代码风格要点
- ESLint 用 `@antfu/eslint-config`;提交前跑 `pnpm lintf`
- 类型导入用 `import type`
