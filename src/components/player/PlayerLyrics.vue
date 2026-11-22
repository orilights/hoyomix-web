<script setup lang="ts">
import type { LyricLine } from '@/utils'
import { useResizeObserver } from '@vueuse/core'
import { useWordLyricAnimation } from '@/composables/useWordLyricAnimation'
import { t } from '@/i18n'
import { usePlayerStore } from '@/store/player'
import { animateWordLyricScroll } from '@/utils/lyric-scroll'
import { wordLyricActiveRange, wordLyricScrollIndex, wordLyricSides } from '@/utils/word-lyrics'
import PlayerWordLyricLine from './PlayerWordLyricLine.vue'

const props = defineProps<{
  parsedLyrics: LyricLine[]
  hasTimestamp: boolean
  currentLineIndex: number
  showTranslation: boolean
  controlsOnScrollOnly?: boolean
  fontViewportHeight?: number
  wordLyricAuthors?: string[]
}>()

const emit = defineEmits<{
  seek: [time: number]
  userScroll: []
}>()

const { parsedLyrics, hasTimestamp, currentLineIndex } = toRefs(props)

const player = usePlayerStore()
const { lyricsOffset, lyricsFontSize, lyricsPerspective } = storeToRefs(player)
const perspectiveEnabled = computed(() => hasTimestamp.value && lyricsPerspective.value)

const MIN_FONT_SIZE = 12
const MAX_FONT_SIZE = 32
const FONT_STEP = 4
// 透视纵深：字号恒定，只用 transform 缩放并向视口中心收拢，
// 让层级随滚动位置连续变化，滚动过程中不再触发重排。
// 缩放取抛物线剖面：顶点二阶平坦（没有尖顶），向两侧对称收敛，
// 位置取它的积分（三次曲线），使行距与字号同步收缩；距离按容器高度归一化，
// 曲线形状不随窗口尺寸或页面缩放改变。
const FOCUS_SCALE = 1.35
const EDGE_SCALE = 0.71

function project(distance: number, height: number) {
  const amplitude = FOCUS_SCALE - EDGE_SCALE
  const ratio = distance / height
  return {
    scale: FOCUS_SCALE - amplitude * 4 * ratio * ratio,
    offset: distance * (FOCUS_SCALE - 1) - (amplitude * 4 * distance ** 3) / (3 * height * height),
  }
}

