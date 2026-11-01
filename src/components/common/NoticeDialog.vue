<script setup lang="ts">
import { useNoticeQuery } from '@/composables/queries'
import { t } from '@/i18n'
import { useNoticeStore } from '@/store/notice'
import { formatNoticeDate } from '@/utils/notice'

const { data } = useNoticeQuery()
const noticeStore = useNoticeStore()
const { notices, current, currentIndex, visible } = storeToRefs(noticeStore)
const contentPanel = useTemplateRef<HTMLElement>('contentPanel')

watch(data, (items) => {
  if (items)
    noticeStore.showImportant(items)
}, { immediate: true })
watch(currentIndex, () => {
  contentPanel.value?.scrollTo({ top: 0 })
}, { flush: 'post' })
</script>

<template>
  <AppDialog v-model="visible" :title="t('notice.announcements')" size="xl">
    <div v-if="current" class="flex h-[65vh] min-h-0 overflow-hidden">
      <nav v-if="notices.length > 1" :aria-label="t('NoticeDialog.announcement_list')" class="w-[calc(8em+3rem)] text-xs sm:text-sm shrink-0 overflow-y-auto overscroll-contain border-r border-gray-100 dark:border-gray-700 p-2 space-y-1">
        <button v-for="(notice, index) in notices" :key="`${notice.key}-${index}`" type="button" :aria-current="index === currentIndex ? 'page' : undefined" class="flex items-start gap-2 w-full p-2 rounded-lg text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400" :class="index === currentIndex ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5'" @click="noticeStore.select(index)">
          <span class="flex-1 min-w-0 break-words [overflow-wrap:anywhere]">{{ notice.defaultTitle ? t('notice.announcements') : notice.title }}</span>
          <span v-if="!noticeStore.isRead(notice)" class="mt-1 size-1.5 shrink-0 rounded-full bg-red-500" role="status" :aria-label="t('NoticeDialog.unread_announcements')" />
        </button>
      </nav>
      <article ref="contentPanel" class="flex-1 min-w-0 p-4 sm:p-6 overflow-y-auto overscroll-contain">
        <h3 class="text-lg font-semibold mb-3 break-words [overflow-wrap:anywhere]">
          {{ current.defaultTitle ? t('notice.announcements') : current.title }}
        </h3>
        <time v-if="current.publishedAt" :datetime="current.publishedAt" class="block mb-4 text-xs text-gray-500 dark:text-gray-400">{{ t('NoticeDialog.published_on', { p0: formatNoticeDate(current.publishedAt) }) }}</time>
        <MarkdownContent :content="current.content" />
      </article>
    </div>
  </AppDialog>
</template>
