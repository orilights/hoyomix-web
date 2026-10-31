<script setup lang="ts">
import type { SongAnalysis } from '@/types/song-analysis'
import { t } from '@/i18n'
import { usePlayerStore } from '@/store/player'
import { findAnalysisSegment, formatAnalysisTime } from '@/utils/analysis'

defineOptions({ inheritAttrs: false })

const props = defineProps<{ analysis: SongAnalysis, songId: number }>()
const player = usePlayerStore()
const isCurrentSong = computed(() => player.currentSong?.songId === props.songId)
const currentSegment = computed(() => {
  if (!isCurrentSong.value)
    return undefined
  return findAnalysisSegment(props.analysis.segments, player.currentTime)
})
const visible = ref(false)
const selected = ref<number | undefined>()
const highlighted = computed(() => isCurrentSong.value ? currentSegment.value : selected.value)
const entries = ref<HTMLElement[]>([])
const cardTitleId = useId()
const dialogId = useId()
const primaryStyles = computed(() => props.analysis.style_keywords.filter(item => item.type === 'primary'))
const primaryMoods = computed(() => props.analysis.mood_keywords.filter(item => item.type === 'primary'))
const summaries = computed(() => [
  { title: t('SongAnalysis.style'), keywords: props.analysis.style_keywords, text: props.analysis.style_summary },
  { title: t('SongAnalysis.mood'), keywords: props.analysis.mood_keywords, text: props.analysis.mood_summary },
  { title: t('SongAnalysis.arrangement'), keywords: [], text: props.analysis.arrangement_summary },
])
async function open(index?: number) {
  selected.value = index
  visible.value = true
  await nextTick()
  if (index !== undefined)
    entries.value[index]?.scrollIntoView({ block: 'nearest' })
}
function jump(index: number) {
  selected.value = index
  seekSegment(index)
  entries.value[index]?.scrollIntoView({ block: 'nearest' })
}
function seekSegment(index: number) {
  const segment = props.analysis.segments[index]
  if (isCurrentSong.value && segment)
    player.seek(segment.start_seconds)
}
function selectSegment(index: number) {
  if (isCurrentSong.value)
    seekSegment(index)
  else
    open(index)
}
</script>

<template>
  <section v-bind="$attrs" :aria-labelledby="cardTitleId" class="relative rounded-xl bg-black/5 dark:bg-white/5 p-4 sm:p-5 transition-colors hover:bg-black/8 dark:hover:bg-white/8">
    <button
      type="button" class="absolute inset-0 w-full rounded-xl focus-visible:ring-2 focus-visible:ring-blue-400"
      :aria-label="t('SongAnalysis.view_details')" :aria-describedby="cardTitleId" aria-haspopup="dialog" :aria-controls="dialogId"
      @click="open()"
    />
    <div class="pointer-events-none relative flex flex-wrap items-center justify-between gap-2 mb-4">
      <h3 :id="cardTitleId" class="flex items-center gap-2 font-semibold">
        <LucideSparkles class="size-4 text-blue-500" />{{ t('SongAnalysis.title') }}
        <span class="rounded-md bg-blue-500/10 px-1.5 py-0.5 text-xs font-medium text-blue-600 dark:text-blue-400">Beta</span>
      </h3>
      <span class="text-xs text-gray-500 dark:text-gray-400">{{ t('SongAnalysis.disclaimer') }}</span>
    </div>
    <div class="pointer-events-none relative space-y-2">
      <SongAnalysisKeywords :keywords="primaryStyles" :label="t('SongAnalysis.style')" />
      <SongAnalysisKeywords :keywords="primaryMoods" :label="t('SongAnalysis.mood')" />
    </div>
    <SongAnalysisTimeline class="relative mt-4 pointer-events-none [&_button]:pointer-events-auto" :segments="analysis.segments" :selected="currentSegment" @select="selectSegment" />
  </section>

  <AppDialog v-model="visible" :title="t('SongAnalysis.title')" size="xl">
    <template #title>
      <span class="flex items-center gap-2">
        {{ t('SongAnalysis.title') }}
        <span class="rounded-md bg-blue-500/10 px-1.5 py-0.5 text-xs font-medium text-blue-600 dark:text-blue-400">Beta</span>
      </span>
    </template>
    <div :id="dialogId" class="max-h-[75dvh] overflow-y-auto p-4 sm:p-6 space-y-6 text-sm">
      <section class="rounded-xl bg-black/5 dark:bg-white/5 p-4">
        <h3 class="font-semibold mb-2">
          {{ t('SongAnalysis.overall') }}
        </h3>
        <p class="leading-relaxed whitespace-pre-line">
          {{ analysis.content_summary }}
        </p>
      </section>
      <section v-for="summary in summaries" :key="summary.title">
        <h3 class="font-semibold mb-2">
          {{ summary.title }}
        </h3>
        <SongAnalysisKeywords v-if="summary.keywords.length" class="mb-2" :keywords="summary.keywords" label="" />
        <p class="leading-relaxed whitespace-pre-line">
          {{ summary.text }}
        </p>
      </section>
      <section class="border-t border-black/5 dark:border-white/10 pt-5">
        <h3 class="font-semibold mb-3">
          {{ t('SongAnalysis.segments') }}
        </h3>
        <SongAnalysisTimeline :segments="analysis.segments" :selected="highlighted" @select="jump" />
        <article
          v-for="(segment, index) in analysis.segments" :key="segment.start_seconds" ref="entries"
          class="grid gap-2 sm:grid-cols-[110px_minmax(0,1fr)] sm:gap-4 py-5 border-b border-black/5 dark:border-white/10 scroll-mt-4"
        >
          <div class="text-xs tabular-nums" :class="highlighted === index ? 'text-blue-500' : 'text-gray-500 dark:text-gray-400'">
            {{ formatAnalysisTime(segment.start_seconds) }} – {{ formatAnalysisTime(segment.end_seconds) }}
          </div>
          <div class="min-w-0">
            <p class="leading-relaxed whitespace-pre-line">
              {{ segment.summary }}
            </p>
            <SongAnalysisKeywords class="mt-3" :keywords="segment.style_keywords" :label="t('SongAnalysis.style')" />
            <SongAnalysisKeywords class="mt-2" :keywords="segment.mood_keywords" :label="t('SongAnalysis.mood')" />
          </div>
        </article>
      </section>
      <p class="text-xs text-gray-500 dark:text-gray-400">
        {{ t('SongAnalysis.disclaimer') }}
      </p>
    </div>
  </AppDialog>
</template>
