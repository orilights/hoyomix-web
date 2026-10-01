# HOYO-MiX Online 视觉与样式设计规范

> 版本：0.4.0 ｜ 适用范围：`hoyomix-web` ｜ 配套：`docs/frontend-design-spec.md`（总览，第 10 章为本规范的摘要）
>
> 本规范是对项目视觉与样式设计的**专项、完整**说明，从设计原则、色彩、排版、间距栅格、圆角阴影、动效、玻璃拟态与背景体系、图标、控件样式、滚动条、空/载/错状态到工程实现约定，逐项给出明确取值与用法。

---

## 1. 设计原则与整体基调

本项目采用**「亮暗玻璃拟态 + 主题化背景」**的视觉体系，当前浅色外观为亮色模式。

### 主题模式

- 支持跟随系统、亮色模式、暗色模式，首次使用默认跟随系统；选择保存在本地。
- 设置页「外观」分区提供三档单选；导航栏使用显示当前模式的图标按钮，按跟随系统 → 亮色 → 暗色循环切换。
- 暗色通过根元素 `dark` class 与 UnoCSS `dark:` 样式实现。全局变量 `--theme-page`、`--theme-text`、`--theme-surface`、`--theme-overlay` 提供页面、文字、暗色面板与背景遮罩颜色。
- 亮色保持现有配色；暗色页面底色为 `#111827`、主文字为 `#f3f4f6`、面板为 `#1f2937`，封面模糊背景叠加 85% 深色遮罩；保留透明度、玻璃质感和蓝色强调色。
- 内容区、表单、浮层、通知、评论及滚动条均适配主题；统计图表及消息提示响应实际生效主题。播放条、播放队列和全屏播放器继续使用专属深色配色。

1. **玻璃拟态（Glassmorphism）为主**：固定背景图片柔化后，亮色叠加白色半透明层，暗色叠加深色半透明层；卡片、侧栏和弹层保留各自的玻璃质感。
2. **中性灰阶为骨架，蓝色为唯一强调色**：文字/边框/卡片以灰色阶（slate/gray）为主，强调、选中、主操作统一使用蓝色系，避免多色争抢。
3. **背景即主题**：每页通过专辑封面设置背景，使整站色彩随浏览内容动态变化；播放器区域（深色）与内容区（浅色）形成明暗对比。
4. **圆润、轻盈、克制**：大面积圆角（`rounded-xl/2xl`）、低饱和半透明悬浮态、短而不炫的过渡动画。
5. **动效服务于状态反馈**：所有过渡均为短暂的淡入/位移（0.15s–0.5s），用于表达「出现、切换、选中、悬停」，不喧宾夺主。

---

## 2. 色彩体系

### 2.1 中性色（骨架）

文字与表面大量使用灰色阶，按层级拆分：

| 用途 | 取值 | 示例位置 |
| --- | --- | --- |
| 主要文字（浅色区） | `gray-900` / `text-foreground` | 标题、正文 |
| 次要文字 | `gray-500` / `text-gray-500` | 副标题、日期、说明 |
| 弱化文字/占位 | `gray-400` | 占位符、时间戳 |
| 强调标题 | `text-gray-900 font-bold` | `PageHeader`、首页区块标题 |
| 卡片/表面（浅色区） | `bg-black/5` hover `bg-black/10` | 卡片、统计块、设置面板 |
| 悬浮态（浅色区） | `bg-gray-500/20` hover | 卡片/列表行 hover |
| 边框 | `border-gray-100` / `border-gray-200` / `border-gray-300` | 弹窗、输入框、卡片分割 |
| 分割线 | `border-t border-gray-100` `border-black/5` | 弹窗标题下、表格行 |

> 深色区中性色见 §2.4。

### 2.2 强调色（唯一主色）

| 语义 | 取值 | 用途 |
| --- | --- | --- |
| 主按钮填充 | `bg-blue-500/90`、hover `bg-blue-600` | 播放、发送、保存 |
| 选中态文字/图标 | `text-blue-400` `text-blue-500` | 激活 tab、播放列表图标 |
| 选中态边框 | `border-blue-500` | 设置卡片选中 |
| 分段高亮 | `bg-blue-500/90 text-white` | 搜索筛选、版本筛选 |
| 头像填充 | `bg-blue-500` | 无头像用户首字母 |
| 输入聚焦环 | `focus:ring-blue-400` | 输入框/文本框 |
| 链接 | `text-blue-500 hover:text-blue-600` | 「查看全部」「查看统计」 |

