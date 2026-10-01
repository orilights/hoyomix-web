<script setup lang="ts">
import type { AudioQuality, FullscreenCoverShape, LyricsSource, MobileFullscreenLayout, SongListPlayBehavior } from '@/types/player'
import { formatDate } from '@vueuse/core'
import { toast } from 'vue-sonner'
import { useChangelogQuery } from '@/composables/queries'
import { usePageScroll } from '@/composables/usePageScroll'
import { usePageSeo } from '@/composables/usePageSeo'
import { apiBase, appDescription, appVersion, audioQualityOptions, getQualityName, mediaSourceRegionOptions } from '@/constants'
import { useAuthStore } from '@/store/auth'
import { useMainStore } from '@/store/main'
import { useMediaSourceStore } from '@/store/media-source'
import { usePlayerStore } from '@/store/player'
import { fetchJsonMutation } from '@/utils/fetch'

const store = useMainStore()
const player = usePlayerStore()
const auth = useAuthStore()
const mediaSource = useMediaSourceStore()
const { quality, enableAudioContext, enableMediaSession, lyricsSource, songListPlayBehavior, mobileFullscreenLayout, fullscreenCoverShape, fullscreenCoverRotation, fullscreenCoverBorder, immersiveModeEnabled } = storeToRefs(player)
const { user, isLoggedIn } = storeToRefs(auth)

const songListPlayOptions: { value: SongListPlayBehavior, label: string }[] = [
  { value: 'ask', label: '询问我' },
  { value: 'replace', label: '替换播放列表并播放' },
  { value: 'insert-next', label: '插入到下一首并播放' },
]
const lyricsSourceOptions = [
  { value: 'ncm', label: '网易云音乐' },
  { value: 'qq', label: 'QQ 音乐' },
]
const mobileLayoutOptions = [
  { value: 'lyrics', label: '全屏歌词' },
  { value: 'cover', label: '封面与歌词' },
]
const coverShapeOptions = [
  { value: 'square', label: '方形' },
  { value: 'circle', label: '圆形' },
]

usePageSeo({
  title: '设置',
  description: '用户设置',
  path: '/settings',
  noindex: true,
})

const showChangePassword = ref(false)
const showChangeName = ref(false)

function formatLatency(ms: number | undefined): string {
  return ms == null ? '-' : `${Math.round(ms)}ms`
}

function regionLabel(region: string): string {
  return mediaSourceRegionOptions.find(o => o.value === region)?.label ?? region
}

function regionBadgeClass(region: string): string {
  return mediaSourceRegionOptions.find(o => o.value === region)?.badgeClass ?? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
}

function qualityText(qualities: number[]): string {
  return qualities.map(q => getQualityName(q)).join(' / ')
}

// 音频质量选项：使用所有媒体源支持的质量（并集）进行过滤；媒体源未加载时显示全部
const availableQualityOptions = computed(() => {
  if (!mediaSource.isLoaded || mediaSource.sources.length === 0)
    return audioQualityOptions
  const supported = new Set(mediaSource.sources.flatMap(s => s.supportedQualities))
  return audioQualityOptions.filter(o => supported.has(o.value))
})

function getInitial(): string {
  return user.value?.name?.charAt(0).toUpperCase() ?? '?'
}

async function logout() {
  await auth.logout()
  toast.success('已退出登录')
}

const buildTime = formatDate(new Date(window.__BUILD_TIME__), 'YYYY-MM-DD HH:mm:ss')

const versionClickCount = ref(0)
const showDebugTool = ref(false)
const activeSection = ref('settings-appearance')
const { scrollY } = usePageScroll()
const settingsSections = computed(() => [
  { id: 'settings-appearance', label: '外观' },
  { id: 'settings-audio', label: '媒体源' },
  { id: 'settings-player', label: '播放器' },
  { id: 'settings-account', label: '账号' },
  { id: 'settings-about', label: '关于' },
  ...(showDebugTool.value ? [{ id: 'settings-debug', label: '请求测试' }] : []),
  { id: 'settings-changelog', label: '更新日志' },
])

