<script setup lang="ts">
import type { LyricLine } from '@/utils'
import { useResizeObserver } from '@vueuse/core'
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

// 播放器可视高度：既驱动字号自适应，也是透视投影的归一化基准。
const viewportHeight = ref(0)
const autoFontSize = computed(() => {
  const height = viewportHeight.value
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
  if (!el || !container)
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
  if (!height || !hasTimestamp.value)
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
    flowElements[i].style.transform = `translateY(${offset.toFixed(1)}px) scale(${scale.toFixed(3)})`
  }
}

function schedulePerspective() {
  if (perspectiveFrame)
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
// 逐字歌词保持原有滚动节奏；普通歌词的自动滚动放慢一些。
const WORD_SCROLL_DURATION = 600
const SCROLL_DURATION = 800
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
    if (layoutChanged)
      measureRows()
    if (layoutChanged || !userScrolling.value)
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
        const duration = wordMode.value ? WORD_SCROLL_DURATION : SCROLL_DURATION
        cancelScrollAnimation = animateWordLyricScroll(lyricContainer.value, targetTop, duration)
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
            index === currentLineIndex ? 'text-white font-bold' : 'text-white/40',
            line.time !== null ? 'cursor-pointer hover:bg-white/10' : 'cursor-default',
          ]"
          :role="line.time !== null ? 'button' : undefined"
          :tabindex="line.time !== null ? 0 : undefined"
          @click="onClickLine(line)"
          @keydown.enter.prevent="onClickLine(line)"
          @keydown.space.prevent="onClickLine(line)"
        >
          <PlayerWordLyricLine v-if="line.wordLine" :line="line.wordLine" />
          <div v-else class="whitespace-pre-line">
            {{ line.text }}
          </div>
          <div
            v-if="showTranslation && line.translation"
            class="mt-[0.1em] whitespace-pre-line transition-colors duration-300 ease-out motion-reduce:transition-none"
            style="font-size: max(0.75em, 9px)"
            :class="line.wordLine ? 'word-translation text-white/30 font-normal' : index === currentLineIndex
              ? 'text-white/70 font-normal'
              : 'text-white/30'"
          >
            {{ line.translation }}
          </div>
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
/* 行宽按放大倍率预留，长句放大后也不会被容器边界裁切；
   缩放围绕略偏右的竖轴进行，让左端随纵深轻微内收。 */
.lyric-row {
  width: calc(100% / var(--lyric-focus, 1.35));
  transform-origin: 10% center;
}
/* 对唱声部只改变文本对齐：矩形与透视轴与主行完全相同，
   两者的缩放中心和放大轨迹因此完全一致。 */
.lyric-duet-right {
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
  /* 整块歌词放在容器内偏左的中线附近：为放大后的行留出左侧余量，
     宽屏下不再贴左；窄屏（移动端布局）收到 4%，避免挤压文字宽度。 */
  padding-left: clamp(0px, 10%, 120px);
  mask-image: linear-gradient(
    to bottom,
    transparent 0%,
    black 20%,
    black 80%,
    transparent 100%
  );
}

@media (max-width: 767px) {
  .lyrics-container {
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