### 2.3 功能/状态色

| 色 | 语义 | 取值 | 用途 |
| --- | --- | --- | --- |
| 红 | 错误/危险/重要提示 | `red-400/500`、`bg-red-50`、`text-red-700` | 错误文案、退出登录、搜索高亮 `#ef4444`、须知边框、构建标签 |
| 琥珀 | 无损/Warning | `amber-400` | 无损音质徽标 |
| 黄 | 审核中 | `bg-yellow-400/80 text-white` | 歌单「审核中」徽标 |
| 绿 | 成功/全球 | `green-700`、`text-green-700` | 版本徽标、媒体源「全球」 |
| 紫 | 海外 | `purple-100/700` | 媒体源「海外」徽标 |
| 蓝 | 全球区/主色 | `blue-100/700` | 媒体源「全球」徽标 |

### 2.4 深色区调色（播放器体系）

播放条与全屏播放器使用深色表面 + 半透明白文字：

| 用途 | 取值 |
| --- | --- |
| 播放条底 | `bg-gray-900/95`（全屏时 `bg-gray-900/20`）后加 `backdrop-blur-xl` |
| 表面叠加（深色区） | `bg-white/10`、hover `bg-white/20` |
| 深色面板 | `bg-gray-800`（音量弹层）、`bg-black/70`（进度提示） |
| 主文字 | `text-white` |
| 次要文字 | `text-white/50`、`text-white/60`、`text-white/70` |
| 弱化文字 | `text-white/40`、`text-white/30` |
| 歌词当前行 | `text-white font-bold`（+4px）；其他行 `text-white/40` |
| 半透明图标按钮 | `text-white/60 hover:text-white hover:bg-white/10` |
| 图标按钮底 | `bg-black/40 hover:bg-black/60`（封面悬浮操作） |
| 进度条 | 缓冲 `bg-white/10`、已播放 `bg-white/80`、底轨 `bg-white/10` |

> 规则：**深色区一律用「白色带不透明度」表达文字层级，绝不使用灰色系文字**，保证在渐变背景上的可读性与对比度。

### 2.5 品牌/平台色

| 对象 | 色值 | 说明 |
| --- | --- | --- |
| 网易云音乐 | `#fc3b5b`（`IconNcm`） | 平台图标主色 |
| QQ 音乐 | 官方蓝（`IconQQ`） | 平台图标主色 |
| HOYO-MiX 主标识 | 见 `assets/image/HOYO-MiX_logo.png` | 品牌 Logo（资源引用） |

### 2.6 半透明悬浮体系（最重要的形态语言）

项目大量使用「半透明灰色 + hover 加深」，形成统一可点击面：

```
基础面    bg-black/5              hover → bg-black/10
图标面    bg-gray-500/10          hover → bg-gray-500/20
卡片悬浮  hover:bg-gray-500/20
主按钮    bg-blue-500/90          hover → bg-blue-600
深色图标  bg-white/10             hover → bg-white/20 / bg-white/10
行悬浮    hover:bg-black/8（表格） hover:bg-gray-500/20（列表）
```

> 所有可点击元素约定：`cursor-pointer transition-colors (+ hover/active 反馈)`。

---

## 3. 排版（Typography）

基于系统字体栈（项目未引入自定义字体，Tailwind v4 默认栈），通过字号与字重表达层级。

### 3.1 字号速查

| 层级 | 写法 | 用途 |
| --- | --- | --- |
| 超大（404/年份） | `text-8xl` / `text-4xl` | 404 数字、年份分组标题 |
| 页面大标题 | `text-2xl md:text-3xl font-bold` | `PageHeader` 标题 |
| 区块标题 | `text-2xl font-bold` | 首页「最新专辑」等 |
| 子标题卡片首行 | `text-lg font-bold` | 设置分组标题 |
| 正文/卡片标题 | `text-sm / text-base` | 歌曲名、专辑名 |
| 次要/说明 | `text-sm`、`text-xs` | 日期、时长、描述 |
| 徽标/角标 | `text-xs` | 标签、状态徽标 |
| 提示/键盘 | `text-xs text-gray-400` | Tooltip、`kbd` 快捷键 |
| 代码/日志 | `font-mono`（`text-sm`） | 变更日志、调试请求、Body |

