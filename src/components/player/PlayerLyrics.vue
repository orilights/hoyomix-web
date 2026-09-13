<script setup lang="ts">
import type { Directive } from 'vue'
import type { LyricLine } from '@/utils'
import { usePlayerStore } from '@/store/player'

const props = defineProps<{
  parsedLyrics: LyricLine[]
  hasTimestamp: boolean
  currentLineIndex: number
  showTranslation: boolean
}>()

const emit = defineEmits<{
  seek: [time: number]
}>()

const { parsedLyrics, hasTimestamp, currentLineIndex } = toRefs(props)

const player = usePlayerStore()
const { lyricsOffset, lyricsFontSize } = storeToRefs(player)

const MIN_FONT_SIZE = 12
const MAX_FONT_SIZE = 32
const FONT_STEP = 4

const sizeAnimations = new WeakMap<HTMLElement, Animation>()

// 字号只更新一次以保留最终换行和行高，过渡交给 transform，避免逐帧重排。
// 使用最终字号栅格化，动画结束后恢复原始文字尺寸，不长期保留缩放图层。
const vLyricSize: Directive<HTMLElement, number> = {
  beforeMount(el, { value }) {
    el.style.fontSize = `${value}px`
  },
  beforeUpdate(el, { value, oldValue }) {
    if (value === oldValue || oldValue == null)
      return

    const previousAnimation = sizeAnimations.get(el)
    let previousSize = oldValue
    if (previousAnimation && previousAnimation.playState !== 'finished') {
      // 连续切换时从当前可见尺寸接续，避免回跳到上一次动画起点。
      const transform = getComputedStyle(el).transform
      if (transform !== 'none')
        previousSize *= new DOMMatrixReadOnly(transform).a
    }
    previousAnimation?.cancel()
    el.style.fontSize = `${value}px`

    const animation = el.animate(
      [{ transform: `scale(${previousSize / value})` }, { transform: 'scale(1)' }],
      { duration: 300, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' },
    )
    sizeAnimations.set(el, animation)
    animation.onfinish = () => {
      if (sizeAnimations.get(el) === animation)
        sizeAnimations.delete(el)
    }
  },
  beforeUnmount(el) {
    sizeAnimations.get(el)?.cancel()
    sizeAnimations.delete(el)
  },
}

const lyricContainer = useTemplateRef<HTMLElement>('lyricContainer')
const lyricLines = useTemplateRef<HTMLElement>('lyricLines')
const isHovering = ref(false)

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

// 合并同一轮更新的定位请求，在 DOM 更新后读取布局。
watch(
  [parsedLyrics, currentLineIndex, lyricsFontSize, () => props.showTranslation],
  ([lines, , fontSize, translation], [previousLines, , previousFontSize, previousTranslation]) => {
    const layoutChanged = lines !== previousLines || fontSize !== previousFontSize || translation !== previousTranslation
    if (layoutChanged || !userScrolling.value)
      scrollToCurrentLine(!layoutChanged)
  },
  { flush: 'post' },
)

function scrollToCurrentLine(smooth = true) {
  if (currentLineIndex.value >= 0 && lyricContainer.value) {
    const currentEl = lyricLines.value?.children[currentLineIndex.value] as HTMLElement | undefined
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
  scrollToCurrentLine(false)
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
      @wheel.passive="onWheel"
      @touchstart.passive="onTouchStart"
      @touchmove.passive="onTouchMove"
      @touchend.passive="onTouchEnd"
      @touchcancel.passive="onTouchEnd"
    >
      <div v-if="parsedLyrics.length === 0" class="text-white/50 text-center">
        暂无歌词
      </div>
      <div v-else ref="lyricLines" :class="{ 'py-[50vh]': hasTimestamp, 'py-[20vh]': !hasTimestamp }">
        <div v-if="!hasTimestamp" class="text-white/80 px-4 py-2">
          当前歌词不支持滚动
        </div>
        <div
          v-for="(line, index) in parsedLyrics"
          :key="index"
          v-memo="[line, index === currentLineIndex, lyricsFontSize, showTranslation]"
          data-lyric-line
          class="px-4 py-2 transition-colors duration-300 rounded-lg"
          :class="[
            index === currentLineIndex ? 'text-white font-bold' : 'text-white/40',
            line.time !== null ? 'cursor-pointer hover:bg-white/10' : 'cursor-default',
          ]"
          @click="onClickLine(line)"
        >
          <div
            v-lyric-size="index === currentLineIndex ? lyricsFontSize + FONT_STEP : lyricsFontSize"
            class="origin-top-left"
          >
            {{ line.text }}
          </div>
          <div
            v-if="showTranslation && line.translation"
            v-lyric-size="index === currentLineIndex ? lyricsFontSize : lyricsFontSize - FONT_STEP"
            class="mt-0.5 origin-top-left"
            :class="index === currentLineIndex
              ? 'text-white/70 font-normal'
              : 'text-white/30'"
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
