# HOYO-MiX Online 项目指南

HOYO-MiX Online 是一个展示 HOYO-MiX（米哈游旗下音乐团队）专辑与歌曲信息的 Web 应用，支持在线播放。

## 技术栈

- **框架**: Vite + Vue 3.5 + TypeScript 5.8（严格模式，启用 `noUnusedLocals`、`noUnusedParameters`）
- **路由**: Vue Router 4（路由组件全部懒加载）
- **状态管理**: Pinia 3 + pinia-plugin-persistedstate（播放器状态持久化到 localStorage）
- **样式**: Tailwind CSS 4（通过 `@tailwindcss/vite` 集成，无独立配置文件）
- **工具库**: @vueuse/core、vuedraggable（播放列表拖拽排序）
- **图标**: Lucide Vue Next（通过 unplugin-vue-components 自动注册，直接以 `<Lucide*>` 使用）
- **代码规范**: @antfu/eslint-config（默认配置，单引号、无分号）

## 构建命令

```bash
pnpm dev        # 开发服务器
pnpm build      # vue-tsc 类型检查 + vite 构建
pnpm preview    # 预览生产构建
pnpm lint       # ESLint 检查
pnpm lintf      # ESLint 自动修复
```

无测试框架。

## 项目结构

```
src/
├── api/          # fetch 封装，从静态 JSON API 获取数据
├── assets/       # 样式（tailwind.css）和图片资源
├── components/   # 可复用组件
│   ├── common/   # 通用组件（Dropdown、Tooltip）
│   ├── icon/     # SVG 图标组件（IconNcm、IconQQ）
│   └── player/   # 播放器组件（Bar、Fullscreen、Lyrics、Playlist、Progress、Spectrum）
├── constants/    # 常量（环境变量、productMap、artistTypeSort）
├── layout/       # DefaultLayout：导航栏 + 双层背景图过渡 + 内容区
├── router/       # 路由配置
├── store/        # Pinia store（main + player 两个 store）
├── types/        # 类型定义（export.ts 导出格式、player.ts 播放器、netease.ts 平台）
├── utils/        # 工具函数（misc.ts、time.ts、player.ts、player-utils.ts）
├── views/        # 页面视图（Home、Album、Music、Product、Artist、Settings）
plugins/          # Vite 自定义插件（buildInfo 构建时间注入到 HTML）
```

## 编码约定

- 组件使用 `<script setup lang="ts">` + Composition API
- 路径别名 `@` 指向 `src/`
- Vue/Vue Router/Pinia 的 API 已自动导入（`ref`、`computed`、`useRoute` 等），无需手动 import
- 组件和 Lucide 图标已自动注册，使用时直接引用即可
- 响应式布局使用 Tailwind 断点（`md:`、`xl:`）
- 图片统一使用 `loading="lazy"` 懒加载
- 组件内使用 `storeToRefs()` 解构 store 状态以保持响应性
- 工具函数统一从 `@/utils` 导入（barrel export）
- 新增页面路由在 `src/router/routes.ts` 中注册，使用 `() => import()` 懒加载
- SVG 图标组件放在 `src/components/icon/`，使用 `currentColor` 继承颜色
- 注释使用中文、保持简洁，仅关键与复杂逻辑需要注释，不要在 template 中添加任何注释

## Store 架构

两个 Pinia store：

- **`useStore()`**（`src/store/index.ts`）：全局状态——`albumList`、`backgroundUrl`、`pageLoading`、`pageLoadKey`
- **`usePlayerStore()`**（`src/store/player.ts`）：播放器状态——播放列表、当前曲目、播放模式（`sequential` / `loop` / `single` / `shuffle`）、音量、音质（`sq` FLAC / `hq` MP3）、频谱开关等；持久化字段：`playlist`、`currentIndex`、`playMode`、`volume`、`quality`、`showSpectrum`

## 播放器模块

底层音频引擎（`src/utils/player.ts` 的 `AudioPlayer` 类）基于 HTMLAudioElement + AudioContext，支持：
- 主备 URL 自动降级
- 事件驱动（play/pause/ended/timeupdate/error/bufferupdate/loading/canplay/durationchange）
- 频谱数据获取（`getFrequencyData()`，用于可视化）
- 通过 `getAudioPlayer()` 获取全局单例

辅助函数在 `src/utils/player-utils.ts`：`getSongUrl()`、`buildPlaylistItem()`、`buildPlaylistFromAlbum()`

UI 由 6 个组件组成（`src/components/player/`），在 `DefaultLayout` 底部渲染；`App.vue` 的 `onMounted` 中调用 `playerStore.initPlayer()` 初始化。

## API 与数据

- API 基于静态 JSON 文件（`VITE_API_BASE`）
- 资源地址通过 `VITE_RESOURCE_BASE` 配置，`VITE_RESOURCE_BASE_BACKUP` 可选备用
- 反馈页面通过 `VITE_FEEDBACK_URL` 配置
- 核心数据类型：`src/types/export.ts`（前端展示结构，含 `ExportPlatforms`）、`src/types/player.ts`（`PlaylistItem`、`PlayMode`、`AudioQuality`）
- 支持网易云音乐和 QQ 音乐两个平台的链接跳转

## 关键模式

- **背景图切换**: 通过 store 的 `backgroundUrl` + CSS 变量 `--background-image` + 双层 opacity 渐变实现平滑切换
- **封面 URL**: `getCoverUrl()` 根据平台（ncm/qq）生成封面地址，支持指定尺寸
- **产品映射**: `productMap` 将产品代码映射为中文名称（如 `genshin` → `原神`）
- **加载状态**: `pageLoading` + `pageLoadKey` 配合防止竞态（仅当 key 匹配时才清除 loading）
- **布局**: `DefaultLayout` 提供固定头部（毛玻璃效果）+ 两层背景图过渡 + 内容区白色半透明卡片 + 底部播放器