### 3.2 字重

- `font-bold`：标题、当前歌词行、主信息。
- `font-semibold`：卡片主标题、设置内导航文案。
- `font-medium`：次要标题、按钮文字（`font-medium`）。
- 默认（400）：正文。
- 歌词当前行使用 `font-bold` + 放大 4px 双重强调（见 §9.5）。

### 3.3 行高与截断约定

- 卡片标题两行内后方可截断：`line-clamp-2` + 固定高度 `h-[42px]`（专辑/歌单卡片统一）。
- 单行截断：`truncate`，配合 `title` 属性悬浮显示全名。
- 数据卡片数词用 `text-2xl/md:text-3xl font-bold`。

---

## 4. 间距、布局与栅格

### 4.1 页面级布局

- **主内容容器**：固定在顶栏（56px）与播放条（72px）之间，桌面左侧让位 240px；自身透明，路由页面仅在容器的 OverlayScrollbars 中滚动。内层使用 `px-4 md:px-16 xl:px-8 pt-6 pb-7`。
- **响应式水平留白**：`4 → 16 → 8`（对应移动 → 平板 → 桌面）；≥1280px 时侧栏占左侧 240px，顶栏与主内容对齐。
- **桌面侧栏**：始终展开，`bg-slate-50/80 backdrop-blur-2xl`，右侧浅色边框；顶部品牌、底部设置与反馈固定，中部独立滚动。导航行最小高 40px、圆角 10px，选中态蓝字浅蓝底；歌单封面 32px，名称单行省略。全屏播放时保留渲染，由更高层级的播放器自然覆盖，并通过 `inert` 禁用交互；展开和收起动画期间不提前隐藏底层画面。

### 4.2 间距刻度

项目遵循 Tailwind 8px 基准缩放，常见用量：

| 场景 | 取值 |
| --- | --- |
| 区块间距 | `mt-3 / mt-4`（16px）为主，`mt-6` 少量 |
| 元素间距 | `gap-2`（8px）、`gap-3`（12px）、`gap-4`（16px） |
| 卡片内边距 | `p-3`、`p-4` |
| 列表行内边距 | `px-4 py-2`、`p-2 md:px-4` |
| 分组标题下 | `mb-2`、`mb-3` |

### 4.3 栅格

- 卡片网格（专辑）采用**动态列数**：`gridTemplateColumns: repeat(floor(容器宽/200), 1fr)`，最小 2 列——内容自适应而非固定断点列数。
- 快速卡片/统计块：`grid grid-cols-2 md:grid-cols-3/4`。
- 图表区：`grid-cols-1 md:grid-cols-2`。
- 封面比例统一 `aspect-square` / `pt-[100%]`。

### 4.4 断点约定

| 断点 | 触发宽度 | 典型用途 |
| --- | --- | --- |
| `md` | 768px | 分栏（2→3/4 列）、显示桌面控制/文案、去圆弧 |
| `lg` | 1024px | 专辑页两栏（侧栏→`lg:w-[400px]` + 内容自适应） |
| `xl` | 1280px | 显示固定侧栏，内容水平留白 32px |

> 移动端常用 `lg:hidden` 显示移动端 tab 栏，`hidden md:flex` 显示桌面操作。

---

## 5. 圆角与边框

### 5.1 圆角规范

| 场景 | 取值 |
| --- | --- |
| 大型容器/卡片 | `rounded-2xl` |
| 常规卡片/面板/封面容器 | `rounded-xl` / `rounded-lg` |
| 小控件/制表/徽标 | `rounded-lg` / `rounded` |
| 胶囊（完全圆形） | `rounded-full`（头像、图标按钮、播放悬浮钮） |
| 封面内图形 | `rounded-lg`/`rounded-2xl`（封面本身直角，外层容器裁圆角） |

> 封面统一通过**外层容器圆角 + `overflow-hidden`** 呈现圆角，图片本身保持 `object-cover` 直角。

### 5.2 边框

- 浅色分隔：`border-gray-100/200`；输入类 `border-gray-300`。
- 选中态：`border-blue-500`。
- 竖排分割线：`border-b border-gray-100`（弹窗、用户下拉）。
- 无边框卡片：`bg-black/5 rounded-xl`（统计块、面板），避免过度描边。

