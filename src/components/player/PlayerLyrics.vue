<script setup lang="ts">
import type { LyricLine } from '@/utils'
import { usePlayerStore } from '@/store/player'
import { mergeLyrics } from '@/utils'

const props = defineProps<{
  lyricData: string
  lyricTranslation: string
  showTranslation: boolean
  currentTime: number
}>()

const emit = defineEmits<{
  seek: [time: number]
}>()

const playerStore = usePlayerStore()
const { lyricsOffset } = storeToRefs(playerStore)

const lyricContainer = useTemplateRef<HTMLElement>('lyricContainer')
const isHovering = ref(false)

const isInit = ref(false)

// 用户手动滚动检测
const userScrolling = ref(false)
let userScrollTimer: ReturnType<typeof setTimeout> | null = null
const SCROLL_PAUSE_DURATION = 3000

function onUserScroll() {
  userScrolling.value = true
  if (userScrollTimer)
    clearTimeout(userScrollTimer)
  userScrollTimer = setTimeout(() => {
    userScrolling.value = false
  }, SCROLL_PAUSE_DURATION)
}

function onWheel() {
  onUserScroll()
}

let touchStartY = 0
function onTouchStart(e: TouchEvent) {
  touchStartY = e.touches[0].clientY
}
function onTouchMove(e: TouchEvent) {
  const deltaY = Math.abs(e.touches[0].clientY - touchStartY)
  if (deltaY > 5) {
    onUserScroll()
  }
}

const parsedLyrics = computed<LyricLine[]>(() =>
  mergeLyrics(props.lyricData, props.lyricTranslation),
)

const currentLineIndex = computed(() => {
  const defaultOffset = 0.4

  if (parsedLyrics.value.length === 0)
    return -1

  for (let i = parsedLyrics.value.length - 1; i >= 0; i--) {
    if (props.currentTime + defaultOffset + lyricsOffset.value >= parsedLyrics.value[i].time) {
      return i
    }
  }
  return -1
})

// 自动滚动到当前行
watch(currentLineIndex, () => {
  if (!isInit.value) {
    isInit.value = true
    return
  }
  if (!userScrolling.value) {
    scrollToCurrentLine()
  }
}, { immediate: true })

function scrollToCurrentLine(smooth = true) {
  if (currentLineIndex.value >= 0 && lyricContainer.value) {
    const lines = lyricContainer.value.querySelectorAll('[data-lyric-line]')
    const currentEl = lines[currentLineIndex.value] as HTMLElement
    if (currentEl) {
      const containerHeight = lyricContainer.value.clientHeight
      const targetTop = currentEl.offsetTop - containerHeight / 2 + currentEl.clientHeight / 2
      lyricContainer.value.scrollTo({
        top: targetTop,
        behavior: smooth ? 'smooth' : 'auto',
      })
    }
  }
}

function onClickLine(line: LyricLine) {
  // 点击歌词跳转时重置手动滚动状态
  userScrolling.value = false
  if (userScrollTimer)
    clearTimeout(userScrollTimer)
  emit('seek', line.time)
}

defineExpose({
  scrollToCurrentLine,
})

onMounted(() => {
  scrollToCurrentLine()
})

onUnmounted(() => {
  if (userScrollTimer)
    clearTimeout(userScrollTimer)
})
</script>

<template>
  <div
    class="relative h-full"
    @mouseenter="isHovering = true"
    @mouseleave="isHovering = false"
  >
    <div
      ref="lyricContainer"
      class="lyrics-container h-full overflow-y-auto scrollbar-hide py-[40%]"
      :options="{ scrollbars: undefined }"
      @wheel="onWheel"
      @touchstart="onTouchStart"
      @touchmove="onTouchMove"
    >
      <div v-if="parsedLyrics.length === 0" class="text-white/50 text-center mt-8">
        暂无歌词
      </div>
      <div
        v-for="(line, index) in parsedLyrics"
        :key="index"
        data-lyric-line
        class="px-4 py-2 cursor-pointer transition-all duration-300 rounded-lg hover:bg-white/10"
        :class="index === currentLineIndex
          ? 'text-white text-lg font-bold'
          : 'text-white/40 text-base'"
        @click="onClickLine(line)"
      >
        <div>{{ line.text }}</div>
        <div
          v-if="showTranslation && line.translation"
          class="mt-0.5"
          :class="index === currentLineIndex
            ? 'text-white/70 text-base font-normal'
            : 'text-white/30 text-sm'"
        >
          {{ line.translation }}
        </div>
      </div>
    </div>

    <Transition name="fade">
      <div
        v-show="isHovering || userScrolling"
        class="absolute right-2 bottom-4 flex flex-col gap-1 z-10"
      >
        <Tooltip
          placement="left"
          align="center"
          content="后退 0.2s"
        >
          <button
            class="w-8 h-8 rounded-full bg-black/40 backdrop-blur text-white/70 hover:text-white hover:bg-white/20 transition-colors flex items-center justify-center text-xs font-medium"
            @click="lyricsOffset -= 0.2"
          >
            -
          </button>
        </Tooltip>
        <Tooltip
          placement="left"
          align="center"
          content="重置歌词偏移"
        >
          <button
            class="w-8 h-8 rounded-full bg-black/40 backdrop-blur text-white/70 hover:text-white hover:bg-white/20 transition-colors flex items-center justify-center text-xs font-medium"
            @click="lyricsOffset = 0"
          >
            {{ lyricsOffset.toFixed(1) }}
          </button>
        </Tooltip>
        <Tooltip
          placement="left"
          align="center"
          content="前进 0.2s"
        >
          <button
            class="w-8 h-8 rounded-full bg-black/40 backdrop-blur text-white/70 hover:text-white hover:bg-white/20 transition-colors flex items-center justify-center text-xs font-medium"
            @click="lyricsOffset += 0.2"
          >
            +
          </button>
        </Tooltip>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.lyrics-container {
  mask-image: linear-gradient(
    to bottom,
    transparent 0%,
    black 20%,
    black 80%,
    transparent 100%
  );
}

.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
