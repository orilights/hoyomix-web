# HOYO-MiX Online 前端设计规范

视觉样式见 **[visual-style-spec.md](./visual-style-spec.md)**（色彩、排版、间距、动效、玻璃拟态、控件等取值不在此重复）。

本规范覆盖架构、目录、状态、数据、播放器、布局与工程化约定，作为开发与维护的参考基准。

应用主题由独立的 `theme` Pinia store 管理，`ThemeMode` 为 `'system' | 'light' | 'dark'`，默认 `'system'`；仅持久化 `mode`，`isDark` 根据用户选择与系统偏好计算。初始化在应用挂载前完成，监听系统明暗变化，并同步根元素 `dark` class、`color-scheme` 与浏览器 `theme-color`。入口页内脚本提前读取同一存储键 `theme`，异常或无效记录回退至跟随系统，减少首屏闪烁。设置页和导航栏复用 `ThemeSwitcher`，分别提供三档单选与循环切换。

---

## 1. 项目概述

米哈游（HoYoverse）游戏原声带（OST）在线收听网站，收录原神、星穹铁道、绝区零、崩坏 3/学园 2、未定事件簿等游戏的专辑与歌曲，提供在线播放、歌词、歌单、随机播放、排行榜、统计、账号与收藏。纯前端 SPA，数据来自独立音乐/用户 API。

---

## 2. 技术栈

| 类别 | 选型 |
| --- | --- |
| 框架/构建 | Vue 3.5（`<script setup>` + TS 6）、Vite 8 + rolldown |
| 路由/状态 | vue-router 5（History 模式）、Pinia 4 + `pinia-plugin-persistedstate` |
| 数据请求 | @tanstack/vue-query 5（读取）、原生 fetch 封装（写入） |
| 样式/图标 | UnoCSS（`unocss/vite` + `@unocss/preset-wind4`）、@lucide/vue |
| 其他 | OverlayScrollbars、ECharts 6 + vue-echarts、better-auth、vue-sonner、vuedraggable、@vueuse/core |
| 代码规范 | @antfu/eslint-config（无分号、单引号、2 空格） |

---

## 3. 目录结构

```
plugins/            # 自定义 Vite 插件（buildInfo、injectHead）
src/
├── main.ts         # 应用入口（装配 router/pinia/vue-query/scrollbars）
├── App.vue         # 全局壳：BackgroundLayer + Header + 路由视图 + 播放器 + Toaster
├── api/music.ts    # 全部 API 函数与 fetch 封装
├── composables/queries.ts  # vue-query hooks（useXxxQuery）
├── store/          # Pinia：main、player、auth、media-source
├── router/         # routes.ts（懒加载路由表）+ index.ts
├── views/          # 页面级组件
├── components/     # common/、player/、playlist/、user/、icon/、业务组件
├── constants/      # 常量与环境变量（音质、产品映射、媒体源区域等）
├── types/          # 数据模型（TS 接口）
├── utils/          # 纯函数（时间、歌词、封面、播放器、Media Session 等）
└── assets/         # tailwind.css、style.css、图片
```

---

## 4. 架构与分层

- **API 层（`api/music.ts`）**：唯一网络出入口。`fetchJson`/`fetchJsonMutation` 统一封装（`credentials: include`、404 抛 `NotFoundError`、`{error}` 消息），接口以 `xxxApi` 命名。
- **数据访问层（`composables/queries.ts`）**：`useXxxQuery` 封装 queryKey、enabled、staleTime。
- **状态层（`store/*`）**：Pinia 承载全局 UI 与播放器状态。
- **工具层（`utils/*`）**：无 Vue 依赖的纯函数。
- **视图/组件层**：页面与通用/业务组件。

> 约定：**读取走 vue-query，写入走 store 内直接调 API**。跨组件/持久化/高频状态进 Pinia；查询结果需全局共享时用 `watch(..., { immediate: true })` 反填 store（如 `main` 的 `albumList`）。

### 4.1 启动流程（`main.ts`）

