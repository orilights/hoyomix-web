# AGENTS.md — 项目指引

> 米哈游游戏原声带(OST)在线收听网站。纯前端 SPA,数据来自独立音乐/用户 API。
> 完整架构见 [docs/frontend-design-spec.md](docs/frontend-design-spec.md),视觉样式见 [docs/visual-style-spec.md](docs/visual-style-spec.md)。

## 技术栈
- Vue 3.5(`<script setup>` + TS 严格模式)、Vite 8 + rolldown、TypeScript 6、vue-router 5、Pinia 4、@tanstack/vue-query 5
- 样式:UnoCSS(`unocss/vite` + `@unocss/preset-wind3`),视觉体系为「浅色玻璃拟态 + 主题化背景」
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
- `src/api/` — 按业务拆分接口：`music.ts` 为音乐服务，`emoticon.ts` 为表情，`media.ts` 为媒体源，`misc.ts` 为难归类的杂项；请求封装位于 `src/utils/fetch.ts`
- `src/composables/queries.ts` — vue-query hooks(useXxxQuery)
- `src/store/` — Pinia stores:main(产品/专辑/收藏)、player(播放器)、auth(认证)、media-source(媒体源)
- `src/types/` — 数据模型(TS 接口);`src/constants/index.ts` — 常量与环境变量
- `src/router/` — 路由(routes.ts 定义,懒加载);`src/views/` — 页面
- `src/components/` — 组件(common/、player/、playlist/、user/、icon/);`plugins/` — 自定义 Vite 插件

## 数据请求约定(重要)
- 组件内**不要直接 fetch**;所有数据获取都走 `src/composables/queries.ts` 的 `useXxxQuery` hooks
- API 函数按业务归入 `src/api/` 对应文件，难归类的接口放在 `misc.ts`；统一经 `fetchJson` / `fetchJsonMutation` 封装(`credentials: include`,404 抛 `NotFoundError`)
- 全局 queryClient 配置见 `src/utils/query-client.ts`(staleTime 5min、retry 1、refetchOnWindowFocus false)
- 新接口流程:在 `src/api/` 对应业务文件加函数 → 在 `queries.ts` 加对应 hook → 组件调用 hook

## 状态管理
- setup 语法 store:auth、media-source;options 语法 store:main、player
- 持久化用 `persist: { pick: [...] }` 指定写入 localStorage 的字段
- 乐观更新:main store 收藏先改本地再请求,失败回滚并抛错

## 环境变量
- `src/constants/index.ts` 从 `import.meta.env.VITE_*` 读取(apiBase、resourceBase、userApiBase、feedbackUrl)
- 音质 `audioQualityOptions`、排序 `artistTypeSort` 等常量也在此；游戏/产品列表（productId/name/alias）来自 `/app-config` 的 `products`，存于 main store 的 `productList`，映射查询用 `productNameMap` / `productAliasMap` getters

## 路由
- `src/router/routes.ts` 集中定义,页面用 `() => import('@/views/...')` 懒加载
- 新增页面:在 routes.ts 加路由 → 在 views/ 建 `.vue`

## 代码风格要点
- ESLint 用 `@antfu/eslint-config`;提交前跑 `pnpm lintf`
- 类型导入用 `import type`

## 发布流程
- 版本号遵循 [SemVer](https://semver.org/lang/zh-CN/)，格式为 `MAJOR.MINOR.PATCH`：不兼容变更升级主版本，向下兼容的新功能升级次版本，向下兼容的问题修复升级修订版本。升级主版本或次版本时，后续位归零；`0.x` 表示正式版之前的开发阶段，发布 `1.0.0` 需明确确定。
- 更新日志由维护者手动更新，不将更新日志文件提交到仓库；默认不创建 GitHub Release。

按以下顺序发布：
1. 确认位于 `dev` 分支，与远端同步，待发布变更均已提交且工作区干净。运行 `pnpm lint` 和 `pnpm build`，检查通过后再升级版本。
2. 使用 [bumpp](https://github.com/antfu-collective/bumpp) 升级版本，在 `dev` 分支自动提交版本变更、创建 `vX.Y.Z` 标签并推送分支与标签：
   ```sh
   pnpm dlx bumpp --commit --tag --push
   ```
   按本次变更选择符合 SemVer 的目标版本。不要手动修改 `package.json` 版本号代替 bumpp；如果目标版本及标签已存在，先核对对应提交，避免重复升级或覆盖标签。
3. 确认远端 `dev` 的版本提交和标签推送成功，再创建 PR：源分支为 `dev`，目标分支为 `main`，标题为 `release vX.Y.Z`，描述包含主要变更与验证结果。已有同一发布的 PR 时复用它。
4. 检查 PR 无冲突且检查通过后，使用 merge commit 将 `dev` 合并到 `main`，保留版本提交与标签的关联，不删除 `dev` 分支。
5. 确认 PR 已合并及 `main` 的部署状态，报告版本号、PR 链接与部署结果。

## 界面文案
- 只展示有助于用户理解内容、作出选择或完成操作的文案，避免无实际使用价值的说明、重复描述及内部实现细节。
- 排行榜计数口径、截断数量、并列规则、管理员处理方式等规则保留在开发文档中，不默认堆放在页面上；必要的时间范围、状态反馈与操作提示可以保留。完整约定见 `docs/visual-style-spec.md` 的「界面文案」。

## 特别注意
- 后端存在 CORS 域名校验，开发环境需要以 localhost 域名启动，推荐直接使用 `pnpm dev` 命令