---

## 6. 阴影与层级（z-index）

### 6.1 阴影

| 层级 | 取值 | 用途 |
| --- | --- | --- |
| 卡片浮起 | `shadow` / `shadow-md` | 产品头像、圆角封面、SegmentSwitch 选中项 `shadow-sm` |
| 浮层/下拉 | `shadow-xl`、`shadow-2xl` | 播放条音量弹层、搜索面板、弹窗、用户下拉 |
| 封面悬浮操作钮 | `shadow-lg` | 专辑/歌单悬浮播放/删除按钮 |

### 6.2 z-index 分层（全站统一）

| 值 | 元素 |
| --- | --- |
| `z-10` | 顶栏 Header、桌面侧栏、全屏内容层 |
| `z-50` | 全屏播放器、用户下拉 |
| `z-60` | 播放条（固定底部） |
| `z-100` | Tooltip |
| `z-999` | 搜索弹窗、Dropdown 菜单 |
| `z-[1000]` | AppDialog 模态 |

> 遵循**后层覆盖前层**原则：Tooltip < 弹层 < 弹窗。播放条 120（`z-60`）固定于底部。

---

## 7. 动效与过渡

### 7.1 时长与缓动速查

| 过渡 | 时长 | 缓动 | 触发 |
| --- | --- | --- | --- |
| 页面切换 `page-fade` | 0.3s | ease | 路由 out-in 淡入 |
| 通用淡入 `fade` | 0.3s | ease | 内容显隐 |
| 弹窗 `dialog-fade` | 0.2s | ease | 模态显隐 |
| 搜索面板 `search-fade` | 0.2s | ease | 搜索显隐 |
| 下拉 `dropdown` | 0.2s | ease | 菜单展开（含位移） |
| Tooltip `tooltip` | 0.15s | ease | 提示显隐 |
| 用户下拉 `dropdown-fade` | 0.15s | ease | 用户菜单（-4px 位移） |
| 全屏播放器 | 0.4s | ease | 上下滑入/收起（100% 位移） |
| 背景图切换 | 500ms | ease | 双图 crossfade |
| 进度条宽度 | 300ms | ease | 缓冲/进度更新 |
| 歌词行高亮 | 300ms | ease | 当前行显隐/字号 |
| 封面淡入 | 300ms | ease | 图片加载完成 |

> 约定：**入场淡入不设离场过度**（多数只定义 `*-enter-from`），避免离开时闪烁；用 `Transition name="..."` + `TransitionGroup`/`<Transition>` 统一包装。

### 7.2 微交互（Hover/Active 反馈）

| 元素 | 反馈 |
| --- | --- |
| 圆形图标按钮 | `hover:bg-gray-500/20` / `hover:bg-white/10`（深色区） |
| 悬浮操作钮 | `hover:scale-105 active:scale-95`（播放/删除悬浮按钮） |
| 卡片 | `hover:bg-gray-500/20` |
| 封面悬浮播放钮 | `opacity-0 group-hover:opacity-100` 浮现 |
| 表格操作列 | `opacity-0 group-hover:opacity-100` 浮现 |
| 按钮按下 | `active:scale-95` |

---

## 8. 玻璃拟态、模糊与背景体系

### 8.1 模糊（blur）层级

| 层 | 写法 | 说明 |
| --- | --- | --- |
| 页面总背景 | 背景图 `blur-md` + 全屏 `bg-white/80` | 白色叠层统一覆盖背景图 |
| 顶栏与主内容 | 透明 | 直接显示统一背景 |
| 播放条/弹层 | `backdrop-blur-xl` | 深色玻璃 |
| 背景图自身 | `blur-md` | 柔和化动态背景 |
| 模态遮罩 | `backdrop-blur-sm` | 搜索/弹窗遮罩 |

### 8.2 背景图层体系（`BackgroundLayer`）

- 全站一个固定背景层，`background-size: cover` + `blur-md`，`pointer-events-none`。
- 背景图片之上固定一层 `bg-white/80`；顶栏和主内容容器不再单独设置背景色或背景模糊。
- **双图层交叉淡入（crossfade）**：`background1`/`background2` 交替承载新旧背景，先 `preloadImage` 完成后才切换 `opacity`（500ms），杜绝切图闪烁。
- 背景由各页面在 `onMounted` 设置 `store.setBackground(url)`；无内容页（首页/设置/404）调用 `setBackground()` 清空。
- 专辑/产品页背景 = 封面 128px（`getCoverUrl(platforms,'128px')`）。