`OverlayScrollbars` 插件 → `createPinia`+持久化 → `app.use(router/pinia/VueQueryPlugin)` → 挂载。`App.vue` 内为主内容区装配 OverlayScrollbars、初始化播放器，拉取专辑列表与应用配置，装配认证会话。

---

## 5. 路由设计

History 模式，全部 `() => import(...)` 懒加载；`scrollBehavior` 返回时保留滚动位置（延迟 100ms），否则回顶。路由表中路径、名称、视图一一对应，页面统一 `() => import('@/views/...')`。要点：`Music` 视图同时服务「专辑内单曲」与「歌单内单曲」两条路由；`/:pathMatch(.*)*` 兜底 404。新增页面：在 `routes.ts` 加一条 → 在 `views/` 建 `.vue`。

---

## 6. 状态管理（Pinia）

| Store | 职责 |
| --- | --- |
| `main` | 专辑/产品列表、背景 `backgroundUrl`、搜索开关、专辑布局偏好 `albumLayoutMap`、随机歌单配置与结果、收藏 `favoriteSongIds`/`favoritePlaylistIds` |
| `player` | 播放器状态机（见 §8） |
| `media-source` | 媒体源选择与延迟测速：`selectedSource` + 自动模式最低延迟节点 → `effectiveSource`；`testLatency()` 多轮 HEAD 测速取均值 |
| `auth` | better-auth `useSession()` 派生 `user`/`isLoggedIn`；`requireLogin()` 守卫 |

约定：持久化用 `persist: { pick: [...] }` 指定字段；`main` 收藏采用**乐观更新**（先改本地、失败回滚并抛错）。`auth`/`media-source` 用 setup 语法，`main`/`player` 用 options 语法。

---

## 7. 数据层

- 全局 `queryClient`：`staleTime 5min`、`retry 1`、`refetchOnWindowFocus: false`。
- 各查询定制 `staleTime`（专辑 10min、歌词 30min、公告 1h 等），用 `computed` queryKey 与 `enabled` 控制。
- 新接口流程：`music.ts` 加函数 → `queries.ts` 加 hook → 组件调用 hook。
- 环境变量 → 常量：`apiBase`、`resourceBase`、`userApiBase`、`feedbackPageUrl`。

---

## 8. 播放器子系统

分层：**store（player）+ 单例 AudioPlayer（声音引擎）+ 若干 UI 组件**。

### 8.1 声音引擎（`utils/player.ts`）

- 封装单个 `HTMLAudioElement`（`crossOrigin: anonymous`）。
- 可选 Web Audio 频谱：`AudioContext` + `AnalyserNode`（fftSize 256），供 `PlayerSpectrum`。
- 自定义事件 `on/off/emit`（play/pause/ended/error/bufferupdate/loading 等）。
- **多 URL 故障切换**：`loadSong(urls)`，当前 URL 出错自动尝试下一个。
- 全局单例 `getAudioPlayer()`。

### 8.2 媒体源与音质（`utils/player-utils.ts` + `constants`）

- 音质：`9` 无损 / `5` 较高 320 / `1` 标准 128（`audioQualityOptions`）。
- `selectMediaUrls` 优先目标音质，失败**降级再升级**回退；`selectMediaUrlsWithSource` 优先所选媒体源。

### 8.3 播放 Store（`store/player.ts`）

- 状态：持久化（playlist/currentIndex/playMode/volume/quality/歌词外观）+ 运行时（isPlaying/currentTime/duration/bufferedEnd/loading/歌词/isFullscreen/showPlaylist）。
- 播放模式：`sequential`/`loop`/`single`/`shuffle`。
- 动作：`playSong`（重置状态 → vue-query 缓存取媒体 → 选 URL → 播放）、`togglePlay`、`replacePlaylist`、`addToPlaylist`（去重）、`removeFrom`/`reorderPlaylist`、`switchQuality`（可播放后 seek 回位）、`reloadCurrentSong`（切源后重载）。
- **错误恢复**：连续出错 ≥2 次判定服务不可用停止，否则自动切下一首并 toast。
- **Media Session**：对接系统媒体控制，更新 `playbackState` 与 `setPositionState`。