function updateActiveSection() {
  const visible = settingsSections.value.filter(({ id }) => {
    const section = document.getElementById(id)
    return section && section.getBoundingClientRect().top <= 144
  })
  activeSection.value = visible.at(-1)?.id ?? settingsSections.value[0].id
}

watch(scrollY, updateActiveSection, { flush: 'post' })

const debugMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
const debugMethod = ref('GET')
const debugUrl = ref('')
const debugBody = ref('')
const debugResult = ref<string | null>(null)
const debugLoading = ref(false)

function onVersionClick() {
  versionClickCount.value++
  if (versionClickCount.value >= 5)
    showDebugTool.value = true
}

async function sendDebugRequest() {
  if (!debugUrl.value.trim())
    return
  debugLoading.value = true
  debugResult.value = null
  try {
    const url = debugUrl.value.startsWith('http') ? debugUrl.value : `${apiBase}${debugUrl.value}`
    let body: unknown
    if (debugBody.value.trim()) {
      try {
        body = JSON.parse(debugBody.value)
      }
      catch {
        body = debugBody.value
      }
    }
    const result = await fetchJsonMutation<unknown>(url, debugMethod.value, body)
    debugResult.value = JSON.stringify(result, null, 2)
  }
  catch (e) {
    debugResult.value = `错误：${e instanceof Error ? e.message : String(e)}`
  }
  finally {
    debugLoading.value = false
  }
}

const { data: changelogData, isLoading: isChangelogLoading, isError: isChangelogError, error: changelogError } = useChangelogQuery()

const changelog = computed(() => changelogData.value?.['hoyomix.changelog'] ?? '')

watch(isChangelogError, (val) => {
  if (val)
    toast.error(`更新日志加载失败：${changelogError.value?.message ?? '未知错误'}`)
})

onMounted(() => {
  store.setBackground()
  updateActiveSection()
})
</script>

