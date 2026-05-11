<script setup lang="ts">
import { formatDate } from '@vueuse/core'
import { toast } from 'vue-sonner'
import { fetchJsonMutation } from '@/api/music'
import { useChangelogQuery } from '@/composables/queries'
import { apiBase, audioQualityOptions } from '@/constants'
import { useAuthStore } from '@/store/auth'
import { useMainStore } from '@/store/main'
import { usePlayerStore } from '@/store/player'
import { goFeedbackPage } from '@/utils'

const store = useMainStore()
const player = usePlayerStore()
const auth = useAuthStore()
const { quality, enableAudioContext, lyricsSource } = storeToRefs(player)
const { user, isLoggedIn } = storeToRefs(auth)

const showChangePassword = ref(false)

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
    <div class="pb-4">
      <h1 class="text-2xl md:text-3xl font-bold">
        设置
      </h1>
      <p class="text-gray-500 text-sm mt-1">
        一些也许有用的设置
      </p>
    </div>

    <div>
      <div class="font-bold text-lg mb-2">
        音频质量
      </div>
      <div class="flex gap-2">
        <button
          v-for="opt in audioQualityOptions"
          :key="opt.value"
          class="px-4 py-2 rounded-lg border text-sm font-medium transition-colors cursor-pointer"
          :class="quality === opt.value
            ? 'bg-blue-500 text-white border-blue-500'
            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'"
          @click="player.switchQuality(opt.value)"
        >
          {{ opt.label }}
        </button>
      </div>
    </div>

    <div class="mt-4">
      <div class="font-bold text-lg mb-2">
        歌词源
      </div>
      <div class="flex gap-2">
        <button
          class="px-4 py-2 rounded-lg border text-sm font-medium transition-colors cursor-pointer"
          :class="lyricsSource === 'ncm'
            ? 'bg-blue-500 text-white border-blue-500'
            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'"
          @click="player.setLyricsSource('ncm')"
        >
          网易云音乐
        </button>
        <button
          class="px-4 py-2 rounded-lg border text-sm font-medium transition-colors cursor-pointer"
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

    <div class="font-bold text-2xl mt-4">
      账号
    </div>
    <div class="mt-2">
      <div v-if="isLoggedIn" class="bg-white/60 rounded-xl border border-gray-200 p-4">
        <div class="flex items-center gap-4">
          <div class="size-14 rounded-full overflow-hidden shrink-0 flex items-center justify-center">
            <img
              v-if="user?.image"
              :src="user.image"
              :alt="user.name"
              loading="lazy"
              class="size-full object-cover"
            >
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
          <button
            class="text-sm bg-gray-500/10 px-3 py-2 rounded-lg hover:bg-gray-500/20 transition-colors cursor-pointer"
            @click="showChangePassword = true"
          >
            修改密码
          </button>
          <button
            class="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg hover:bg-red-100 transition-colors cursor-pointer"
            @click="logout"
          >
            退出登录
          </button>
        </div>
      </div>
      <div v-else>
        <button
          class="text-sm bg-gray-500/10 px-3 py-2 rounded-lg hover:bg-gray-500/20 transition-colors cursor-pointer"
          @click="auth.openAuthDialog()"
        >
          登录
        </button>
      </div>
    </div>

    <div class="font-bold text-2xl mt-4">
      关于
    </div>
    <div class="mt-4 px-4 py-2 bg-red-50 rounded-lg border border-red-500">
      <div class="font-bold text-red-500">
        须知
      </div>
      本网站由爱好者制作，并非 HOYO-MiX 官方网站。 网站内使用的图标、专辑图片、文本，仅用于信息展示，其版权属于 米哈游/miHoYo/上海米哈游网络科技股份有限公司
    </div>
    <div class="mt-2">
      一个 HOYO-MiX 音乐信息收集网站
      <br>
      <div class="mt-2">
        当前版本：<span class="cursor-default select-none" @click="onVersionClick">v0.4.0</span>
        <span class="border rounded-md px-1 py-0.5 text-sm text-green-700 ml-2">早期预览版</span>
        <span class="border rounded-md px-1 py-0.5 text-sm text-red-700 ml-2">构建于 {{ buildTime }}</span>
      </div>
      <div class="mt-2">
        <button
          class="text-sm bg-gray-500/10 p-2 rounded-lg hover:bg-gray-500/20 transition-colors cursor-pointer my-2"
          @click="goFeedbackPage"
        >
          反馈问题
        </button>
        <br>
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
        <button
          class="px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
          :disabled="debugLoading || !debugUrl.trim()"
          @click="sendDebugRequest"
        >
          <LucideLoader2 v-if="debugLoading" class="size-4 animate-spin" />
          发送
        </button>
        <pre
          v-if="debugResult !== null"
          class="bg-gray-100 rounded-lg p-3 text-sm font-mono whitespace-pre-wrap break-all overflow-x-auto max-h-96"
        >{{ debugResult }}</pre>
      </div>
    </div>

    <div class="font-bold text-2xl mt-4">
      更新日志
    </div>    <div v-if="isChangelogLoading" class="flex items-center mt-4 py-4 text-gray-400">
      <LucideLoader2 class="size-5 animate-spin mr-2" />
      加载中...
    </div>
    <div v-else class="font-mono whitespace-pre bg-gray-100 rounded-lg p-4 mt-4 overflow-x-scroll">
      {{ changelog }}
    </div>

    <ChangePasswordDialog v-model="showChangePassword" />
  </div>
</template>

<style scoped>

</style>
