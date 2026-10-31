<script setup lang="ts">
import type { AnalysisKeyword, AnalysisSegment } from '@/types/song-analysis'
import { autoUpdate, flip, offset, shift, useFloating } from '@floating-ui/vue'
import { t } from '@/i18n'
import { formatAnalysisTime } from '@/utils/analysis'

const props = defineProps<{ segments: AnalysisSegment[], selected?: number }>()
const emit = defineEmits<{ select: [index: number] }>()
const reference = shallowRef<HTMLElement | null>(null)
const floating = useTemplateRef<HTMLElement>('floating')
const active = ref<number | null>(null)
const hovered = computed(() => active.value === null ? null : props.segments[active.value])
const tooltipId = useId()
const open = computed(() => !!hovered.value)
const minimumSegmentWidth = 88
const minimumTimelineWidth = computed(() => props.segments.length * minimumSegmentWidth + Math.max(0, props.segments.length - 1) * 2)
const timelineStyle = computed(() => ({
  gridTemplateColumns: props.segments.map(segment => `minmax(${minimumSegmentWidth}px, ${segment.end_seconds - segment.start_seconds}fr)`).join(' '),
}))
const { floatingStyles } = useFloating(reference, floating, {
  placement: 'top',
  strategy: 'fixed',
  middleware: [offset(8), flip(), shift({ padding: 12 })],
  open,
  whileElementsMounted: autoUpdate,
})
function primaryKeywords(items: AnalysisKeyword[]) {
  const primary = items.filter(item => item.type === 'primary')
  return (primary.length ? primary : items.slice(0, 1)).map(item => item.keyword).join(' · ')
}
function show(event: Event, index: number) {
  reference.value = event.currentTarget as HTMLElement
  active.value = index
}
function leave(event: MouseEvent) {
  if (event.currentTarget !== document.activeElement)
    active.value = null
}
function select(index: number) {
  active.value = null
  emit('select', index)
}
</script>

<template>
  <div>
    <div class="overflow-x-auto pointer-events-auto pb-1">
      <div :style="{ minWidth: `${minimumTimelineWidth}px` }">
        <div class="grid gap-0.5" :style="timelineStyle" :aria-label="t('SongAnalysis.timeline')" @keydown.esc.stop="active = null">
          <button
            v-for="(segment, index) in segments" :key="segment.start_seconds"
            type="button"
            class="relative min-w-0 overflow-hidden rounded-md px-2 py-2 text-left transition-colors hover:bg-black/10 dark:hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-inset"
            :class="selected === index ? 'bg-black/10 dark:bg-white/10' : 'bg-black/5 dark:bg-white/5'"
            :aria-label="`${formatAnalysisTime(segment.start_seconds)} – ${formatAnalysisTime(segment.end_seconds)} · ${primaryKeywords(segment.mood_keywords)} · ${primaryKeywords(segment.style_keywords)}`"
            :aria-describedby="active === index ? tooltipId : undefined"
            :aria-pressed="selected === undefined ? undefined : selected === index"
            @mouseenter="show($event, index)" @mouseleave="leave"
            @focus="show($event, index)" @blur="active = null"
            @click.stop="select(index)"
          >
            <span class="block truncate text-xs" :class="selected === index ? 'font-semibold' : 'font-medium'">{{ primaryKeywords(segment.mood_keywords) }}</span>
            <span class="mt-1 block truncate text-[11px] text-gray-500 dark:text-gray-400">{{ primaryKeywords(segment.style_keywords) }}</span>
            <span v-if="selected === index" aria-hidden="true" class="absolute bottom-0 inset-x-0 h-0.5 rounded-full bg-blue-500 dark:bg-blue-400" />
          </button>
        </div>
        <div class="relative mt-1.5 grid gap-0.5 h-4 text-[11px] text-gray-500 dark:text-gray-400 tabular-nums" :style="timelineStyle">
          <div v-for="(segment, index) in segments" :key="segment.start_seconds" class="relative min-w-0">
            <span
              class="absolute top-0 whitespace-nowrap"
              :class="index === 0 ? 'left-0' : '-left-px -translate-x-1/2'"
            >{{ formatAnalysisTime(segment.start_seconds, 'seconds') }}</span>
          </div>
          <span class="absolute right-0 top-0 whitespace-nowrap">
            {{ formatAnalysisTime(segments.at(-1)?.end_seconds ?? 0, 'seconds') }}
          </span>
        </div>
      </div>
    </div>
    <Teleport to="body">
      <Transition name="analysis-tooltip">
        <div
          v-if="hovered" :id="tooltipId" ref="floating" role="tooltip"
          :style="floatingStyles"
          class="z-[1100] pointer-events-none w-80 max-w-[calc(100vw-24px)] rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[var(--theme-surface)] p-4 text-sm text-gray-900 dark:text-gray-100 shadow-xl"
        >
          <div class="mb-2 text-xs text-gray-500 dark:text-gray-400 tabular-nums">
            {{ formatAnalysisTime(hovered.start_seconds) }} – {{ formatAnalysisTime(hovered.end_seconds) }}
          </div>
          <p class="leading-relaxed">
            {{ hovered.summary }}
          </p>
          <SongAnalysisKeywords class="mt-3" :keywords="hovered.style_keywords" :label="t('SongAnalysis.style')" />
          <SongAnalysisKeywords class="mt-2" :keywords="hovered.mood_keywords" :label="t('SongAnalysis.mood')" />
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.analysis-tooltip-enter-active,
.analysis-tooltip-leave-active {
  transition: opacity 0.15s ease;
}

.analysis-tooltip-enter-from,
.analysis-tooltip-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .analysis-tooltip-enter-active,
  .analysis-tooltip-leave-active {
    transition: none;
  }
}
</style>
