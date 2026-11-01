<script setup lang="ts">
import { t } from '@/i18n'
import { usePlayerStore } from '@/store/player'
import { createSpectrumSettings, spectrumControls } from '@/utils/spectrum'

const player = usePlayerStore()
const { spectrumSettings: settings, showSpectrum, enableAudioContext, isPlaying } = storeToRefs(player)
const colorModeOptions = [
  { value: 'custom', get label() {
    return t('PlayerSpectrumSettings.custom_color')
  } },
  { value: 'cover', get label() {
    return t('PlayerSpectrumSettings.match_cover_colors')
  } },
]
</script>

<template>
  <section aria-labelledby="spectrum-heading">
    <div class="flex items-center justify-between gap-3 mb-2">
      <h2 id="spectrum-heading" class="font-bold text-lg">
        {{ t('PlayerFullscreen.spectrum_visualization') }}
      </h2>
      <button class="text-sm text-blue-500 hover:text-blue-600 hover:dark:text-blue-400 cursor-pointer" @click="settings = createSpectrumSettings()">
        {{ t('PlayerSpectrumSettings.reset_appearance') }}
      </button>
    </div>
    <div class="bg-white/60 dark:bg-[var(--theme-surface)]/60 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-4">
      <div>
        <div class="flex items-center gap-3">
          <button
            type="button"
            class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            :class="showSpectrum ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'"
            role="switch"
            :aria-label="t('PlayerSpectrumSettings.show_spectrum_in_the_fullscreen_player')"
            aria-describedby="spectrum-enabled-description"
            :aria-checked="showSpectrum"
            :disabled="!enableAudioContext"
            @click="showSpectrum = !showSpectrum"
          >
            <span
              class="pointer-events-none inline-block size-5 rounded-full bg-white shadow ring-0 transition-transform duration-200"
              :class="showSpectrum ? 'translate-x-5' : 'translate-x-0'"
            />
          </button>
          <span class="text-sm text-gray-600 dark:text-gray-400">{{ showSpectrum ? t('Settings.enabled') : t('Settings.disabled') }}</span>
        </div>
        <p id="spectrum-enabled-description" class="text-sm text-gray-600 dark:text-gray-400 mt-2">
          {{ t('PlayerSpectrumSettings.show_spectrum_in_the_fullscreen_player') }}<template v-if="!enableAudioContext">
            <br>{{ t('PlayerSpectrumSettings.spectrum_visualization_is_unavailable_enable_audiocontext_api_first') }}
          </template>
        </p>
      </div>
      <div class="rounded-xl bg-gray-900 p-3 overflow-hidden">
        <div class="text-xs text-white/60 mb-3">
          {{ isPlaying && enableAudioContext ? t('PlayerSpectrumSettings.live_preview') : t('PlayerSpectrumSettings.appearance_preview_sample_data') }}
        </div>
        <div :style="{ height: `${settings.height}px` }">
          <PlayerSpectrum :active="isPlaying && enableAudioContext" preview />
        </div>
      </div>
      <details open>
        <summary class="font-medium cursor-pointer mb-4">
          {{ t('PlayerSpectrumSettings.advanced_appearance_settings') }}
        </summary>
        <div class="space-y-4">
          <div class="flex items-center gap-3 flex-wrap">
            <span id="spectrum-color-mode-label" class="text-sm">{{ t('PlayerSpectrumSettings.accent_color') }}</span>
            <RadioGroup
              aria-labelledby="spectrum-color-mode-label"
              :options="colorModeOptions"
              :model-value="settings.colorMode"
              @update:model-value="settings.colorMode = $event as 'custom' | 'cover'"
            />
            <template v-if="settings.colorMode === 'custom'">
              <input v-model="settings.color" type="color" :aria-label="t('PlayerSpectrumSettings.custom_spectrum_color')" class="w-10 h-9 cursor-pointer rounded border border-gray-300 dark:border-gray-700">
              <span class="text-xs text-gray-500 dark:text-gray-400 font-mono">{{ settings.color }}</span>
            </template>
          </div>
          <p v-if="settings.colorMode === 'cover'" class="text-xs text-gray-500 dark:text-gray-400">
            {{ t('PlayerSpectrumSettings.use_the_dominant_color_of_the_current_cover_falls') }}
          </p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            <div v-for="control in spectrumControls" :key="control.key">
              <label :for="`spectrum-${control.key}`" class="flex justify-between gap-2 text-sm mb-2">
                <span>{{ control.label }}</span>
                <span class="text-gray-500 dark:text-gray-400 tabular-nums">{{ settings[control.key] }} {{ control.unit }}</span>
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
