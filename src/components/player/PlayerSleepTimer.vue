<script setup lang="ts">
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
  <AppDialog v-model="visible" title="定时播放">
    <div class="p-6 space-y-5 max-h-[calc(100dvh-8rem)] overflow-y-auto text-gray-900 dark:text-gray-100" @keydown="onContentKeydown">
      <div v-if="active" class="rounded-xl bg-black/5 dark:bg-white/5 p-4 text-center">
        <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">
          定时播放已开启
        </p>
        <p class="text-xl font-semibold tabular-nums text-blue-500 dark:text-blue-400" role="status">
          {{ statusLabel }}
        </p>
        <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
          {{ player.sleepTimer.mode === 'duration' ? '暂停和缓冲期间仍会计时' : '播放结束或手动切歌均计一首' }}
        </p>
      </div>

      <div v-if="active && !editing" class="flex gap-3">
        <AppButton size="lg" class="flex-1" @click="player.cancelSleepTimer()">
          取消定时
        </AppButton>
        <AppButton variant="primary" size="lg" class="flex-1" @click="editing = true">
          重新设置
        </AppButton>
      </div>

      <form v-else class="space-y-5" @submit.prevent="start">
        <SegmentSwitch
          v-model="settings.mode"
          :options="[{ key: 'duration', label: '播放时长' }, { key: 'songs', label: '歌曲数量' }]"
          block
          role="group"
          aria-label="定时播放模式"
        />

        <template v-if="settings.mode === 'duration'">
          <div>
            <label for="sleep-timer-minutes" class="flex items-center justify-between mb-3 text-sm">
              <span>播放时长</span>
              <span class="text-blue-500 dark:text-blue-400 tabular-nums">{{ settings.minutes }} 分钟</span>
            </label>
            <input id="sleep-timer-minutes" v-model.number="settings.minutes" type="range" min="5" max="120" step="5" class="w-full accent-blue-500 cursor-pointer" :aria-valuetext="`${settings.minutes} 分钟`">
            <div class="flex justify-between mt-1 text-xs text-gray-400">
              <span>5 分钟</span>
              <span>120 分钟</span>
            </div>
          </div>
          <label class="flex items-center gap-3 text-sm cursor-pointer">
            <input v-model="settings.finishCurrentSong" type="checkbox" class="size-4 accent-blue-500 cursor-pointer">
            播放完最后一首歌曲
          </label>
          <p class="text-xs leading-relaxed text-gray-500 dark:text-gray-400">
            {{ settings.finishCurrentSong ? '到时后播放完当前歌曲再暂停；等待期间手动切歌会立即暂停。' : '从开启时持续倒计时，到时立即暂停播放。' }}
          </p>
        </template>

        <template v-else>
          <div>
            <label for="sleep-timer-songs" class="block mb-3 text-sm">播放歌曲数量</label>
            <div class="flex items-center gap-3">
              <AppButton icon-only aria-label="减少歌曲数量" :disabled="settings.songs <= 1" class="size-10 shrink-0" @click="settings.songs = Math.max(1, settings.songs - 1)">
                <LucideMinus class="size-4" />
              </AppButton>
              <input id="sleep-timer-songs" v-model.number="settings.songs" type="number" min="1" max="50" step="1" required class="min-w-0 flex-1 rounded-xl border border-gray-200 dark:border-white/15 bg-black/5 dark:bg-white/5 px-3 py-2 text-center tabular-nums outline-none focus:border-blue-400" @blur="normalizeSettings">
              <AppButton icon-only aria-label="增加歌曲数量" :disabled="settings.songs >= 50" class="size-10 shrink-0" @click="settings.songs = Math.min(50, settings.songs + 1)">
                <LucidePlus class="size-4" />
              </AppButton>
            </div>
          </div>
          <p class="text-xs leading-relaxed text-gray-500 dark:text-gray-400">
            从当前歌曲开始，播放结束或手动切歌均计一首；单曲循环每播完一次计一首。
          </p>
        </template>

        <div class="flex gap-3">
          <AppButton v-if="active" size="lg" class="flex-1" @click="editing = false">
            返回
          </AppButton>
          <AppButton type="submit" variant="primary" size="lg" class="flex-1">
            {{ active ? '重新开始' : '开启定时' }}
          </AppButton>
        </div>
      </form>
    </div>
  </AppDialog>
</template>
