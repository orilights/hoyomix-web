<script setup lang="ts">
import type { Directive } from 'vue'
import type { LyricLine } from '@/utils'
import { useWordLyricAnimation } from '@/composables/useWordLyricAnimation'
import { t } from '@/i18n'
import { usePlayerStore } from '@/store/player'
import { animateWordLyricScroll } from '@/utils/lyric-scroll'
import { wordLyricActiveRange, wordLyricScrollIndex, wordLyricSides } from '@/utils/word-lyrics'

const props = defineProps<{
  parsedLyrics: LyricLine[]
  hasTimestamp: boolean
  currentLineIndex: number
  showTranslation: boolean
  controlsOnScrollOnly?: boolean
  wordLyricAuthors?: string[]
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

function lineKey(line: LyricLine, index: number) {
  return line.wordLine?.id ?? index
}

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
const wordMode = computed(() => parsedLyrics.value.some(line => line.wordLine))
const duetSides = computed(() => wordLyricSides(parsedLyrics.value.map((line, index) => line.wordLine ?? { id: String(index), agent: null, backgroundOf: null })))
const hasDuet = computed(() => duetSides.value.includes('right'))
const scrollRanges = computed(() => parsedLyrics.value.map(line => line.wordLine
  ? { ...wordLyricActiveRange(line.wordLine), backgroundOf: line.wordLine.backgroundOf }
  : { start: (line.time ?? 0) * 1000, end: (line.time ?? 0) * 1000, backgroundOf: null }))
const scrollLineIndex = computed(() => wordMode.value
  ? wordLyricScrollIndex(scrollRanges.value, player.currentTime + lyricsOffset.value)
  : currentLineIndex.value >= 0 ? currentLineIndex.value : parsedLyrics.value.findIndex(line => line.time !== null && !!line.text))
const { reducedMotion } = useWordLyricAnimation(lyricContainer, wordMode)
const lyricLines = useTemplateRef<HTMLElement>('lyricLines')
const isHovering = ref(false)

// 用户手动滚动检测
const userScrolling = ref(false)
let userScrollTimer: ReturnType<typeof setTimeout> | null = null
let scrollFallbackTimer: ReturnType<typeof setTimeout> | undefined
const SCROLL_PAUSE_DURATION = 3000
const SCROLL_FALLBACK_DURATION = 5000
let cancelScrollAnimation: (() => void) | undefined

function onUserScroll() {
  cancelScrollAnimation?.()
  userScrolling.value = true
  if (userScrollTimer)
    clearTimeout(userScrollTimer)
  userScrollTimer = setTimeout(() => {
    userScrolling.value = false
  }, SCROLL_PAUSE_DURATION)
  clearTimeout(scrollFallbackTimer)
  scrollFallbackTimer = setTimeout(scrollToCurrentLine, SCROLL_FALLBACK_DURATION)
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
  [parsedLyrics, scrollLineIndex, lyricsFontSize, () => props.showTranslation],
  ([lines, , fontSize, translation], [previousLines, , previousFontSize, previousTranslation]) => {
    const layoutChanged = lines !== previousLines || fontSize !== previousFontSize || translation !== previousTranslation
    if (layoutChanged || !userScrolling.value)
      scrollToCurrentLine(!layoutChanged)
  },
  { flush: 'post' },
)

function scrollToCurrentLine(smooth = true) {
  cancelScrollAnimation?.()
  cancelScrollAnimation = undefined
  if (scrollLineIndex.value >= 0 && lyricContainer.value) {
    const currentEl = lyricLines.value?.children[scrollLineIndex.value] as HTMLElement | undefined
    if (currentEl && parsedLyrics.value[scrollLineIndex.value]?.text) {
      clearTimeout(scrollFallbackTimer)
      const containerHeight = lyricContainer.value.clientHeight
      const targetTop = currentEl.offsetTop - containerHeight / 2 + currentEl.clientHeight / 2
      if (wordMode.value && smooth && reducedMotion.value !== 'reduce') {
        cancelScrollAnimation = animateWordLyricScroll(lyricContainer.value, targetTop)
        return
      }
      lyricContainer.value.scrollTo({
        top: targetTop,
        behavior: smooth && reducedMotion.value !== 'reduce' ? 'smooth' : 'auto',
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

watch(reducedMotion, (value) => {
  if (value === 'reduce') {
    cancelScrollAnimation?.()
    if (!userScrolling.value)
      scrollToCurrentLine(false)
  }
})

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
  const time = line.wordLine ? wordLyricActiveRange(line.wordLine).start / 1000 - lyricsOffset.value : line.time
  emit('seek', Math.max(0, Math.min(time, player.duration || Number.POSITIVE_INFINITY)))
}

defineExpose({
  scrollToCurrentLine,
})

onMounted(() => {
  scrollToCurrentLine(false)
})

onUnmounted(() => {
  cancelScrollAnimation?.()
  if (userScrollTimer)
    clearTimeout(userScrollTimer)
  clearTimeout(scrollFallbackTimer)
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
        {{ t('PlayerFullscreen.no_lyrics') }}
      </div>
      <div v-else ref="lyricLines" :class="{ 'py-[50vh]': hasTimestamp, 'py-[20vh]': !hasTimestamp }">
        <div v-if="!hasTimestamp" class="text-white/80 px-4 py-2">
          {{ t('PlayerFullscreen.these_lyrics_do_not_support_scrolling') }}
        </div>
        <div
          v-for="(line, index) in parsedLyrics"
          v-show="line.text"
          :key="lineKey(line, index)"
          v-memo="[line, index === currentLineIndex, lyricsFontSize, showTranslation, hasDuet, duetSides[index]]"
          data-lyric-line
          class="px-4 py-2 transition-colors duration-300 rounded-lg"
          :class="[
            hasDuet ? `lyric-duet-${duetSides[index]}` : '',
            index === currentLineIndex ? 'text-white font-bold' : 'text-white/40',
            line.time !== null ? 'cursor-pointer hover:bg-white/10' : 'cursor-default',
          ]"
          :role="line.time !== null ? 'button' : undefined"
          :tabindex="line.time !== null ? 0 : undefined"
          @click="onClickLine(line)"
          @keydown.enter.prevent="onClickLine(line)"
          @keydown.space.prevent="onClickLine(line)"
        >
          <PlayerWordLyricLine v-if="line.wordLine" :line="line.wordLine" :style="{ fontSize: `${lyricsFontSize * (line.wordLine.backgroundOf ? 0.85 : 1)}px` }" />
          <div
            v-else
            v-lyric-size="index === currentLineIndex ? lyricsFontSize + FONT_STEP : lyricsFontSize"
            class="origin-top-left whitespace-pre-line"
          >
            {{ line.text }}
          </div>
          <div
            v-if="showTranslation && line.translation"
            v-lyric-size="wordMode ? (lyricsFontSize - FONT_STEP) * (line.wordLine?.backgroundOf ? 0.85 : 1) : index === currentLineIndex ? lyricsFontSize : lyricsFontSize - FONT_STEP"
            class="mt-0.5 origin-top-left whitespace-pre-line transition-colors duration-300 ease-out motion-reduce:transition-none"
            :class="line.wordLine ? 'word-translation text-white/30 font-normal' : index === currentLineIndex
              ? 'text-white/70 font-normal'
              : 'text-white/30'"
          >
            {{ line.translation }}
          </div>
        </div>
        <div v-if="wordMode" class="px-4 pt-6 pb-2 text-sm text-white/40 break-words">
          <p class="flex">
            <span class="shrink-0">{{ t('Settings.word_lyrics_source') }}</span>
            <a href="https://github.com/amll-dev/amll-ttml-db" target="_blank" rel="noopener noreferrer" class="hover:text-white/70 hover:underline">AMLL TTML DataBase</a>
          </p>
          <p v-if="wordLyricAuthors?.length" class="mt-1">
            {{ t('PlayerLyrics.creators', { p0: wordLyricAuthors.join('、') }) }}
          </p>
        </div>
      </div>
    </div>

    <Transition name="fade">
      <div
        v-show="userScrolling || (isHovering && !controlsOnScrollOnly)"
        class="absolute right-2 bottom-4 flex flex-col gap-1 z-10"
      >
        <Tooltip
          placement="left"
          align="center"
          :content="t('PlayerLyrics.back_02s')"
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
          :content="t('PlayerLyrics.reset_lyrics_offset')"
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
          :content="t('PlayerLyrics.forward_02s')"
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
          :content="t('PlayerLyrics.increase_font_size')"
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
          :content="t('PlayerLyrics.decrease_font_size')"
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
.lyric-duet-left {
  width: 90%;
  margin-right: auto;
}
.lyric-duet-right {
  width: 90%;
  margin-left: auto;
  text-align: right;
}
.lyric-duet-right > .word-translation {
  transform-origin: top right;
}

.word-line[data-active='true'] + .word-translation {
  color: rgb(255 255 255 / 70%);
}
.word-background[data-active='true'] + .word-translation {
  color: rgb(255 255 255 / 50%);
}

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
