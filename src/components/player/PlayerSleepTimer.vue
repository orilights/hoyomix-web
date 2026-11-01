<script setup lang="ts">
import { t } from '@/i18n'
import { usePlayerStore } from '@/store/player'
import { getSleepTimerLabel, normalizeSleepTimerPreferences } from '@/utils/sleep-timer'

const visible = defineModel<boolean>({ required: true })
const player = usePlayerStore()
const editing = ref(false)
const settings = ref(normalizeSleepTimerPreferences(player.sleepTimerPreferences))
const active = computed(() => player.sleepTimer.status !== 'off')
const statusLabel = computed(() => getSleepTimerLabel(player.sleepTimer, player.sleepTimerNow))

function normalizeSettings() {
  settings.value = normalizeSleepTimerPreferences(settings.value)
}

function onContentKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape')
    event.stopPropagation()
}

function start() {
  normalizeSettings()
  player.startSleepTimer(settings.value)
  editing.value = false
}

watch(visible, (value) => {
  if (value) {
    settings.value = normalizeSleepTimerPreferences(player.sleepTimerPreferences)
    editing.value = false
    player.checkSleepTimer()
  }
})
</script>

<template>
  <AppDialog v-model="visible" :close-on-click-overlay="false" :title="t('sleep_timer.sleep_timer')">
    <div class="p-6 space-y-5 max-h-[calc(100dvh-8rem)] overflow-y-auto text-gray-900 dark:text-gray-100" @keydown="onContentKeydown">
      <div v-if="active" class="rounded-xl bg-black/5 dark:bg-white/5 p-4 text-center">
        <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">
          {{ t('PlayerSleepTimer.sleep_timer_is_on') }}
        </p>
        <p class="text-xl font-semibold tabular-nums text-blue-500 dark:text-blue-400" role="status">
          {{ statusLabel }}
        </p>
        <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
          {{ player.sleepTimer.mode === 'duration' ? t('PlayerSleepTimer.the_timer_continues_while_paused_or_buffering') : t('PlayerSleepTimer.each_song_ending_or_manual_skip_counts_as_one') }}
        </p>
      </div>

      <div v-if="active && !editing" class="flex gap-3">
        <AppButton size="lg" class="flex-1" @click="player.cancelSleepTimer()">
          {{ t('PlayerSleepTimer.cancel_timer') }}
        </AppButton>
        <AppButton variant="primary" size="lg" class="flex-1" @click="editing = true">
          {{ t('PlayerSleepTimer.change_timer') }}
        </AppButton>
      </div>

      <form v-else class="space-y-5" @submit.prevent="start">
        <SegmentSwitch
          v-model="settings.mode"
          :options="[{ key: 'duration', label: t('PlayerSleepTimer.playback_duration') }, { key: 'songs', label: t('Album.song_count') }]"
          block
          role="group"
          :aria-label="t('PlayerSleepTimer.sleep_timer_mode')"
        />

        <template v-if="settings.mode === 'duration'">
          <div>
            <label for="sleep-timer-minutes" class="flex items-center justify-between mb-3 text-sm">
              <span>{{ t('PlayerSleepTimer.playback_duration') }}</span>
              <span class="text-blue-500 dark:text-blue-400 tabular-nums">{{ t('PlayerSleepTimer.minute', { p0: settings.minutes }, Number(settings.minutes)) }}</span>
            </label>
            <input id="sleep-timer-minutes" v-model.number="settings.minutes" type="range" min="5" max="120" step="5" class="w-full accent-blue-500 cursor-pointer" :aria-valuetext="t('PlayerSleepTimer.minute', { p0: settings.minutes }, Number(settings.minutes))">
            <div class="flex justify-between mt-1 text-xs text-gray-400">
              <span>{{ t('PlayerSleepTimer.5_minutes') }}</span>
              <span>{{ t('PlayerSleepTimer.120_minutes') }}</span>
            </div>
          </div>
          <label class="flex items-center gap-3 text-sm cursor-pointer">
            <input v-model="settings.finishCurrentSong" type="checkbox" class="size-4 accent-blue-500 cursor-pointer">{{ t('PlayerSleepTimer.finish_the_current_song') }}</label>
          <p class="text-xs leading-relaxed text-gray-500 dark:text-gray-400">
            {{ settings.finishCurrentSong ? t('PlayerSleepTimer.finish_the_current_song_before_pausing_when_time_is') : t('PlayerSleepTimer.the_countdown_starts_immediately_playback_pauses_as_soon_as') }}
          </p>
        </template>

        <template v-else>
          <div>
            <label for="sleep-timer-songs" class="block mb-3 text-sm">{{ t('PlayerSleepTimer.number_of_songs') }}</label>
            <div class="flex items-center gap-3">
              <AppButton icon-only :aria-label="t('PlayerSleepTimer.fewer_songs')" :disabled="settings.songs <= 1" class="size-10 shrink-0" @click="settings.songs = Math.max(1, settings.songs - 1)">
                <LucideMinus class="size-4" />
              </AppButton>
              <input id="sleep-timer-songs" v-model.number="settings.songs" type="number" min="1" max="50" step="1" required class="min-w-0 flex-1 rounded-xl border border-gray-200 dark:border-white/15 bg-black/5 dark:bg-white/5 px-3 py-2 text-center tabular-nums outline-none focus:border-blue-400" @blur="normalizeSettings">
              <AppButton icon-only :aria-label="t('PlayerSleepTimer.more_songs')" :disabled="settings.songs >= 50" class="size-10 shrink-0" @click="settings.songs = Math.min(50, settings.songs + 1)">
                <LucidePlus class="size-4" />
              </AppButton>
            </div>
          </div>
          <p class="text-xs leading-relaxed text-gray-500 dark:text-gray-400">
            {{ t('PlayerSleepTimer.count_from_the_current_song_each_ending_or_manual') }}
          </p>
        </template>

        <div class="flex gap-3">
          <AppButton v-if="active" size="lg" class="flex-1" @click="editing = false">
            {{ t('PlayerSleepTimer.back') }}
          </AppButton>
          <AppButton type="submit" variant="primary" size="lg" class="flex-1">
            {{ active ? t('PlayerSleepTimer.restart') : t('PlayerSleepTimer.start_timer') }}
          </AppButton>
        </div>
      </form>
    </div>
  </AppDialog>
</template>
