<script setup lang="ts">
import type { SongListPlayBehavior } from '@/types/player'
import { formatDate } from '@vueuse/core'
import { toast } from 'vue-sonner'
import { useChangelogQuery } from '@/composables/queries'
import { usePageSeo } from '@/composables/usePageSeo'
import { apiBase, appDescription, appTitle, appVersion, audioQualityOptions, getQualityName, mediaSourceRegionOptions } from '@/constants'
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
  return mediaSourceRegionOptions.find(o => o.value === region)?.badgeClass ?? 'bg-gray-100 text-gray-600'
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
})
</script>

<template>
  <div>
    <PageHeader title="设置" subtitle="一些也许有用的设置" />

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
            ? 'bg-white text-gray-700 border-blue-500'
            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'"
          @click="mediaSource.selectSource('auto')"
        >
          <div class="flex items-center justify-between gap-2">
            <span class="font-bold">自动选择</span>
          </div>
          <div class="text-sm mt-1 text-gray-500">
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
            ? 'bg-white text-gray-700 border-blue-500'
            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'"
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
          <div class="text-xs text-gray-500 mt-1.5">
            支持音质：{{ qualityText(source.supportedQualities) }}
          </div>
        </button>
      </div>
      <div v-else class="flex items-center py-4 text-gray-400">
        <LucideLoader2 class="size-5 animate-spin mr-2" />
        正在加载音频源配置…
      </div>
      <div class="text-sm text-gray-600 mt-2">
        自动模式将根据延迟选择音频源，也可手动指定优先使用的音频源
      </div>
    </div>

    <div class="mt-4">
      <div class="font-bold text-lg mb-2">
        音频质量
      </div>
      <div class="flex gap-2">
        <button
          v-for="opt in availableQualityOptions"
          :key="opt.value"
          class="px-3 py-2 rounded-lg border text-sm font-medium transition-colors cursor-pointer"
          :class="quality === opt.value
            ? 'bg-blue-500 text-white border-blue-500'
            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'"
          @click="player.switchQuality(opt.value)"
        >
          {{ opt.label }}
        </button>
      </div>
      <div v-if="availableQualityOptions.length === 0" class="text-sm text-gray-500 mt-2">
        暂无可用音质选项
      </div>
    </div>

    <div class="mt-4">
      <div class="font-bold text-lg mb-2">
        歌词源
      </div>
      <div class="flex gap-2">
        <button
          class="px-3 py-2 rounded-lg border text-sm font-medium transition-colors cursor-pointer"
          :class="lyricsSource === 'ncm'
            ? 'bg-blue-500 text-white border-blue-500'
            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'"
          @click="player.setLyricsSource('ncm')"
        >
          网易云音乐
        </button>
        <button
          class="px-3 py-2 rounded-lg border text-sm font-medium transition-colors cursor-pointer"
          :class="lyricsSource === 'qq'
            ? 'bg-blue-500 text-white border-blue-500'
            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'"
          @click="player.setLyricsSource('qq')"
        >
          QQ 音乐
        </button>
      </div>
      <div class="text-sm text-gray-600 mt-2">
        优先使用所选平台的歌词
      </div>
    </div>

    <div class="mt-4">
      <div class="font-bold text-lg mb-2">
        歌曲默认播放方式
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="option in songListPlayOptions"
          :key="option.value"
          class="px-3 py-2 rounded-lg border text-sm font-medium transition-colors cursor-pointer"
          :class="songListPlayBehavior === option.value
            ? 'bg-blue-500 text-white border-blue-500'
            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'"
          :aria-pressed="songListPlayBehavior === option.value"
          @click="player.setSongListPlayBehavior(option.value)"
        >
          {{ option.label }}
        </button>
      </div>
    </div>

    <div class="mt-4">
      <div class="font-bold text-lg mb-2">
        沉浸模式
      </div>
      <div class="flex items-center gap-3">
        <button
          class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none"
          :class="immersiveModeEnabled ? 'bg-blue-500' : 'bg-gray-300'"
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
        <span class="text-sm text-gray-600">{{ immersiveModeEnabled ? '已启用' : '已禁用' }}</span>
      </div>
      <div class="text-sm text-gray-600 mt-2">
        在全屏播放器中自动隐藏界面控件，移动鼠标或触摸屏幕后暂时显示。
      </div>
    </div>

    <div class="mt-4">
      <div class="font-bold text-lg mb-2">
        播放器布局（移动端）
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          class="px-3 py-2 rounded-lg border text-sm font-medium transition-colors cursor-pointer"
          :class="mobileFullscreenLayout === 'lyrics'
            ? 'bg-blue-500 text-white border-blue-500'
            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'"
          @click="player.setMobileFullscreenLayout('lyrics')"
        >
          全屏歌词
        </button>
        <button
          class="px-3 py-2 rounded-lg border text-sm font-medium transition-colors cursor-pointer"
          :class="mobileFullscreenLayout === 'cover'
            ? 'bg-blue-500 text-white border-blue-500'
            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'"
          @click="player.setMobileFullscreenLayout('cover')"
        >
          封面与歌词
        </button>
      </div>
    </div>

    <section class="mt-4" aria-labelledby="fullscreen-cover-heading">
      <h2 id="fullscreen-cover-heading" class="font-bold text-lg mb-2">
        全屏播放器封面
      </h2>
      <div class="flex flex-wrap gap-2">
        <button
          class="px-3 py-2 rounded-lg border text-sm font-medium transition-colors cursor-pointer"
          :class="fullscreenCoverShape === 'square'
            ? 'bg-blue-500 text-white border-blue-500'
            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'"
          :aria-pressed="fullscreenCoverShape === 'square'"
          @click="player.setFullscreenCoverShape('square')"
        >
          方形
        </button>
        <button
          class="px-3 py-2 rounded-lg border text-sm font-medium transition-colors cursor-pointer"
          :class="fullscreenCoverShape === 'circle'
            ? 'bg-blue-500 text-white border-blue-500'
            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'"
          :aria-pressed="fullscreenCoverShape === 'circle'"
          @click="player.setFullscreenCoverShape('circle')"
        >
          圆形
        </button>
      </div>

      <div v-if="fullscreenCoverShape === 'circle'" class="mt-4 space-y-4">
        <div>
          <div class="font-medium text-sm mb-2">
            播放中封面旋转
          </div>
          <div class="flex items-center gap-3">
            <button
              class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none"
              :class="fullscreenCoverRotation ? 'bg-blue-500' : 'bg-gray-300'"
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
            <span class="text-sm text-gray-600">{{ fullscreenCoverRotation ? '已启用' : '已禁用' }}</span>
          </div>
        </div>

        <div>
          <div class="font-medium text-sm mb-2">
            封面边框
          </div>
          <div class="flex items-center gap-3">
            <button
              class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none"
              :class="fullscreenCoverBorder ? 'bg-blue-500' : 'bg-gray-300'"
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
            <span class="text-sm text-gray-600">{{ fullscreenCoverBorder ? '已启用' : '已禁用' }}</span>
          </div>
        </div>
      </div>
    </section>

    <div class="mt-4">
      <div class="font-bold text-lg mb-2">
        AudioContext API
      </div>
      <div class="flex items-center gap-3">
        <button
          class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none"
          :class="enableAudioContext ? 'bg-blue-500' : 'bg-gray-300'"
          role="switch"
          :aria-checked="enableAudioContext"
          @click="player.setAudioContextEnabled(!enableAudioContext)"
        >
          <span
            class="pointer-events-none inline-block size-5 rounded-full bg-white shadow ring-0 transition-transform duration-200"
            :class="enableAudioContext ? 'translate-x-5' : 'translate-x-0'"
          />
        </button>
        <span class="text-sm text-gray-600">{{ enableAudioContext ? '已启用' : '已禁用' }}</span>
      </div>
      <div class="text-sm text-gray-600 mt-2">
        iOS 设备后台播放需禁用该 API <br>
        禁用后频谱可视化等功能将不可用
      </div>
    </div>

    <div class="mt-4">
      <div class="font-bold text-lg mb-2">
        Media Session API
      </div>
      <div class="flex items-center gap-3">
        <button
          class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none"
          :class="enableMediaSession ? 'bg-blue-500' : 'bg-gray-300'"
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
        <span class="text-sm text-gray-600">{{ enableMediaSession ? '已启用' : '已禁用' }}</span>
      </div>
      <div class="text-sm text-gray-600 mt-2">
        向系统媒体控件提供歌曲信息、播放进度和播放控制，支持情况取决于浏览器。
      </div>
    </div>

    <PlayerSpectrumSettings />

    <div class="font-bold text-2xl mt-4">
      账号
    </div>
    <div class="mt-2">
      <div v-if="isLoggedIn" class="bg-white/60 rounded-xl border border-gray-200 p-4">
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
            <p class="text-sm text-gray-500 truncate mt-0.5">
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

    <div class="font-bold text-2xl mt-4">
      关于 {{ appTitle }}
    </div>

    <div class="mt-2 flex gap-4">
      <img
        src="/favicon.png"
        alt="应用图标"
        class="size-16 shrink-0"
      >
      <div>
        {{ appDescription }}
      </div>
    </div>
    <div class="mt-2">
      <div>
        当前版本：<span class="cursor-default select-none" @click="onVersionClick">v{{ appVersion }}</span>
        <span class="border rounded-md px-1 py-0.5 text-sm text-green-700 ml-2">测试版</span>
        <span class="border rounded-md px-1 py-0.5 text-sm text-red-700 ml-2">构建于 {{ buildTime }}</span>
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

      <div class="mt-2 px-4 py-2 bg-red-50 rounded-lg border border-red-500">
        <div class="font-bold text-red-500">
          须知
        </div>
        本网站由爱好者制作，并非 HOYO-MiX 官方网站。 网站内使用的图标、专辑图片、文本，仅用于信息展示，其版权属于 米哈游/miHoYo/上海米哈游网络科技股份有限公司
      </div>
    </div>

    <div v-if="showDebugTool" class="mt-4">
      <div class="font-bold text-lg mb-2">
        请求测试
      </div>
      <div class="bg-white/60 rounded-xl border border-gray-200 p-4 space-y-3">
        <div class="flex gap-2 flex-wrap">
          <button
            v-for="method in debugMethods"
            :key="method"
            class="px-3 py-1 rounded-md border text-sm font-medium transition-colors cursor-pointer"
            :class="debugMethod === method
              ? 'bg-blue-500 text-white border-blue-500'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'"
            @click="debugMethod = method"
          >
            {{ method }}
          </button>
        </div>
        <input
          v-model="debugUrl"
          class="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="请求地址"
        >
        <textarea
          v-model="debugBody"
          rows="4"
          class="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400 resize-y"
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
          class="bg-gray-100 rounded-lg p-3 text-sm font-mono whitespace-pre-wrap break-all overflow-x-auto max-h-96"
        >{{ debugResult }}</pre>
      </div>
    </div>

    <div class="font-bold text-2xl mt-4">
      更新日志
    </div>
    <AsyncFade>
      <div v-if="isChangelogLoading" class="flex items-center mt-4 py-4 text-gray-400">
        <LucideLoader2 class="size-5 animate-spin mr-2" />
        加载中...
      </div>
      <div v-else-if="isChangelogError" class="flex items-center justify-center mt-4 py-4 text-red-400">
        加载失败，请刷新重试
      </div>
      <div v-else class="font-mono whitespace-pre-wrap bg-gray-100 rounded-lg p-4 mt-4">
        {{ changelog }}
      </div>
    </AsyncFade>

    <ChangePasswordDialog v-model="showChangePassword" />
    <ChangeUsernameDialog v-model="showChangeName" />
  </div>
</template>

<style scoped>

</style>