function lineKey(line: LyricLine, index: number) {
  return line.wordLine?.id ?? index
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

// 移动端字号以常态视口为准，透视仍使用实际可视高度。
const viewportHeight = ref(0)
const autoFontSize = computed(() => {
  const height = props.fontViewportHeight ?? viewportHeight.value
  if (!height)
    return lyricsFontSize.value
  return Math.round(lyricsFontSize.value * Math.min(1.6, Math.max(0.85, height / 760)) * 10) / 10
})

// 参与透视的行（含逐字歌词的来源页脚）及其在内容坐标中的中心；布局变化后重测。
let flowElements: HTMLElement[] = []
let flowCenters: number[] = []
let perspectiveFrame = 0

function measureRows() {
  const el = lyricLines.value
  const container = lyricContainer.value
  if (!perspectiveEnabled.value || !el || !container)
    return
  flowElements = [...el.querySelectorAll<HTMLElement>('.lyric-row')]
  // offsetTop/offsetHeight 是布局值，不受已写入的 transform 影响；
  // 扣除容器自身的偏移，换算成容器内容坐标。
  const base = container.offsetTop + container.clientTop
  flowCenters = flowElements.map(row => row.offsetHeight > 0 ? row.offsetTop - base + row.offsetHeight / 2 : -1)
}

// 按到视口中心的距离做投影：越远越小，位置取缩放曲线积分，行距与字号同步收缩。
function applyPerspective() {
  const height = viewportHeight.value
  if (!height || !perspectiveEnabled.value)
    return

  const viewCenter = (lyricContainer.value?.scrollTop ?? 0) + height / 2
  // 抛物线在视口边缘正好收敛到 EDGE_SCALE，只需写入视口内的行。
  const range = height / 2
  for (let i = 0; i < flowElements.length; i++) {
    const center = flowCenters[i]
    if (center === undefined || center < 0)
      continue
    const distance = center - viewCenter
    if (Math.abs(distance) > range)
      continue
    const { scale, offset } = project(distance, height)
    flowElements[i].style.setProperty('--lyric-projection', `translateY(${offset.toFixed(1)}px) scale(${scale.toFixed(3)})`)
  }
}

function schedulePerspective() {
  if (!perspectiveEnabled.value || perspectiveFrame)
    return
  perspectiveFrame = requestAnimationFrame(() => {
    perspectiveFrame = 0
    applyPerspective()
  })
}

const isHovering = ref(false)

// 用户手动滚动检测
const userScrolling = ref(false)
let userScrollTimer: ReturnType<typeof setTimeout> | null = null
let scrollFallbackTimer: ReturnType<typeof setTimeout> | undefined
const SCROLL_PAUSE_DURATION = 3000
const SCROLL_FALLBACK_DURATION = 5000
const SCROLL_DURATION = 600
let cancelScrollAnimation: (() => void) | undefined

useResizeObserver(lyricContainer, () => {
  viewportHeight.value = lyricContainer.value?.clientHeight ?? 0
  // 宽度变化会改变换行与行高，内容高度随之变化，原有 scrollTop 会让当前行偏离中线；
  // 因此任何尺寸变化后都要在新布局上重测、重新居中，再应用投影。
  void nextTick(() => {
    measureRows()
    if (!userScrolling.value)
      scrollToCurrentLine(false)
    applyPerspective()
  })
})

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
  emit('userScroll')
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
  [parsedLyrics, scrollLineIndex, lyricsFontSize, () => props.showTranslation, perspectiveEnabled],
  ([lines, , fontSize, translation, perspective], [previousLines, , previousFontSize, previousTranslation, previousPerspective]) => {
    const contentChanged = lines !== previousLines || fontSize !== previousFontSize || translation !== previousTranslation
    const layoutChanged = contentChanged || perspective !== previousPerspective
    if (layoutChanged)
      measureRows()
    if (contentChanged || !userScrolling.value)
      scrollToCurrentLine(!layoutChanged)
    applyPerspective()
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
      const viewHeight = lyricContainer.value.clientHeight
      const targetTop = currentEl.offsetTop - viewHeight / 2 + currentEl.clientHeight / 2
      if (smooth && reducedMotion.value !== 'reduce') {
        cancelScrollAnimation = animateWordLyricScroll(lyricContainer.value, targetTop, SCROLL_DURATION)
        return
      }
      lyricContainer.value.scrollTop = targetTop
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
  cancelAnimationFrame(perspectiveFrame)
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
        'lyrics-timed': hasTimestamp,
        'lyrics-perspective': perspectiveEnabled,
      }"
      :style="{ 'fontSize': `${autoFontSize}px`, '--lyric-focus': String(FOCUS_SCALE) }"
      @wheel.passive="onWheel"
      @scroll.passive="schedulePerspective"
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
          class="lyric-row px-4 py-[0.5em] transition-colors duration-300 rounded-lg"
          :class="[
            hasDuet ? `lyric-duet-${duetSides[index]}` : '',
            !line.wordLine && index === currentLineIndex ? 'text-white' : 'text-white/40',
            line.time !== null ? 'cursor-pointer hover:bg-white/10' : 'cursor-default',
          ]"
          :role="line.time !== null ? 'button' : undefined"
          :tabindex="line.time !== null ? 0 : undefined"
          @click="onClickLine(line)"
          @keydown.enter.prevent="onClickLine(line)"
          @keydown.space.prevent="onClickLine(line)"
        >
          <component
            :is="line.wordLine ? PlayerWordLyricLine : 'div'"
            v-bind="line.wordLine ? { line: line.wordLine } : {}"
            class="lyric-text"
            :class="{ 'lyric-text-current': !line.wordLine && index === currentLineIndex }"
          >
            <div v-if="!line.wordLine" class="whitespace-pre-line">
              {{ line.text }}
            </div>
            <div
              v-if="showTranslation && line.translation"
              class="mt-[0.1em] whitespace-pre-line transition-colors duration-300 ease-out motion-reduce:transition-none"
              style="font-size: max(0.75em, 9px)"
              :class="line.wordLine ? 'word-translation text-white/30' : index === currentLineIndex ? 'text-white/70' : 'text-white/30'"
            >
              {{ line.translation }}
            </div>
          </component>
        </div>
        <div v-if="wordMode" class="lyric-row px-4 pt-6 pb-2 text-[0.53em] text-white/40 break-words">
          <p>
            <span>{{ t('Settings.word_lyrics_source') }}</span>
            <a href="https://github.com/amll-dev/amll-ttml-db" target="_blank" rel="noopener noreferrer" class="hover:text-white/70 hover:underline">AMLL TTML DataBase</a>
          </p>
          <p v-if="wordLyricAuthors?.length" class="mt-[0.3em]">
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
.lyrics-perspective .lyric-row {
  width: calc(100% / var(--lyric-focus));
  transform: var(--lyric-projection, none);
  transform-origin: 10% center;
}

.lyric-text {
  overflow-wrap: anywhere;
}

/* 保留高亮所需的换行宽度，避免切换高亮时重新换行。 */
.lyrics-timed:not(.lyrics-perspective) .lyric-text {
  --lyric-max-scale: 1.1;
  width: calc(100% / var(--lyric-max-scale));
  transform-origin: left center;
}

.lyrics-timed:not(.lyrics-perspective) .lyric-text.word-background {
  --lyric-max-scale: 1;
}

.lyrics-timed:not(.lyrics-perspective) .lyric-text:is(.lyric-text-current, [data-scale-active]) {
  transform: scale(var(--lyric-max-scale));
}

@media (prefers-reduced-motion: no-preference) {
  .lyrics-timed:not(.lyrics-perspective) .lyric-text {
    transition: transform 600ms ease;
  }

  .lyrics-timed:not(.lyrics-perspective) .word-lyric:not(.word-background, [data-scale-active]) {
    transition-delay: 100ms;
  }
}

.lyric-duet-right {
  text-align: right;
}
.lyrics-timed:not(.lyrics-perspective) .lyric-duet-right > .lyric-text {
  margin-left: auto;
  transform-origin: right center;
}

.word-lyric[data-active='true'] > .word-translation {
  color: rgb(255 255 255 / 70%);
}
.word-background[data-active='true'] > .word-translation {
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

.lyrics-perspective {
  padding-left: clamp(0px, 10%, 120px);
}

@media (max-width: 767px) {
  .lyrics-perspective {
    padding-left: 4%;
  }
}

.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
