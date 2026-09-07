<script setup lang="ts">
import { usePlayerStore } from '@/store/player'
import { createSpectrumSettings, spectrumControls } from '@/utils/spectrum'

const player = usePlayerStore()
const { spectrumSettings: settings, showSpectrum, enableAudioContext, isPlaying } = storeToRefs(player)
</script>

<template>
  <section class="mt-6" aria-labelledby="spectrum-heading">
    <div class="flex items-center justify-between gap-3 mb-2">
      <h2 id="spectrum-heading" class="font-bold text-lg">
        频谱可视化
      </h2>
      <button class="text-sm text-blue-500 hover:text-blue-600 cursor-pointer" @click="settings = createSpectrumSettings()">
        恢复默认样式
      </button>
    </div>
    <div class="bg-white/60 rounded-xl border border-gray-200 p-4 space-y-4">
      <label class="flex items-center gap-2 text-sm">
        <input v-model="showSpectrum" type="checkbox" :disabled="!enableAudioContext" class="accent-blue-500">
        在全屏播放器中显示频谱
      </label>
      <p v-if="!enableAudioContext" class="text-sm text-gray-500">
        启用 AudioContext API 后可显示实时频谱，仍可调整样式并查看示意预览。
      </p>
      <div class="rounded-xl bg-gray-900 p-3 overflow-hidden">
        <div class="text-xs text-white/60 mb-3">
          {{ isPlaying && enableAudioContext ? '实时预览' : '样式预览 · 示意数据' }}
        </div>
        <div :style="{ height: `${settings.height}px` }">
          <PlayerSpectrum :active="isPlaying && enableAudioContext" preview />
        </div>
      </div>
      <details open>
        <summary class="font-medium cursor-pointer mb-4">
          高级样式设置
        </summary>
        <div class="space-y-4">
          <div class="flex items-center gap-3 flex-wrap">
            <label for="spectrum-color-mode" class="text-sm">主题色</label>
            <select id="spectrum-color-mode" v-model="settings.colorMode" class="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="custom">
                自定义颜色
              </option>
              <option value="cover">
                跟随封面颜色
              </option>
            </select>
            <template v-if="settings.colorMode === 'custom'">
              <input v-model="settings.color" type="color" aria-label="自定义频谱颜色" class="w-10 h-9 cursor-pointer rounded border border-gray-300">
              <span class="text-xs text-gray-500 font-mono">{{ settings.color }}</span>
            </template>
          </div>
          <p v-if="settings.colorMode === 'cover'" class="text-xs text-gray-500">
            自动提取当前歌曲的封面主色并适度提亮；无封面或取色失败时使用白色。
          </p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            <div v-for="control in spectrumControls" :key="control.key">
              <label :for="`spectrum-${control.key}`" class="flex justify-between gap-2 text-sm mb-2">
                <span>{{ control.label }}</span>
                <span class="text-gray-500 tabular-nums">{{ settings[control.key] }} {{ control.unit }}</span>
              </label>
              <input
                :id="`spectrum-${control.key}`" v-model.number="settings[control.key]"
                type="range" :min="control.min" :max="control.max" :step="control.step"
                :aria-describedby="`spectrum-${control.key}-hint`"
                class="w-full accent-blue-500 cursor-pointer"
              >
            </div>
          </div>
        </div>
      </details>
    </div>
  </section>
</template>
