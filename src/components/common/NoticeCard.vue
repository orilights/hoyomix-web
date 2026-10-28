<script setup lang="ts">
import { useDocumentVisibility, useIntervalFn } from '@vueuse/core'
import { useNoticeQuery } from '@/composables/queries'
import { useNoticeStore } from '@/store/notice'
import { formatNoticeDate } from '@/utils/notice'

const { data, isPending, isError, refetch } = useNoticeQuery()
const noticeStore = useNoticeStore()
const activeIndex = ref(0)
const hovered = ref(false)
const focused = ref(false)
const visibility = useDocumentVisibility()
const notices = computed(() => data.value ?? [])
const current = computed(() => notices.value[activeIndex.value])
const canRotate = computed(() => notices.value.length > 1 && !hovered.value && !focused.value && !noticeStore.visible && visibility.value === 'visible')
const { pause, resume } = useIntervalFn(() => {
  activeIndex.value = (activeIndex.value + 1) % notices.value.length
}, 5000, { immediate: false })

watch(canRotate, value => value ? resume() : pause(), { immediate: true })
watch(data, () => {
  activeIndex.value = 0
})

function changeNotice(offset: number) {
  activeIndex.value = (activeIndex.value + offset + notices.value.length) % notices.value.length
  pause()
  if (canRotate.value)
    resume()
}

function onFocusOut(event: FocusEvent) {
  focused.value = event.relatedTarget instanceof Node && (event.currentTarget as HTMLElement).contains(event.relatedTarget)
}
</script>

<template>
  <section v-if="isPending || notices.length || isError" class="mb-6" aria-label="公告" @mouseenter="hovered = true" @mouseleave="hovered = false" @focusin="focused = true" @focusout="onFocusOut">
    <AsyncFade>
      <div v-if="isPending" class="flex items-center justify-center gap-2 p-4 text-sm text-gray-400" role="status">
        <LucideLoader2 class="size-4 animate-spin" />
        加载中...
      </div>
      <div v-else-if="current" class="bg-black/5 dark:bg-white/5 rounded-xl overflow-hidden">
        <div class="grid grid-cols-1">
          <button
            v-for="(notice, index) in notices"
            :key="`${notice.key}-${index}`"
            type="button"
            class="[grid-area:1/1] min-w-0 w-full flex items-center gap-3 p-4 text-left hover:bg-black/5 dark:hover:bg-white/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-400"
            :class="{ invisible: index !== activeIndex }"
            :inert="index !== activeIndex"
            :aria-hidden="index !== activeIndex"
            @click="noticeStore.open(notices, index)"
          >
            <LucideMegaphone class="size-5 text-blue-500 dark:text-blue-400 shrink-0" />
            <div class="flex-1 min-w-0">
              <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h2 class="font-semibold break-words [overflow-wrap:anywhere] line-clamp-2">
                  {{ notice.title }}
                </h2>
                <time v-if="notice.publishedAt" :datetime="notice.publishedAt" class="text-xs text-gray-500 dark:text-gray-400">{{ formatNoticeDate(notice.publishedAt) }}</time>
              </div>
              <p v-if="notice.summary" class="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2 break-words [overflow-wrap:anywhere]">
                {{ notice.summary }}
              </p>
            </div>
            <LucideChevronRight class="size-5 text-gray-400 shrink-0" />
          </button>
        </div>
        <div v-if="notices.length > 1" class="flex items-center justify-end gap-2 px-4 pb-3">
          <AppButton size="sm" variant="ghost" icon-only aria-label="上一条公告" @click="changeNotice(-1)">
            <LucideChevronLeft class="size-4" />
          </AppButton>
          <span class="text-xs text-gray-500 dark:text-gray-400 tabular-nums" aria-live="off">{{ activeIndex + 1 }} / {{ notices.length }}</span>
          <AppButton size="sm" variant="ghost" icon-only aria-label="下一条公告" @click="changeNotice(1)">
            <LucideChevronRight class="size-4" />
          </AppButton>
        </div>
      </div>
      <div v-else class="flex items-center gap-3 p-4 bg-black/5 dark:bg-white/5 rounded-xl text-sm text-gray-500 dark:text-gray-400">
        公告加载失败
        <AppButton size="sm" variant="ghost" @click="refetch()">
          重试
        </AppButton>
      </div>
    </AsyncFade>
  </section>
</template>