### 8.3 全屏播放器动态渐变背景（`utils/cover.ts`）

从当前封面像素提取**主导色（dominant color）** 生成 `linear-gradient(180deg, top, bottom)`，使播放器背景随歌曲封面同步换色。流程：

1. `Image.decode()` → `canvas.drawImage` → `getImageData`。
2. **Median-Cut 颜色量化**：15-bit RGB 直方图 + 最小体积优先切分，产出代表色 Swatch。
3. **HSL 过滤**：剔除近黑（L≤10%）与近白（L≥85% 且 S≤10%）。
4. `computeGradientColors`：按亮度区间（暗/中/亮）调整明度与饱和度，产出顶/底两色。

### 8.4 遮罩

- 全屏播放器暗角：`.background-mask { background: rgba(0,0,0,0.25) }` 增强文字对比。
- 视频标签卡左→右暗化：`bg-gradient-to-r from-black/70 via-black/60 to-black/40`，其上叠白色文字与半透明源按钮（`bg-white/15 hover:bg-white/30`）。
- 歌单封面角标用 `bg-black/40 text-white` 反白文字。

---

## 9. 图标体系

### 9.1 通用图标（Lucide）

- 全部图标以 `Lucide*` 组件在模板中使用，由 `unplugin-vue-components` 自动映射到 `@lucide/vue`（`name.slice(6)`）。
- 常见尺寸：`size-4`（16）、`size-4.5`（18）、`size-5`（20）、`size-6`（24）、`size-8`（32）。
- 实心播放类图标用 `fill="currentColor"`（`Play`、`SkipBack`、`Pause` stroke-width 0.5 等）。

### 9.2 品牌图标（`components/icon/`）

- 平台专属 SVG 图标（`IconNcm`、`IconQQ`、`IconGitHub`）作为单文件组件，保留官方色调。
- 配合 `MusicActions` 平台跳转下拉使用，点击态 `bg-gray-500/10 hover:bg-gray-500/20`。

### 9.3 图片图标

- 产品 icon：`getProductIconUrl(productName[, size])` → 圆形 `rounded-full`（首页/产品页头像）。
- 来源小图标：米游社 `/images/icon/mys.png`、Bilibili `/images/icon/bilibili.png`（视频标签）。

---

## 10. 控件与组件样式规范

### 10.1 按钮（通过 `AppButton` 统一）

常规圆角文字按钮和图标按钮统一使用 `components/common/AppButton.vue`。组件负责基础布局、尺寸、圆角、悬浮、键盘聚焦和禁用态；调用处仅保留布局、响应式和业务状态所需的类。

公共参数：

- `variant`: `primary`、`secondary`、`danger`、`outline`、`ghost`、`dark`
- `size`: `xs`、`sm`、`md`、`lg`
- `icon-only`: 图标按钮使用等距内边距
- `shape`: `rounded`（默认）或 `pill`
- `type`: 默认 `button`，表单提交必须显式传 `submit`

**主按钮（primary）**
```
text-sm bg-blue-500/90 text-white px-4 py-2 rounded-lg
hover:bg-blue-600 transition-colors cursor-pointer
可加图标：flex items-center gap-1/2
+ loading 态：<LucideLoader2 class="size-4 animate-spin" /> + disabled:opacity-50
```

**次级按钮（secondary）**
```
text-sm bg-gray-500/10 px-3 py-2 rounded-lg hover:bg-gray-500/20 transition-colors cursor-pointer
```

**图标按钮（圆形）**
```
text-sm bg-gray-500/10 p-2 rounded-full hover:bg-gray-500/20 transition-colors cursor-pointer
```

**危险按钮**
```
text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg hover:bg-red-100 ...
```

**禁用态**：`disabled:opacity-50 cursor-not-allowed` + `opacity-50 cursor-not-allowed`（工具态）。

筛选/分段切换、开关、列表整行选择、封面悬浮操作、播放器主播放键、全屏沉浸控制和歌词浮动控制等交互差异明显的控件保留专用实现，不强行套用 `AppButton`。

### 10.2 筛选/分段切换

