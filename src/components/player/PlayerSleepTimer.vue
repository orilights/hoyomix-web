<script setup lang="ts">
import { usePlayerStore } from '@/store/player'
import { getSleepTimerLabel, normalizeSleepTimerPreferences } from '@/utils/sleep-timer'

const visible = defineModel<boolean>({ required: true })
const player = usePlayerStore()
const dialog = ref<HTMLDialogElement | null>(null)
const editing = ref(false)
const settings = ref(normalizeSleepTimerPreferences(player.sleepTimerPreferences))
const active = computed(() => player.sleepTimer.status !== 'off')
const statusLabel = computed(() => getSleepTimerLabel(player.sleepTimer, player.sleepTimerNow))
const pressedBackdrop = ref(false)

function close() {
  visible.value = false
}

function isBackdrop(event: MouseEvent) {
  if (event.target !== dialog.value || !dialog.value)
    return false
  const bounds = dialog.value.getBoundingClientRect()
  return event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom
}

function normalizeSettings() {
  settings.value = normalizeSleepTimerPreferences(settings.value)
}

function onBackdropClick(event: MouseEvent) {
  if (pressedBackdrop.value && isBackdrop(event))
    close()
}

function start() {
  normalizeSettings()
  player.startSleepTimer(settings.value)
  editing.value = false
}

watch(visible, async (value) => {
  if (value) {
    settings.value = normalizeSleepTimerPreferences(player.sleepTimerPreferences)
    editing.value = false
    player.checkSleepTimer()
    await nextTick()
    if (visible.value && !dialog.value?.open)
      dialog.value?.showModal()
  }
  else {
    dialog.value?.close()
  }
})
</script>

<template>
  <Teleport to="body">
    <dialog
      ref="dialog"
      aria-labelledby="sleep-timer-title"
      class="sleep-timer-dialog m-auto w-[calc(100%-2rem)] max-w-sm max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl border border-white/20 bg-gray-900/95 p-0 text-white shadow-2xl backdrop-blur-xl"
      @cancel.prevent="close"
      @close="close"
      @keydown.stop
      @pointerdown="pressedBackdrop = isBackdrop($event)"
      @click="onBackdropClick"
    >
      <div class="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <h2 id="sleep-timer-title" class="flex items-center gap-2 text-lg font-semibold">
          <LucideTimer class="size-5 text-blue-400" />
          定时播放
        </h2>
        <button type="button" autofocus aria-label="关闭定时播放面板" class="size-8 inline-flex items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/10 cursor-pointer transition-colors" @click="close">
          <LucideX class="size-4" />
        </button>
      </div>

      <div class="p-6 space-y-5">
        <div v-if="active" class="rounded-xl bg-white/5 p-4 text-center">
          <p class="text-xs text-white/50 mb-2">
            定时播放已开启
          </p>
          <p class="text-xl font-semibold tabular-nums text-blue-400" role="status">
            {{ statusLabel }}
          </p>
          <p class="mt-2 text-xs text-white/50">
            {{ player.sleepTimer.mode === 'duration' ? '暂停和缓冲期间仍会计时' : '播放结束或手动切歌均计一首' }}
          </p>
        </div>

        <div v-if="active && !editing" class="flex gap-3">
          <button type="button" class="flex-1 rounded-xl bg-white/10 px-4 py-2.5 text-sm hover:bg-white/20 cursor-pointer transition-colors" @click="player.cancelSleepTimer()">
            取消定时
          </button>
          <button type="button" class="flex-1 rounded-xl bg-blue-500/90 px-4 py-2.5 text-sm hover:bg-blue-600 cursor-pointer transition-colors" @click="editing = true">
            重新设置
          </button>
        </div>

        <form v-else class="space-y-5" @submit.prevent="start">
          <div class="flex gap-1 rounded-xl bg-white/5 p-1" role="group" aria-label="定时播放模式">
            <button
              v-for="option in [{ value: 'duration' as const, label: '播放时长' }, { value: 'songs' as const, label: '歌曲数量' }]"
              :key="option.value"
              type="button"
              :aria-pressed="settings.mode === option.value"
              class="flex-1 rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors"
              :class="settings.mode === option.value ? 'bg-blue-500/90 text-white' : 'text-white/60 hover:bg-white/10 hover:text-white'"
              @click="settings.mode = option.value"
            >
              {{ option.label }}
            </button>
          </div>

          <template v-if="settings.mode === 'duration'">
            <div>
              <label for="sleep-timer-minutes" class="flex items-center justify-between mb-3 text-sm">
                <span>播放时长</span>
                <span class="text-blue-400 tabular-nums">{{ settings.minutes }} 分钟</span>
              </label>
              <input id="sleep-timer-minutes" v-model.number="settings.minutes" type="range" min="5" max="120" step="5" class="w-full accent-blue-400 cursor-pointer" :aria-valuetext="`${settings.minutes} 分钟`">
              <div class="flex justify-between mt-1 text-xs text-white/40">
                <span>5 分钟</span>
                <span>120 分钟</span>
              </div>
            </div>
            <label class="flex items-center gap-3 text-sm cursor-pointer">
              <input v-model="settings.finishCurrentSong" type="checkbox" class="size-4 accent-blue-400 cursor-pointer">
              播放完最后一首歌曲
            </label>
            <p class="text-xs leading-relaxed text-white/50">
              {{ settings.finishCurrentSong ? '到时后播放完当前歌曲再暂停；等待期间手动切歌会立即暂停。' : '从开启时持续倒计时，到时立即暂停播放。' }}
            </p>
          </template>

          <template v-else>
            <div>
              <label for="sleep-timer-songs" class="block mb-3 text-sm">播放歌曲数量</label>
              <div class="flex items-center gap-3">
                <button type="button" aria-label="减少歌曲数量" :disabled="settings.songs <= 1" class="size-10 rounded-xl bg-white/10 inline-flex items-center justify-center hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors" @click="settings.songs = Math.max(1, settings.songs - 1)">
                  <LucideMinus class="size-4" />
                </button>
                <input id="sleep-timer-songs" v-model.number="settings.songs" type="number" min="1" max="50" step="1" required class="min-w-0 flex-1 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-center tabular-nums outline-none focus:border-blue-400" @blur="normalizeSettings">
                <button type="button" aria-label="增加歌曲数量" :disabled="settings.songs >= 50" class="size-10 rounded-xl bg-white/10 inline-flex items-center justify-center hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors" @click="settings.songs = Math.min(50, settings.songs + 1)">
                  <LucidePlus class="size-4" />
                </button>
              </div>
            </div>
            <p class="text-xs leading-relaxed text-white/50">
              从当前歌曲开始，播放结束或手动切歌均计一首；单曲循环每播完一次计一首。
            </p>
          </template>

          <div class="flex gap-3">
            <button v-if="active" type="button" class="flex-1 rounded-xl bg-white/10 px-4 py-2.5 text-sm hover:bg-white/20 cursor-pointer transition-colors" @click="editing = false">
              返回
            </button>
            <button type="submit" class="flex-1 rounded-xl bg-blue-500/90 px-4 py-2.5 text-sm hover:bg-blue-600 cursor-pointer transition-colors">
              {{ active ? '重新开始' : '开启定时' }}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  </Teleport>
</template>

<style scoped>
.sleep-timer-dialog {
  color-scheme: dark;
}

.sleep-timer-dialog::backdrop {
  background: rgb(0 0 0 / 50%);
  backdrop-filter: blur(4px);
}
</style>
