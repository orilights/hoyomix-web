# AGENTS.md — 项目指引

> 米哈游游戏原声带(OST)在线收听网站。纯前端 SPA,数据来自独立音乐/用户 API。
> 完整架构见 [docs/frontend-design-spec.md](docs/frontend-design-spec.md),视觉样式见 [docs/visual-style-spec.md](docs/visual-style-spec.md)。

## 技术栈
- Vue 3.5(`<script setup>` + TS 严格模式)、Vite 8 + rolldown、TypeScript 6、vue-router 5、Pinia 4、@tanstack/vue-query 5
- 样式:UnoCSS(`unocss/vite` + `@unocss/preset-wind3`),视觉体系为「浅色玻璃拟态 + 主题化背景」
- 图标:@lucide/vue;图表:ECharts 6 + vue-echarts;认证:better-auth;提示:vue-sonner;工具:@vueuse/core
- 代码规范:@antfu/eslint-config(无分号、单引号、2 空格缩进)

## 浏览器兼容
- Chromium 内核最低支持 Chrome / Edge 109；其他构建目标为 Firefox 114、Safari / iOS 16.4，JS、CSS 与独立 Worker 均需保持对应兼容目标。
- 新增 CSS 或浏览器 API 时检查基线支持情况；无法构建转换的能力需提供兼容写法或能力检测。UnoCSS 颜色与渐变兼容分支见 `plugins/unoBrowserCompat.ts`，保留现代浏览器原有视觉效果；构建转换不会自动补齐运行时 API。
- 兼容性验证使用真实旧内核，不能仅修改 UA；完整约定见 `docs/frontend-design-spec.md` 的「工程化与构建」。

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

## Commit message

- 沿用现有格式 `<type>: <中文简述>`，type 使用小写英文，英文冒号后空一格。
- 常用 type 为 `feat`（新增功能或体验优化）、`fix`（问题修复）、`refactor`（代码重构）、`docs`（文档变更）、`chore`（依赖、配置、版本等维护）。
- 简述写明实际变更，以“新增”“修复”“优化”“调整”等动词开头，末尾不加句号。
- 标题保持简洁，复杂变更可空一行后补充正文，说明原因、实现要点或验证结果。
- 版本提交沿用 bumpp 生成的 `chore: release vX.Y.Z`；合并提交和自动回滚提交保留 Git 生成的格式。

```text
feat: 移动端新增上滑打开全屏播放器手势
fix: 修复移动端沉浸模式播放按钮首次点击无响应
docs: 补充 commit message 编写约定
```

## 发布流程
- 版本号遵循 [SemVer](https://semver.org/lang/zh-CN/)，格式为 `MAJOR.MINOR.PATCH`：不兼容变更升级主版本，向下兼容的新功能升级次版本，向下兼容的问题修复升级修订版本。升级主版本或次版本时，后续位归零；`0.x` 表示正式版之前的开发阶段，发布 `1.0.0` 需明确确定。
- 每次版本发布均需编写更新日志，仅在最终回复中发送给用户，便于维护者手动更新；不写入任何文件（包括临时文件），不提交到仓库，也不自动发布到更新日志 API、公告等外部位置；默认不创建 GitHub Release。

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
6. 编写本次版本更新日志，并在最终回复中以便于复制的文本块发送给用户：
   - 参考现有更新日志的近期条目，沿用其语言、日期与版本格式、分类和详细程度。更新日志来源见 `src/api/misc.ts` 的 `getChangelog()`，当前为 `https://api.amarea.cn/config/hoyomix.changelog`。
   - 对比上一发布版本与本次发布的提交和代码，覆盖本次上线的全部变更，包括此前已提交但尚未发布的内容，不仅限于当前任务。
   - 按现有风格描述新增功能、优化改进和问题修复，仅保留有实际内容的分类；核对实际实现，保留 Beta 标识及适用范围，不包含未发布功能或未经证实的效果。
   - 使用实际版本号及用户时区的发布日期；验证结果和部署状态在发布报告中单独说明，更新日志聚焦用户可感知的变化。

## 界面文案
- 只展示有助于用户理解内容、作出选择或完成操作的文案，避免无实际使用价值的说明、重复描述及内部实现细节。
- 排行榜计数口径、截断数量、并列规则、管理员处理方式等规则保留在开发文档中，不默认堆放在页面上；必要的时间范围、状态反馈与操作提示可以保留。完整约定见 `docs/visual-style-spec.md` 的「界面文案」。

## 特别注意
- 后端存在 CORS 域名校验，开发环境需要以 localhost 域名启动，推荐直接使用 `pnpm dev` 命令