### 8.4 歌词（`utils/lyric.ts` + `PlayerLyrics`）

- LRC 解析 `[mm:ss.xx]`，`mergeLyrics` 合并原文与翻译（±0.01s 模糊匹配），无时间戳则纯文本展示。
- 来源 `ncm`/`qq` 由 `selectLyricProvider` 按平台与偏好选择。
- `PlayerLyrics`：逐行高亮、自动滚动（用户滚动暂停 3s）、点击 seek、可开关翻译、偏移与字号调节。

### 8.5 播放器 UI（`components/player/`）

`PlayerBar`（常驻播放条，移动端滑动切歌）、`PlayerControl`/`PlayerControlMobile`、`PlayerPlayBtn`、`PlayerProgress`（进度/缓冲，支持拖拽）、`PlayerBarSongInfo`、`PlayerFullscreen`（全屏大屏 + 动态渐变背景 + 下滑收起）、`PlayerLyrics`、`PlayerSpectrum`、`PlayerPlaylist`（vuedraggable 排序/删除/清空）。

### 8.6 定时播放

- 全屏播放器的定时按钮打开 `PlayerSleepTimer` 共用面板，桌面和移动端均使用播放器深色玻璃样式。提供时长滑块（5–120 分钟、步长 5、默认 30）和歌曲数量（1–50 首、默认 5），运行中可取消或重新设置；修改选项后点击“重新开始”才替换当前任务。
- 时长从开启时持续倒计时，暂停和缓冲期间仍计时。可勾选“播放完最后一首歌曲”（默认关闭）：到时正在播放则等待当前歌曲结束，等待期间手动切歌立即暂停；到时已暂停或无歌曲则直接结束。
- 歌曲模式计入自然结束和手动切歌，单曲循环每播完一次计一首。进度拖动、暂停恢复、音质和音源重载不计数；自动错误恢复不计数。达到目标时在下一次自动播放之前拦截并暂停。
- `player` store 保存任务运行状态，并仅持久化 `sleepTimerPreferences`。`App.vue` 的全局时钟按截止时间校准，并在页面可见性变化、聚焦和恢复时立即检查；退出全屏后继续执行，刷新后取消任务并保留偏好。
- 开启或取消任务不改变播放状态，任务完成保留队列。加载中的媒体请求和音源重试受暂停保护，避免任务完成后恢复播放。

---

## 9. 全局 UI / 布局

```
BackgroundLayer（固定模糊背景，双图层 500ms 交叉淡入，上方统一白色半透明叠层）
Header（透明固定顶栏；全屏播放时隐藏）
DesktopSidebar（≥1280px 挂载，固定宽 240px，独立滚动；全屏播放时由播放器覆盖并禁用交互，动画期间保留底层画面）
└─ 主内容区（透明，固定于顶栏与播放条之间，使用 OverlayScrollbars 独立滚动；px-4→md:px-16→xl:px-8；桌面左侧让位 240px；pt-6 pb-7）
   └─ <router-view> + Transition「page-fade」(0.3s out-in)
PlayerPlaylist / PlayerBar / PlayerFullscreen（全局常驻，不随路由销毁）
Toaster（全局提示）
```

- 背景 `backgroundUrl` 由各页面 `onMounted` 经 `store.setBackground(...)` 设置（如专辑封面 128px）。
- Header 左侧返回/主页/设置，右侧搜索（`Ctrl/Cmd+K`）、通知、用户信息。
- 桌面 Header 随内容右移，隐藏主页和设置按钮；侧栏提供发现、我的音乐、创建和收藏歌单，底部固定设置与反馈。游戏分类继续由首页提供。底部播放器维持全宽，侧栏下缘避让其 72px 高度；首页内容不变。
- 个人歌单查询以用户 ID 区分缓存，仅登录后启用；歌单创建、编辑、删除和收藏成功后使对应查询失效。侧栏复用现有查询及新建弹窗；歌单页标签通过 Vue Router query 同步，以支持侧栏跳转与前进后退。