<template>
  <div>
    <PageHeader title="设置" subtitle="一些也许有用的设置" />

    <nav aria-label="设置分类" class="sticky top-4 z-[9] w-max max-w-full rounded-2xl border border-white/70 dark:border-gray-700/70 bg-white/70 dark:bg-[var(--theme-surface)]/70 p-1.5 backdrop-blur-xl">
      <div class="flex gap-1 overflow-x-auto">
        <RouterLink
          v-for="section in settingsSections"
          :key="section.id"
          :to="{ hash: `#${section.id}` }"
          class="shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-blue-500"
          :class="activeSection === section.id ? 'bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 hover:dark:bg-gray-800 hover:text-gray-900 hover:dark:text-gray-100'"
          :aria-current="activeSection === section.id ? 'location' : undefined"
          @click="activeSection = section.id"
        >
          {{ section.label }}
        </RouterLink>
      </div>
    </nav>

    <div class="mt-6">
      <section id="settings-appearance" class="scroll-mt-32 grid gap-4 py-6 border-t border-gray-200 dark:border-gray-700 md:grid-cols-[12rem_minmax(0,1fr)] md:gap-8" aria-labelledby="settings-appearance-heading">
        <h2 id="settings-appearance-heading" class="font-bold text-xl">
          外观
        </h2>
        <div class="min-w-0">
          <div class="font-bold text-lg mb-2">
            主题模式
          </div>
          <ThemeSwitcher />
          <p class="text-sm text-gray-600 dark:text-gray-400 mt-2">
            跟随系统会根据设备的外观设置自动切换亮色与暗色模式。
          </p>
        </div>
      </section>
      <section id="settings-audio" class="scroll-mt-32 grid gap-4 py-6 border-t border-gray-200 dark:border-gray-700 md:grid-cols-[12rem_minmax(0,1fr)] md:gap-8" aria-labelledby="settings-audio-heading">
        <h2 id="settings-audio-heading" class="font-bold text-xl">
          媒体源
        </h2>
        <div class="min-w-0 space-y-6">
          <div>
            <div class="font-bold text-lg mb-2 flex items-center gap-2">
              音频源
              <AppButton
                variant="outline"
                size="xs"
                :disabled="mediaSource.isTestingLatency"
                @click="mediaSource.testLatency()"
              >
                <LucideRefreshCw v-if="!mediaSource.isTestingLatency" class="size-3.5" />
                <LucideLoader2 v-else class="size-3.5 animate-spin" />
                重新测试延迟
              </AppButton>
            </div>
            <div v-if="mediaSource.isLoaded" class="flex flex-wrap gap-2">
              <button
                class="w-64 text-left px-4 py-3 rounded-xl border transition-colors cursor-pointer"
                :class="mediaSource.selectedSource === 'auto'
                  ? 'bg-white dark:bg-[var(--theme-surface)] text-gray-700 dark:text-gray-300 border-blue-500'
                  : 'bg-white dark:bg-[var(--theme-surface)] text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700 hover:bg-gray-100 hover:dark:bg-gray-800'"
                @click="mediaSource.selectSource('auto')"
              >
                <div class="flex items-center justify-between gap-2">
                  <span class="font-bold">自动选择</span>
                </div>
                <div class="text-sm mt-1 text-gray-500 dark:text-gray-400">
                  <template v-if="mediaSource.isTestingLatency">
                    <LucideLoader2 class="size-4 inline animate-spin mr-1" />
                    延迟检测中…
                  </template>
                  <template v-else-if="mediaSource.autoPreferredNode">
                    {{ mediaSource.autoPreferredNode }}（{{ formatLatency(mediaSource.latencyResults[mediaSource.autoPreferredNode]) }}）
                  </template>
                  <template v-else>
                    暂无可用节点
                  </template>
                </div>
              </button>

              <button
                v-for="source in mediaSource.sources"
                :key="source.name"
                class="w-64 text-left px-4 py-3 rounded-xl border transition-colors cursor-pointer"
                :class="mediaSource.selectedSource === source.name
                  ? 'bg-white dark:bg-[var(--theme-surface)] text-gray-700 dark:text-gray-300 border-blue-500'
                  : 'bg-white dark:bg-[var(--theme-surface)] text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700 hover:bg-gray-100 hover:dark:bg-gray-800'"
                @click="mediaSource.selectSource(source.name)"
              >
                <div class="flex items-center justify-between gap-2">
                  <div class="flex items-center gap-2 min-w-0">
                    <span class="font-bold truncate">{{ source.name }}</span>
                    <span
                      class="text-xs px-1.5 py-0.5 rounded shrink-0"
                      :class="regionBadgeClass(source.region)"
                    >
                      {{ regionLabel(source.region) }}
                    </span>
                  </div>
                  <span class="text-sm shrink-0">
                    {{ formatLatency(mediaSource.latencyResults[source.name]) }}
                  </span>
                </div>
                <div class="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                  支持音质：{{ qualityText(source.supportedQualities) }}
                </div>
              </button>
            </div>
            <div v-else class="flex items-center py-4 text-gray-400">
              <LucideLoader2 class="size-5 animate-spin mr-2" />
              正在加载音频源配置…
            </div>
            <div class="text-sm text-gray-600 dark:text-gray-400 mt-2">
              自动模式将根据延迟选择音频源，也可手动指定优先使用的音频源
            </div>
          </div>

          <div>
            <div class="font-bold text-lg mb-2">
              音频质量
            </div>
            <RadioGroup
              aria-label="音频质量"
              :options="availableQualityOptions"
              :model-value="quality"
              @update:model-value="player.switchQuality($event as AudioQuality)"
            />
            <div v-if="availableQualityOptions.length === 0" class="text-sm text-gray-500 dark:text-gray-400 mt-2">
              暂无可用音质选项
            </div>
          </div>

          <div>
            <div class="font-bold text-lg mb-2">
              歌词源
            </div>
            <RadioGroup
              aria-label="歌词源"
              :options="lyricsSourceOptions"
              :model-value="lyricsSource"
              @update:model-value="player.setLyricsSource($event as LyricsSource)"
            />
            <div class="text-sm text-gray-600 dark:text-gray-400 mt-2">
              优先使用所选平台的歌词
            </div>
          </div>
        </div>
      </section>

      <section id="settings-player" class="scroll-mt-32 grid gap-4 border-t border-gray-200 dark:border-gray-700 py-6 md:grid-cols-[12rem_minmax(0,1fr)] md:gap-8" aria-labelledby="settings-player-heading">
        <h2 id="settings-player-heading" class="font-bold text-xl">
          播放器
        </h2>
        <div class="min-w-0 space-y-6">
          <div>
            <div class="font-bold text-lg mb-2">
              歌曲默认播放方式
            </div>
            <RadioGroup
              aria-label="歌曲默认播放方式"
              :options="songListPlayOptions"
              :model-value="songListPlayBehavior"
              @update:model-value="player.setSongListPlayBehavior($event as SongListPlayBehavior)"
            />
          </div>

          <div>
            <div class="font-bold text-lg mb-2">
              沉浸模式
            </div>
            <div class="flex items-center gap-3">
              <button
                class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none"
                :class="immersiveModeEnabled ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'"
                role="switch"
                aria-label="启用全屏播放器沉浸模式"
                :aria-checked="immersiveModeEnabled"
                @click="player.setImmersiveModeEnabled(!immersiveModeEnabled)"
              >
                <span
                  class="pointer-events-none inline-block size-5 rounded-full bg-white shadow ring-0 transition-transform duration-200"
                  :class="immersiveModeEnabled ? 'translate-x-5' : 'translate-x-0'"
                />
              </button>
              <span class="text-sm text-gray-600 dark:text-gray-400">{{ immersiveModeEnabled ? '已启用' : '已禁用' }}</span>
            </div>
            <div class="text-sm text-gray-600 dark:text-gray-400 mt-2">
              在全屏播放器中自动隐藏界面控件，移动鼠标或触摸屏幕后暂时显示。
            </div>
          </div>

          <div>
            <div class="font-bold text-lg mb-2">
              播放器布局（移动端）
            </div>
            <RadioGroup
              aria-label="播放器布局（移动端）"
              :options="mobileLayoutOptions"
              :model-value="mobileFullscreenLayout"
              @update:model-value="player.setMobileFullscreenLayout($event as MobileFullscreenLayout)"
            />
          </div>

          <section aria-labelledby="fullscreen-cover-heading">
            <h2 id="fullscreen-cover-heading" class="font-bold text-lg mb-2">
              全屏播放器封面
            </h2>
            <RadioGroup
              aria-labelledby="fullscreen-cover-heading"
              :options="coverShapeOptions"
              :model-value="fullscreenCoverShape"
              @update:model-value="player.setFullscreenCoverShape($event as FullscreenCoverShape)"
            />

            <div v-if="fullscreenCoverShape === 'circle'" class="mt-4 space-y-4">
              <div>
                <div class="font-medium text-sm mb-2">
                  播放中封面旋转
                </div>
                <div class="flex items-center gap-3">
                  <button
                    class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none"
                    :class="fullscreenCoverRotation ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'"
                    role="switch"
                    aria-label="播放中封面旋转"
                    :aria-checked="fullscreenCoverRotation"
                    @click="fullscreenCoverRotation = !fullscreenCoverRotation"
                  >
                    <span
                      class="pointer-events-none inline-block size-5 rounded-full bg-white shadow ring-0 transition-transform duration-200"
                      :class="fullscreenCoverRotation ? 'translate-x-5' : 'translate-x-0'"
                    />
                  </button>
                  <span class="text-sm text-gray-600 dark:text-gray-400">{{ fullscreenCoverRotation ? '已启用' : '已禁用' }}</span>
                </div>
              </div>

              <div>
                <div class="font-medium text-sm mb-2">
                  封面边框
                </div>
                <div class="flex items-center gap-3">
                  <button
                    class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none"
                    :class="fullscreenCoverBorder ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'"
                    role="switch"
                    aria-label="封面边框"
                    :aria-checked="fullscreenCoverBorder"
                    @click="fullscreenCoverBorder = !fullscreenCoverBorder"
                  >
                    <span
                      class="pointer-events-none inline-block size-5 rounded-full bg-white shadow ring-0 transition-transform duration-200"
                      :class="fullscreenCoverBorder ? 'translate-x-5' : 'translate-x-0'"
                    />
                  </button>
                  <span class="text-sm text-gray-600 dark:text-gray-400">{{ fullscreenCoverBorder ? '已启用' : '已禁用' }}</span>
                </div>
              </div>
            </div>
          </section>

          <div>
            <div class="font-bold text-lg mb-2">
              AudioContext API
            </div>
            <div class="flex items-center gap-3">
              <button
                class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none"
                :class="enableAudioContext ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'"
                role="switch"
                :aria-checked="enableAudioContext"
                @click="player.setAudioContextEnabled(!enableAudioContext)"
              >
                <span
                  class="pointer-events-none inline-block size-5 rounded-full bg-white shadow ring-0 transition-transform duration-200"
                  :class="enableAudioContext ? 'translate-x-5' : 'translate-x-0'"
                />
              </button>
              <span class="text-sm text-gray-600 dark:text-gray-400">{{ enableAudioContext ? '已启用' : '已禁用' }}</span>
            </div>
            <div class="text-sm text-gray-600 dark:text-gray-400 mt-2">
              iOS 设备后台播放需禁用该 API <br>
              禁用后频谱可视化等功能将不可用
            </div>
          </div>

          <div>
            <div class="font-bold text-lg mb-2">
              Media Session API
            </div>
            <div class="flex items-center gap-3">
              <button
                class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none"
                :class="enableMediaSession ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'"
                role="switch"
                aria-label="启用 Media Session API"
                :aria-checked="enableMediaSession"
                @click="player.setMediaSessionEnabled(!enableMediaSession)"
              >
                <span
                  class="pointer-events-none inline-block size-5 rounded-full bg-white shadow ring-0 transition-transform duration-200"
                  :class="enableMediaSession ? 'translate-x-5' : 'translate-x-0'"
                />
              </button>
              <span class="text-sm text-gray-600 dark:text-gray-400">{{ enableMediaSession ? '已启用' : '已禁用' }}</span>
            </div>
            <div class="text-sm text-gray-600 dark:text-gray-400 mt-2">
              向系统媒体控件提供歌曲信息、播放进度和播放控制，支持情况取决于浏览器。
            </div>
          </div>

          <PlayerSpectrumSettings />
        </div>
      </section>

      <section id="settings-account" class="scroll-mt-32 grid gap-4 border-t border-gray-200 dark:border-gray-700 py-6 md:grid-cols-[12rem_minmax(0,1fr)] md:gap-8" aria-labelledby="settings-account-heading">
        <h2 id="settings-account-heading" class="font-bold text-xl">
          账号
        </h2>
        <div class="min-w-0">
          <div v-if="isLoggedIn" class="bg-white/60 dark:bg-[var(--theme-surface)]/60 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div class="flex items-center gap-4">
              <div class="size-14 rounded-full overflow-hidden shrink-0 flex items-center justify-center">
                <LazyImg
                  v-if="user?.image"
                  class="size-full rounded-full"
                  :src="user.image"
                  :alt="user.name"
                />
                <div v-else class="size-full bg-blue-500 flex items-center justify-center text-white text-xl font-medium">
                  {{ getInitial() }}
                </div>
              </div>
              <div class="min-w-0 flex-1">
                <p class="font-medium truncate">
                  {{ user?.name }}
                </p>
                <p class="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">
                  {{ user?.email }}
                </p>
              </div>
            </div>
            <div class="flex gap-2 mt-4">
              <AppButton
                @click="showChangeName = true"
              >
                修改用户名
              </AppButton>
              <AppButton
                @click="showChangePassword = true"
              >
                修改密码
              </AppButton>
              <AppButton
                variant="danger"
                @click="logout"
              >
                退出登录
              </AppButton>
            </div>
          </div>
          <div v-else>
            <AppButton
              @click="auth.openAuthDialog()"
            >
              登录
            </AppButton>
          </div>
        </div>
      </section>

      <section id="settings-about" class="scroll-mt-32 grid gap-4 border-t border-gray-200 dark:border-gray-700 py-6 md:grid-cols-[12rem_minmax(0,1fr)] md:gap-8" aria-labelledby="settings-about-heading">
        <h2 id="settings-about-heading" class="font-bold text-xl">
          关于
        </h2>
        <div class="min-w-0 space-y-4">
          <div class="flex gap-4">
            <img
              src="/favicon.png"
              alt="应用图标"
              class="size-16 shrink-0"
            >
            <div>
              {{ appDescription }}
            </div>
          </div>
          <div>
            <div>
              当前版本：<span class="cursor-default select-none" @click="onVersionClick">v{{ appVersion }}</span>
              <span class="border rounded-md px-1 py-0.5 text-sm text-green-700 dark:text-green-400 ml-2">测试版</span>
              <span class="border rounded-md px-1 py-0.5 text-sm text-red-700 dark:text-red-400 ml-2">构建于 {{ buildTime }}</span>
            </div>
            <div class="mt-2">
              <AppButton
                class="my-2"
                @click="$router.push({ name: 'Feedback' })"
              >
                反馈问题
              </AppButton>
              <br>
            </div>

            <div class="mt-2 px-4 py-2 bg-red-50 dark:bg-red-500/15 rounded-lg border border-red-500">
              <div class="font-bold text-red-500">
                须知
              </div>
              本网站由爱好者制作，并非 HOYO-MiX 官方网站。 网站内使用的图标、专辑图片、文本，仅用于信息展示，其版权属于 米哈游/miHoYo/上海米哈游网络科技股份有限公司
            </div>
          </div>
        </div>
      </section>

      <section v-if="showDebugTool" id="settings-debug" class="scroll-mt-32 grid gap-4 border-t border-gray-200 dark:border-gray-700 py-6 md:grid-cols-[12rem_minmax(0,1fr)] md:gap-8" aria-labelledby="settings-debug-heading">
        <h2 id="settings-debug-heading" class="font-bold text-xl">
          请求测试
        </h2>
        <div class="min-w-0">
          <div class="bg-white/60 dark:bg-[var(--theme-surface)]/60 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
            <RadioGroup
              aria-label="请求方法"
              :options="debugMethods.map(method => ({ value: method, label: method }))"
              :model-value="debugMethod"
              @update:model-value="debugMethod = String($event)"
            />
            <input
              v-model="debugUrl"
              class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="请求地址"
            >
            <textarea
              v-model="debugBody"
              rows="4"
              class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400 resize-y"
              placeholder="Body"
            />
            <AppButton
              variant="primary"
              :disabled="debugLoading || !debugUrl.trim()"
              @click="sendDebugRequest"
            >
              <LucideLoader2 v-if="debugLoading" class="size-4 animate-spin" />
              发送
            </AppButton>
            <pre
              v-if="debugResult !== null"
              class="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 text-sm font-mono whitespace-pre-wrap break-all overflow-x-auto max-h-96"
            >{{ debugResult }}</pre>
          </div>
        </div>
      </section>

      <section id="settings-changelog" class="scroll-mt-32 grid gap-4 border-t border-gray-200 dark:border-gray-700 py-6 md:grid-cols-[12rem_minmax(0,1fr)] md:gap-8" aria-labelledby="settings-changelog-heading">
        <h2 id="settings-changelog-heading" class="font-bold text-xl">
          更新日志
        </h2>
        <div class="min-w-0">
          <AsyncFade>
            <div v-if="isChangelogLoading" class="flex items-center py-4 text-gray-400">
              <LucideLoader2 class="size-5 animate-spin mr-2" />
              加载中...
            </div>
            <div v-else-if="isChangelogError" class="flex items-center justify-center py-4 text-red-400">
              加载失败，请刷新重试
            </div>
            <div v-else class="font-mono whitespace-pre-wrap bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
              {{ changelog }}
            </div>
          </AsyncFade>
        </div>
      </section>
    </div>

    <ChangePasswordDialog v-model="showChangePassword" />
    <ChangeUsernameDialog v-model="showChangeName" />
  </div>
</template>

<style scoped>

</style>