- 全局 `SegmentSwitch`：灰底胶囊容器 `bg-gray-100 rounded-xl p-1`，选中项 `bg-white shadow-sm text-gray-900`，未选 `text-gray-500 hover:text-gray-700`。
- 页面内筛选按钮组（版本/年份/搜索类型）：选中 `bg-blue-500/90 text-white`，未选 `bg-black/5 hover:bg-black/10`。

### 10.3 开关（Toggle Switch）

设置页 AudioContext 开关：
```
容器 h-6 w-11 rounded-full border-2
开启 bg-blue-500 / 关闭 bg-gray-300
滑块 size-5 rounded-full bg-white shadow translate-x-5 / translate-x-0
(transition-colors 200ms / transition-transform 200ms)
```

### 10.4 输入框 / 文本框

```
w-full px-3 py-2 rounded-lg border border-gray-300
text-sm focus:outline-none focus:ring-2 focus:ring-blue-400
textarea 加 resize-y；调试 Body 用 font-mono
```

### 10.5 标签 / 徽标（Badge）

通用样式：`px-2 py-0.5 rounded text-xs`，底色：
- 平台/信息标签：`bg-black/5`（浅色区）
- 状态徽标：`bg-black/40 text-white`（封面浮层）、`bg-yellow-400/80`、`bg-red-500/80`（审核状态）
- 媒体源区域徽标（`mediaSourceRegionOptions`）：中国 `bg-green-100 text-green-700`、海外 `bg-purple-100 text-purple-700`、全球 `bg-blue-100 text-blue-700`
- 音质按钮：无损 `text-amber-400 border-amber-400/50 hover:bg-amber-400/10`、其余 `text-white/60 border-white/30`

### 10.6 Tooltip / Dropdown 视觉

- **Tooltip**：默认深色 `bg-gray-800 text-white text-xs px-2 py-1 rounded-md shadow`，`whitespace-nowrap`；另有浅色 `bg-white text-gray-800`。
- **Dropdown 菜单**：`absolute rounded-lg shadow text-sm`；浅色 `bg-white` + `hover:bg-gray-500/10`，深色 `bg-gray-800 text-white` + `hover:bg-white/10`；`disabled` 项灰化 `text-gray-400/30`。支持 `up/down/auto` 翻转与 `left/center/right` 对齐。

### 10.7 头像

- 无头像回退：`bg-blue-500` 圆形容器 + 白色首字母。
- 顶栏头像：`size-8 rounded-full`，hover `ring-2 ring-blue-400`。
- 用户下拉：`size-10 rounded-full`。

---

## 11. 滚动条规范（OverlayScrollbars）

`main.ts` 注册 `ClickScrollPlugin`，主内容区使用 `os-theme-custom`，弹层打开时锁定主内容区滚动。

| 主题 | 手柄色 | 适用 |
| --- | --- | --- |
| `os-theme-custom` | `rgb(0 0 0 / 0.25)` hover 0.4 active 0.5 | 浅色背景内容区 |
| `os-theme-custom-light` | `rgb(255 255 255 / 0.25)` … | 深色背景 |

统一参数：`--os-size: 10px`、内边距 2px、圆角 10px。滚动策略常配 `autoHide: 'leave'` / `'move'` + `clickScroll: true`。

`os-theme-custom` 与原生滚动条共享 `--theme-scrollbar`、`--theme-scrollbar-hover`、`--theme-scrollbar-active`：亮色使用 25%/40%/50% 黑色，暗色使用相同透明度的白色，轨道透明。主页横向列表也使用此主题；设置分类、搜索、通知和弹窗中的原生滚动区域统一使用圆角手柄。播放器专属 `os-theme-custom-light` 与歌词隐藏滚动条保持独立。

> 歌词容器例外：隐藏滚动条（`.scrollbar-hide` 的 `-webkit-scrollbar/scrollbar-width:none`），并用 `mask-image` 渐变上下淡出。

---

## 12. 空 / 载 / 错状态规范

| 状态 | 文案 | 样式 |
| --- | --- | --- |
| 加载中 | 「加载中...」/「搜索中...」 | `<LucideLoader2 class="size-5 animate-spin mr-2" />` + `text-gray-400`，居中 `py-20` |
| 空态 | 「暂无歌词」「未找到相关结果」「暂无可用节点」 | `text-gray-400` / `text-white/50`（歌词） |
| 错误 | 「加载失败，请刷新重试」 | `text-red-400` |
| 404 | `404` + `errorMessage` + 返回首页 | `text-8xl text-gray-300`、`text-gray-500` 文案、`bg-black/10` 按钮 |
| toast | vue-sonner `rich-colors`（top-center） | 全局 `Toaster position="top-center"` |

