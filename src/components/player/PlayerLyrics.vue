<script setup lang="ts">
import type { LyricLine } from '@/utils'
import { usePlayerLyrics } from '@/composables/usePlayerLyrics'
import { usePlayerStore } from '@/store/player'

const props = defineProps<{
  lyricData: string
  lyricTranslation: string
  showTranslation: boolean
  currentTime: number
}>()

const emit = defineEmits<{
  seek: [time: number]
}>()

const player = usePlayerStore()
const { lyricsOffset, lyricsFontSize } = storeToRefs(player)

const MIN_FONT_SIZE = 12
const MAX_FONT_SIZE = 32
const FONT_STEP = 4

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

let touchStartX = 0
let touchStartY = 0
let touchMoved = false
const skipNextClick = ref(false)
function onTouchStart(e: TouchEvent) {
  skipNextClick.value = false
  touchStartX = e.touches[0].clientX
  touchStartY = e.touches[0].clientY
  touchMoved = false
}
function onTouchMove(e: TouchEvent) {
  const deltaX = Math.abs(e.touches[0].clientX - touchStartX)
  const deltaY = Math.abs(e.touches[0].clientY - touchStartY)
  if (Math.max(deltaX, deltaY) > 5) {
    touchMoved = true
    onUserScroll()
  }
}

function onTouchEnd() {
  if (touchMoved)
    skipNextClick.value = true
}

const { parsedLyrics, hasTimestamp, currentLineIndex } = usePlayerLyrics({
  lyricData: () => props.lyricData,
  lyricTranslation: () => props.lyricTranslation,
  currentTime: () => props.currentTime,
  lyricsOffset,
})

watch(parsedLyrics, () => {
  nextTick(() => {
    scrollToCurrentLine(false)
  })
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

function handleChangeFontSize(delta: number) {
  const newSize = lyricsFontSize.value + delta
  if (newSize >= MIN_FONT_SIZE && newSize <= MAX_FONT_SIZE) {
    lyricsFontSize.value = newSize
    nextTick(() => {
      scrollToCurrentLine(false)
    })
  }
}

function onClickLine(line: LyricLine) {
  if (skipNextClick.value) {
    skipNextClick.value = false
    return
  }
  if (line.time === null)
    return
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
      class="lyrics-container h-full overflow-y-auto scrollbar-hide"
      :class="{
        'flex items-center justify-center': parsedLyrics.length === 0,
      }"
      :options="{ scrollbars: undefined }"
      @wheel="onWheel"
      @touchstart="onTouchStart"
      @touchmove="onTouchMove"
      @touchend="onTouchEnd"
      @touchcancel="onTouchEnd"
    >
      <div v-if="parsedLyrics.length === 0" class="text-white/50 text-center">
        暂无歌词
      </div>
      <div v-else :class="{ 'py-[50vh]': hasTimestamp, 'py-[20vh]': !hasTimestamp }">
        <div v-if="!hasTimestamp" class="text-white/80 px-4 py-2">
          当前歌词不支持滚动
        </div>
        <div
          v-for="(line, index) in parsedLyrics"
          :key="index"
          data-lyric-line
          class="px-4 py-2 transition-all duration-300 rounded-lg"
          :class="[
            index === currentLineIndex ? 'text-white font-bold' : 'text-white/40',
            line.time !== null ? 'cursor-pointer hover:bg-white/10' : 'cursor-default',
          ]"
          :style="{ fontSize: `${index === currentLineIndex ? lyricsFontSize + FONT_STEP : lyricsFontSize}px` }"
          @click="onClickLine(line)"
        >
          <div>{{ line.text }}</div>
          <div
            v-if="showTranslation && line.translation"
            class="mt-0.5"
            :class="index === currentLineIndex
              ? 'text-white/70 font-normal'
              : 'text-white/30'"
            :style="{ fontSize: `${index === currentLineIndex ? lyricsFontSize : lyricsFontSize - FONT_STEP}px` }"
          >
            {{ line.translation }}
          </div>
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
            <LucideRotateCcw class="size-4" />
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
            <LucideRotateCw class="size-4" />
          </button>
        </Tooltip>
        <Tooltip
          placement="left"
          align="center"
          content="放大字体"
        >
          <button
            class="w-8 h-8 rounded-full bg-black/40 backdrop-blur text-white/70 hover:text-white hover:bg-white/20 transition-colors flex items-center justify-center text-xs font-medium disabled:opacity-30 disabled:cursor-not-allowed"
            :disabled="lyricsFontSize >= MAX_FONT_SIZE"
            @click="handleChangeFontSize(FONT_STEP)"
          >
            <LucideAArrowUp class="size-4" />
          </button>
        </Tooltip>
        <Tooltip
          placement="left"
          align="center"
          content="缩小字体"
        >
          <button
            class="w-8 h-8 rounded-full bg-black/40 backdrop-blur text-white/70 hover:text-white hover:bg-white/20 transition-colors flex items-center justify-center text-xs font-medium disabled:opacity-30 disabled:cursor-not-allowed"
            :disabled="lyricsFontSize <= MIN_FONT_SIZE"
            @click="handleChangeFontSize(-FONT_STEP)"
          >
            <LucideAArrowDown class="size-4" />
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
</style>