---

## 10. 通用组件规范（`components/common/`）

| 组件 | 说明 |
| --- | --- |
| `Dropdown` | 下拉菜单：`alignment`/`position`（up/down/**auto** 翻转）/`dark`；点击外部关闭、`disabled` 项 |
| `Tooltip` | `placement`/`align`/`theme`；支持 touch 切换 |
| `AppDialog` | 模态（`Teleport to body`）：`size` sm/md，遮罩与 `Esc` 关闭，title/footer 插槽 |
| `SegmentSwitch` | 分段切换（灰底、选中白底阴影） |
| `LazyImg` / `CoverImage` | 懒加载淡入图 / 方形封面（`pt-[100%]`） |
| `PageHeader` | 标题 + 副标题 + `extra` 插槽 |
| `AsyncFade` | 异步内容淡入容器 |

> 基础按钮使用 `components/common/AppButton.vue` 统一变体、尺寸、焦点和禁用态；筛选/分段、开关、列表行和播放器沉浸控制等特殊控件保留专用实现。输入框仍按页面内联规范维护。

---

## 11. 交互与可用性

- **快捷键**：`Space` 播放/暂停（输入框内不响应）、`↑/↓` 音量、`Ctrl/Cmd+K` 搜索、弹层 `Esc` 关闭。
- **响应式**：移动优先，断点 `sm/md/lg/xl`；移动端播放条左右滑动切歌、全屏下滑关闭。
- **反馈**：所有异步有 loading 态（`LucideLoader2 animate-spin` + 文案）；成功/失败用 vue-sonner toast；收藏/歌单乐观更新。
- **404**：API 404 → `NotFoundError` → 重定向 `/404`，经 `errorMessage` 查询参数展示。

---

## 12. 认证与用户体系

基于 better-auth：`createAuthClient({ baseURL: userApiBase })` + `useSession()`。`AuthDialog` 处理登录/注册；需登录操作走 `auth.requireLogin()` 守卫。登录态变化时 `App.vue` 拉取/清空收藏。`user/` 组件负责用户信息、头像与通知中心（`NotificationBell`/`Dialog`/`Panel`，未读数、已读/删除、批量已读）。

---

## 13. 工程化与构建

- **Vite**：别名 `@ → src`；代码分割 `vendor`（echarts 外 node_modules）+ `pages`（views 除 Statistics）。
- **插件**：`vue()`、`UnoCSS()`（`uno.config.ts` 配置 `presetWind4`）、`AutoImport`（vue/vue-router/pinia）、`Components`（自动解析组件 + 透传 `Lucide*`/`OverlayScrollbarsComponent`）、`buildInfo()`（注入 `__BUILD_TIME__`）、`injectHead()`（构建时注入 base64 到 `<head>`）。
- **约定**：`ref`/`computed`/`watch`/`useRoute`/`storeToRefs` 等由 auto-import 自动引入，无需手写 import；`auto-imports.d.ts`/`components.d.ts` 勿手改。
- **脚本**：`dev`/`build`（`vue-tsc -b && vite build`）/`preview`/`lint`/`lintf`；包管理器 **pnpm**。

---

## 14. 一致性约定（开发注意）

1. 新查询一律进 `composables/queries.ts`；纯函数放 `utils/`。
2. 全局共享的查询结果用 `watch(..., { immediate: true })` 反填 Pinia。
3. 样式优先 UnoCSS 工具类；定制滚动条/过渡放 `assets/style.css`。
4. 图标用 `Lucide*`，品牌图标放 `components/icon`。
5. 所有交互反馈经 toast；所有异步有 loading 态。
6. 播放/歌词 UI 挂在 `App.vue` 全局层，路由切换不影响播放器。
7. 遵循 @antfu/eslint-config（提交前跑 `pnpm lintf`），类型导入用 `import type`。