- 页面级异步统一 `AsyncFade` 容器包裹，等待数据就绪后淡入内容。
- 表格/林林总总数据块缺失时显示对应空态而非空白。

---

## 13. 图片与封面规范

- **`CoverImage`**：方形封面组件——`pt-[100%]` 撑起 1:1 容器 + `object-cover` + 加载后 300ms 淡入，占位 `bg-gray-200`。
- **`LazyImg`**：任意比例懒加载图，`loading="lazy"` + 占位灰底 + 淡入。
- 封面取径：`getCoverUrl(platforms, size)`，`size ∈ {96,128,256,512,800}`，ncm 优先、qq 回退；不同场景用不同规格（列表 128 / 卡片 256 / 详情 800）。
- `referrerpolicy="no-referrer"` 用于跨域封面的第三方图片（视频标签封面），避免防盗链。

---

## 14. 易用性 / 对比度 / 无障碍

1. **深色区文字全部用「白色 + 不透明度」**（`text-white/40~80`），保证在动态背景上始终可读；必要时叠加暗化遮罩（`rgba(0,0,0,0.25)`）。
2. **可交互元素统一 `cursor-pointer`**；禁用态 `cursor-not-allowed` + 视觉灰化。
3. 图标按钮提供 `Tooltip`/`title` 说明（播放、音质、播放列表等）。
4. 开关组件使用 `role="switch"` + `:aria-checked`。
5. `kbd`（`Ctrl+K`、`ESC`）提示键盘操作。
6. 文本省略时均以 `title` 悬浮展示全称。
7. 点击热区：进度条 thin 模式用伪元素扩展命中区（`::before { top/bottom:-12px }`）。

---

## 15. 实现约定（UnoCSS wind4 + 手写 CSS）

1. **样式首选 UnoCSS 工具类**；`uno.config.ts` 仅配置 `presetWind4()`，不维护自定义 config，跨项目直接用默认调色板 + 任意值（`size-4.5`、`w-[240px]`、`pt-[100px]`）。
2. **手写 CSS 仅用于**：全局过渡类（`style.css`）、OverlayScrollbars 主题、歌词 `mask-image`/隐藏滚动条、竖排音量滑块（`writing-mode: vertical-lr`）、动画类（`animate-spin` 由 UnoCSS 提供）。
3. **局部过渡动画**：写在组件 `<style scoped>` 内，配合 Vue `<Transition>`。
4. **深色区组件（播放器）**：`.volume-slider`、`.dropdown-*`、`.os-theme-custom-light` 等规则集中在对应组件。
5. 全站统一「玻璃拟态 + 半透明悬浮 + 蓝色强调」三原则，新增页面/组件优先复用既有取值，不做风格漂移。

---

## 附：视觉取值速查表

| 类别 | 推荐值 |
| --- | --- |
| 主强调色 | `blue-500`（`/90` 填充、`/10` 高亮） |
| 浅色面 | `bg-black/5` → hover `bg-black/10` |
| 深色面 | `bg-gray-900/95` + `backdrop-blur-xl` |
| 玻璃 | 全屏背景叠层 `bg-white/80`；侧栏和弹层使用各自的半透明背景与模糊 |
| 卡片圆角 | `rounded-xl` / `rounded-2xl` |
| 胶囊 | `rounded-full` |
| 页面留白 | `px-4 → md:px-16 → xl:px-8`、`pt-6 pb-7` |
| 卡片标题高 | `h-[42px]` + `line-clamp-2` |
| 过渡默认 | `0.3s ease`（状态切换 0.15–0.2s） |
| 背景切换 | 500ms crossfade |
| 封面比例 | 1:1（`aspect-square` / `pt-[100%]`） |
| 滚动条 | `os-theme-custom`（浅区）/ `os-theme-custom-light`（深区） |
| 加载态 | `LucideLoader2 animate-spin` + `text-gray-400` |
| 主按钮 | `bg-blue-500/90 text-white rounded-lg hover:bg-blue-600` |
