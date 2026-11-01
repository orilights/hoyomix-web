<script setup lang="ts">
import type { AudioQuality, FullscreenCoverShape, LyricsSource, MobileFullscreenLayout, SongListPlayBehavior } from '@/types/player'
import { toast } from 'vue-sonner'
import { useChangelogQuery } from '@/composables/queries'
import { useImageCache } from '@/composables/useImageCache'
import { usePageScroll } from '@/composables/usePageScroll'
import { usePageSeo } from '@/composables/usePageSeo'
import { appGithubRepoUrl, appVersion, audioQualityOptions, getAppDescription, getQualityName, mediaSourceRegionOptions } from '@/constants'
import { t } from '@/i18n'
import { useAuthStore } from '@/store/auth'
import { useLanguageStore } from '@/store/language'
import { useMainStore } from '@/store/main'
import { useMediaSourceStore } from '@/store/media-source'
import { usePlayerStore } from '@/store/player'
import { formatDateTime } from '@/utils/time'

const store = useMainStore()
const player = usePlayerStore()
const auth = useAuthStore()
const mediaSource = useMediaSourceStore()
const language = useLanguageStore()
const languageOptions = computed(() => [
  { value: 'auto', label: t('language.follow_browser') },
  { value: 'zh-CN', label: '简体中文' },
  { value: 'zh-TW', label: '繁體中文' },
  { value: 'en', label: 'English' },
])
const { supported: imageCacheSupported, bytes: imageCacheBytes, count: imageCacheCount, busy: imageCacheBusy, error: imageCacheError, update: updateImageCache } = useImageCache()
const imageCacheSize = computed(() => imageCacheBytes.value === null ? t('Settings.reading') : `${(imageCacheBytes.value / 1024 / 1024).toFixed(2)} MB`)

async function clearImageCache() {
  if (await updateImageCache('clear'))
    toast.success(t('Settings.image_cache_cleared'))
  else
    toast.error(imageCacheError.value || t('Settings.failed_to_clear_image_cache_please_try_again_later'))
}
const { quality, enableAudioContext, enableMediaSession, lyricsSource, songListPlayBehavior, mobileFullscreenLayout, fullscreenCoverShape, fullscreenCoverRotation, fullscreenCoverBorder, immersiveModeEnabled } = storeToRefs(player)
const { user, isLoggedIn } = storeToRefs(auth)

const songListPlayOptions: { value: SongListPlayBehavior, label: string }[] = [
  { value: 'ask', get label() {
    return t('Settings.ask_me')
  } },
  { value: 'replace', get label() {
    return t('SongListPlaybackDialog.replace_queue_and_play')
  } },
  { value: 'insert-next', get label() {
    return t('MusicActions.play_next')
  } },
]
const lyricsSourceOptions = [
  { value: 'ncm', get label() {
    return t('Settings.netease_cloud_music')
  } },
  { value: 'qq', get label() {
    return t('Settings.qq_music')
  } },
]
const mobileLayoutOptions = [
  { value: 'lyrics', get label() {
    return t('Settings.full_lyrics')
  } },
  { value: 'cover', get label() {
    return t('Settings.cover_and_lyrics')
  } },
]
const coverShapeOptions = [
  { value: 'square', get label() {
    return t('Settings.square')
  } },
  { value: 'circle', get label() {
    return t('Settings.circle')
  } },
]

