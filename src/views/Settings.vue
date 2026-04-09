<script setup lang="ts">
import { formatDate } from '@vueuse/core'
import { toast } from 'vue-sonner'
import { useChangelogQuery } from '@/composables/queries'
import { audioQualityOptions } from '@/constants'
import { useStore } from '@/store'
import { usePlayerStore } from '@/store/player'
import { goFeedbackPage } from '@/utils'

const store = useStore()
const player = usePlayerStore()
const { quality, enableAudioContext } = storeToRefs(player)

const buildTime = formatDate(new Date(window.__BUILD_TIME__), 'YYYY-MM-DD HH:mm:ss')

const { data: changelogData, isLoading: isChangelogLoading, isError: isChangelogError } = useChangelogQuery()

const changelog = computed(() => changelogData.value?.['hoyomix.changelog'] ?? '')

watch(isChangelogError, (val) => {
  if (val)
    toast.error('更新日志加载失败')
})

onMounted(() => {
  store.setBackground()
})
</script>

<template>
  <div>
    <div class="font-bold text-2xl">
      设置
    </div>
    <div class="mt-4">
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
        当前版本：v0.3.0
        <span class="border rounded-md px-1 py-0.5 text-sm text-green-700">早期预览版</span>
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
    <div class="font-bold text-2xl mt-4">
      更新日志
    </div>
    <div v-if="isChangelogLoading" class="flex items-center mt-4 py-4 text-gray-400">
      <LucideLoader2 class="size-5 animate-spin mr-2" />
      加载中...
    </div>
    <div v-else class="font-mono whitespace-pre bg-gray-100 rounded-lg p-4 mt-4 overflow-x-scroll">
      {{ changelog }}
    </div>
  </div>
</template>

<style scoped>

</style>