usePageSeo({
  title: () => t('DesktopSidebar.settings'),
  description: () => t('Settings.user_settings'),
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
  toast.success(t('Settings.signed_out'))
}

const buildTime = computed(() => formatDateTime(window.__BUILD_TIME__))

const activeSection = ref('settings-appearance')
const { scrollY } = usePageScroll()
const settingsSections = computed(() => [
  { id: 'settings-appearance', label: t('Settings.appearance') },
  { id: 'settings-audio', label: t('Settings.media_sources') },
  { id: 'settings-player', label: t('Settings.player') },
  { id: 'settings-account', label: t('Settings.account') },
  { id: 'settings-cache', label: t('Settings.cache') },
  { id: 'settings-about', label: t('Settings.about') },
  { id: 'settings-changelog', label: t('Settings.changelog') },
])

function updateActiveSection() {
  const visible = settingsSections.value.filter(({ id }) => {
    const section = document.getElementById(id)
    return section && section.getBoundingClientRect().top <= 144
  })
  activeSection.value = visible.at(-1)?.id ?? settingsSections.value[0].id
}

watch(scrollY, updateActiveSection, { flush: 'post' })

const { data: changelogData, isLoading: isChangelogLoading, isError: isChangelogError, error: changelogError } = useChangelogQuery()

const changelog = computed(() => changelogData.value?.['hoyomix.changelog'] ?? '')

watch(isChangelogError, (val) => {
  if (val)
    toast.error(t('Settings.failed_to_load_changelog', { p0: changelogError.value?.message ?? t('App.unknown_error') }))
})

function openGithubRepo() {
  window.open(appGithubRepoUrl, '_blank')
}

onMounted(() => {
  store.setBackground()
  updateActiveSection()
})
</script>

<template>
  <div>
    <PageHeader :title="t('DesktopSidebar.settings')" :subtitle="t('Settings.a_few_settings_you_may_find_useful')" />

    <nav :aria-label="t('Settings.settings_categories')" class="sticky top-4 z-[9] w-max max-w-full rounded-2xl border border-white/70 dark:border-gray-700/70 bg-white/70 dark:bg-[var(--theme-surface)]/70 p-1.5 backdrop-blur-xl">
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
          {{ t('Settings.appearance') }}
        </h2>
        <div class="min-w-0">
          <div class="font-bold text-lg mb-2">
            {{ t('Settings.theme') }}
          </div>
          <ThemeSwitcher />
          <p class="text-sm text-gray-600 dark:text-gray-400 mt-2">
            {{ t('Settings.system_mode_automatically_switches_between_light_and_dark_based') }}
          </p>
          <div class="mt-6">
            <label id="language-label" class="mb-2 block text-lg font-bold">{{ t('language.label') }}</label>
            <AppSelect
              class="w-full sm:w-64"
              :model-value="language.preference"
              :options="languageOptions"
              aria-labelledby="language-label"
              @update:model-value="language.setPreference($event)"
            />
          </div>
        </div>
      </section>
      <section id="settings-audio" class="scroll-mt-32 grid gap-4 py-6 border-t border-gray-200 dark:border-gray-700 md:grid-cols-[12rem_minmax(0,1fr)] md:gap-8" aria-labelledby="settings-audio-heading">
        <h2 id="settings-audio-heading" class="font-bold text-xl">
          {{ t('Settings.media_sources') }}
        </h2>
        <div class="min-w-0 space-y-6">
          <div>
            <div class="font-bold text-lg mb-2 flex items-center gap-2">
              {{ t('Settings.audio_source') }}<AppButton
                variant="outline"
                size="xs"
                :disabled="mediaSource.isTestingLatency"
                @click="mediaSource.testLatency()"
              >
                <LucideRefreshCw v-if="!mediaSource.isTestingLatency" class="size-3.5" />
                <LucideLoader2 v-else class="size-3.5 animate-spin" />{{ t('Settings.test_latency_again') }}
              </AppButton>
            </div>
            <AsyncFade>
              <div v-if="mediaSource.isLoaded" class="flex flex-wrap gap-2">
                <button
                  class="w-64 text-left px-4 py-3 rounded-xl border transition-colors cursor-pointer"
                  :class="mediaSource.selectedSource === 'auto'
                    ? 'bg-white dark:bg-[var(--theme-surface)] text-gray-700 dark:text-gray-300 border-blue-500'
                    : 'bg-white dark:bg-[var(--theme-surface)] text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700 hover:bg-gray-100 hover:dark:bg-gray-800'"
                  @click="mediaSource.selectSource('auto')"
                >
                  <div class="flex items-center justify-between gap-2">
                    <span class="font-bold">{{ t('Settings.automatic') }}</span>
                  </div>
                  <div class="text-sm mt-1 text-gray-500 dark:text-gray-400">
                    <AsyncFade>
                      <div v-if="mediaSource.isTestingLatency">
                        <LucideLoader2 class="size-4 inline animate-spin mr-1" />{{ t('Settings.testing_latency') }}
                      </div>
                      <div v-else-if="mediaSource.autoPreferredNode">
                        {{ mediaSource.autoPreferredNode }}（{{ formatLatency(mediaSource.latencyResults[mediaSource.autoPreferredNode]) }}）
                      </div>
                      <div v-else>
                        {{ t('Settings.no_available_servers') }}
                      </div>
                    </AsyncFade>
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
                    {{ t('Settings.supported_quality', { p0: qualityText(source.supportedQualities) }) }}
                  </div>
                </button>
              </div>
              <div v-else role="status" class="flex items-center justify-center py-4 text-gray-400">
                <LucideLoader2 class="size-5 animate-spin mr-2" />{{ t('Settings.loading_audio_source_configuration') }}
              </div>
            </AsyncFade>
            <div class="text-sm text-gray-600 dark:text-gray-400 mt-2">
              {{ t('Settings.automatic_mode_selects_an_audio_source_based_on_latency') }}
            </div>
          </div>

          <div>
            <div class="font-bold text-lg mb-2">
              {{ t('Settings.audio_quality') }}
            </div>
            <RadioGroup
              :aria-label="t('Settings.audio_quality')"
              :options="availableQualityOptions"
              :model-value="quality"
              @update:model-value="player.switchQuality($event as AudioQuality)"
            />
            <div v-if="availableQualityOptions.length === 0" class="text-sm text-gray-500 dark:text-gray-400 mt-2">
              {{ t('Settings.no_audio_quality_options_available') }}
            </div>
          </div>

          <div>
            <div class="font-bold text-lg mb-2">
              {{ t('Settings.lyrics_source') }}
            </div>
            <RadioGroup
              :aria-label="t('Settings.lyrics_source')"
              :options="lyricsSourceOptions"
              :model-value="lyricsSource"
              @update:model-value="player.setLyricsSource($event as LyricsSource)"
            />
            <div class="text-sm text-gray-600 dark:text-gray-400 mt-2">
              {{ t('Settings.prefer_lyrics_from_the_selected_platform') }}
            </div>
          </div>
        </div>
      </section>

      <section id="settings-player" class="scroll-mt-32 grid gap-4 border-t border-gray-200 dark:border-gray-700 py-6 md:grid-cols-[12rem_minmax(0,1fr)] md:gap-8" aria-labelledby="settings-player-heading">
        <h2 id="settings-player-heading" class="font-bold text-xl">
          {{ t('Settings.player') }}
        </h2>
        <div class="min-w-0 space-y-6">
          <div>
            <div class="font-bold text-lg mb-2">
              {{ t('Settings.default_song_playback_action') }}
            </div>
            <RadioGroup
              :aria-label="t('Settings.default_song_playback_action')"
              :options="songListPlayOptions"
              :model-value="songListPlayBehavior"
              @update:model-value="player.setSongListPlayBehavior($event as SongListPlayBehavior)"
            />
          </div>

          <div>
            <div class="font-bold text-lg mb-2">
              {{ t('Settings.immersive_mode') }}
            </div>
            <div class="flex items-center gap-3">
              <button
                class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none"
                :class="immersiveModeEnabled ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'"
                role="switch"
                :aria-label="t('Settings.enable_immersive_mode_in_the_fullscreen_player')"
                :aria-checked="immersiveModeEnabled"
                @click="player.setImmersiveModeEnabled(!immersiveModeEnabled)"
              >
                <span
                  class="pointer-events-none inline-block size-5 rounded-full bg-white shadow ring-0 transition-transform duration-200"
                  :class="immersiveModeEnabled ? 'translate-x-5' : 'translate-x-0'"
                />
              </button>
              <span class="text-sm text-gray-600 dark:text-gray-400">{{ immersiveModeEnabled ? t('Settings.enabled') : t('Settings.disabled') }}</span>
            </div>
            <div class="text-sm text-gray-600 dark:text-gray-400 mt-2">
              {{ t('Settings.automatically_hide_controls_in_the_fullscreen_player') }}
            </div>
          </div>

          <div>
            <div class="font-bold text-lg mb-2">
              {{ t('Settings.player_layout_mobile') }}
            </div>
            <RadioGroup
              :aria-label="t('Settings.player_layout_mobile')"
              :options="mobileLayoutOptions"
              :model-value="mobileFullscreenLayout"
              @update:model-value="player.setMobileFullscreenLayout($event as MobileFullscreenLayout)"
            />
          </div>

          <section aria-labelledby="fullscreen-cover-heading">
            <h2 id="fullscreen-cover-heading" class="font-bold text-lg mb-2">
              {{ t('Settings.fullscreen_player_cover') }}
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
                  {{ t('Settings.rotate_cover_during_playback') }}
                </div>
                <div class="flex items-center gap-3">
                  <button
                    class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none"
                    :class="fullscreenCoverRotation ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'"
                    role="switch"
                    :aria-label="t('Settings.rotate_cover_during_playback')"
                    :aria-checked="fullscreenCoverRotation"
                    @click="fullscreenCoverRotation = !fullscreenCoverRotation"
                  >
                    <span
                      class="pointer-events-none inline-block size-5 rounded-full bg-white shadow ring-0 transition-transform duration-200"
                      :class="fullscreenCoverRotation ? 'translate-x-5' : 'translate-x-0'"
                    />
                  </button>
                  <span class="text-sm text-gray-600 dark:text-gray-400">{{ fullscreenCoverRotation ? t('Settings.enabled') : t('Settings.disabled') }}</span>
                </div>
              </div>

              <div>
                <div class="font-medium text-sm mb-2">
                  {{ t('Settings.cover_border') }}
                </div>
                <div class="flex items-center gap-3">
                  <button
                    class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none"
                    :class="fullscreenCoverBorder ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'"
                    role="switch"
                    :aria-label="t('Settings.cover_border')"
                    :aria-checked="fullscreenCoverBorder"
                    @click="fullscreenCoverBorder = !fullscreenCoverBorder"
                  >
                    <span
                      class="pointer-events-none inline-block size-5 rounded-full bg-white shadow ring-0 transition-transform duration-200"
                      :class="fullscreenCoverBorder ? 'translate-x-5' : 'translate-x-0'"
                    />
                  </button>
                  <span class="text-sm text-gray-600 dark:text-gray-400">{{ fullscreenCoverBorder ? t('Settings.enabled') : t('Settings.disabled') }}</span>
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
              <span class="text-sm text-gray-600 dark:text-gray-400">{{ enableAudioContext ? t('Settings.enabled') : t('Settings.disabled') }}</span>
            </div>
            <div class="text-sm text-gray-600 dark:text-gray-400 mt-2">
              {{ t('Settings.disable_this_api_for_background_playback_on_ios') }}<br>{{ t('Settings.spectrum_visualization_and_related_features_are_unavailable_when_disabled') }}
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
                :aria-label="t('Settings.enable_media_session_api')"
                :aria-checked="enableMediaSession"
                @click="player.setMediaSessionEnabled(!enableMediaSession)"
              >
                <span
                  class="pointer-events-none inline-block size-5 rounded-full bg-white shadow ring-0 transition-transform duration-200"
                  :class="enableMediaSession ? 'translate-x-5' : 'translate-x-0'"
                />
              </button>
              <span class="text-sm text-gray-600 dark:text-gray-400">{{ enableMediaSession ? t('Settings.enabled') : t('Settings.disabled') }}</span>
            </div>
            <div class="text-sm text-gray-600 dark:text-gray-400 mt-2">
              {{ t('Settings.show_song_details_playback_progress_and_controls_in_system') }}
            </div>
          </div>

          <PlayerSpectrumSettings />
        </div>
      </section>

      <section id="settings-account" class="scroll-mt-32 grid gap-4 border-t border-gray-200 dark:border-gray-700 py-6 md:grid-cols-[12rem_minmax(0,1fr)] md:gap-8" aria-labelledby="settings-account-heading">
        <h2 id="settings-account-heading" class="font-bold text-xl">
          {{ t('Settings.account') }}
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
                {{ t('Settings.change_username') }}
              </AppButton>
              <AppButton
                @click="showChangePassword = true"
              >
                {{ t('Settings.change_password') }}
              </AppButton>
              <AppButton
                variant="danger"
                @click="logout"
              >
                {{ t('Settings.sign_out') }}
              </AppButton>
            </div>
          </div>
          <div v-else>
            <AppButton
              @click="auth.openAuthDialog()"
            >
              {{ t('DesktopSidebar.sign_in') }}
            </AppButton>
          </div>
        </div>
      </section>

      <section id="settings-cache" class="scroll-mt-32 grid gap-4 border-t border-gray-200 dark:border-gray-700 py-6 md:grid-cols-[12rem_minmax(0,1fr)] md:gap-8" aria-labelledby="settings-cache-heading">
        <h2 id="settings-cache-heading" class="font-bold text-xl">
          {{ t('Settings.cache') }}
        </h2>
        <div class="min-w-0 space-y-3">
          <div class="font-bold text-lg">
            {{ t('Settings.image_cache') }}
          </div>
          <template v-if="imageCacheSupported">
            <p aria-live="polite" class="text-sm text-gray-600 dark:text-gray-400">
              {{ t('Settings.100_mb_used', { p0: imageCacheSize }) }}<span v-if="imageCacheBytes !== null">{{ t('Settings.image', { p0: imageCacheCount }, Number(imageCacheCount)) }}</span>
            </p>
            <div class="flex flex-wrap gap-2">
              <AppButton variant="outline" size="sm" :disabled="imageCacheBusy" @click="updateImageCache()">
                <LucideRefreshCw class="size-4" :class="imageCacheBusy ? 'animate-spin' : ''" />{{ t('Settings.refresh_usage') }}
              </AppButton>
              <AppButton variant="outline" size="sm" :disabled="imageCacheBusy || imageCacheBytes === 0" @click="clearImageCache">
                <LucideTrash2 class="size-4" />{{ t('Settings.clear_image_cache') }}
              </AppButton>
            </div>
            <p v-if="imageCacheError" role="alert" class="text-sm text-red-600 dark:text-red-400">
              {{ imageCacheError }}
            </p>
          </template>
          <p v-else class="text-sm text-gray-600 dark:text-gray-400">
            {{ t('Settings.image_caching_is_unavailable_in_this_browser_or_environment') }}
          </p>
        </div>
      </section>

      <section id="settings-about" class="scroll-mt-32 grid gap-4 border-t border-gray-200 dark:border-gray-700 py-6 md:grid-cols-[12rem_minmax(0,1fr)] md:gap-8" aria-labelledby="settings-about-heading">
        <h2 id="settings-about-heading" class="font-bold text-xl">
          {{ t('Settings.about') }}
        </h2>
        <div class="min-w-0 space-y-4">
          <div class="flex gap-4">
            <img
              src="/favicon.png"
              :alt="t('Settings.application_icon')"
              class="size-16 shrink-0"
            >
            <div>
              {{ getAppDescription() }}
            </div>
          </div>
          <div>
            <div>
              {{ t('Settings.current_version') }}<span>v{{ appVersion }}</span>
              <span class="border rounded-md px-1 py-0.5 text-sm text-green-700 dark:text-green-400 ml-2">{{ t('Settings.beta') }}</span>
              <span class="border rounded-md px-1 py-0.5 text-sm text-red-700 dark:text-red-400 ml-2">{{ t('Settings.built_on', { p0: buildTime }) }}</span>
            </div>
            <div class="mt-2 flex gap-2">
              <AppButton @click="$router.push({ name: 'Feedback' })">
                {{ t('Settings.report_an_issue') }}
              </AppButton>

              <AppButton @click="openGithubRepo">
                GitHub
              </AppButton>
              <br>
            </div>

            <div class="mt-2 px-4 py-2 bg-red-50 dark:bg-red-500/15 rounded-lg border border-red-500">
              <div class="font-bold text-red-500">
                {{ t('Settings.notice') }}
              </div>{{ t('Settings.this_is_a_fanmade_website_and_is_not_affiliated') }}
            </div>
          </div>
        </div>
      </section>

      <section id="settings-changelog" class="scroll-mt-32 grid gap-4 border-t border-gray-200 dark:border-gray-700 py-6 md:grid-cols-[12rem_minmax(0,1fr)] md:gap-8" aria-labelledby="settings-changelog-heading">
        <h2 id="settings-changelog-heading" class="font-bold text-xl">
          {{ t('Settings.changelog') }}
        </h2>
        <div class="min-w-0">
          <AsyncFade>
            <div v-if="isChangelogLoading" role="status" class="flex items-center justify-center py-4 text-gray-400">
              <LucideLoader2 class="size-5 animate-spin mr-2" />{{ t('App.loading') }}
            </div>
            <div v-else-if="isChangelogError" class="flex items-center justify-center py-4 text-red-400">
              {{ t('ArtistListByType.unable_to_load_refresh_to_try_again') }}
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
