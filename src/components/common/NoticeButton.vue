<script setup lang="ts">
import { toast } from 'vue-sonner'
import { useNoticeQuery } from '@/composables/queries'
import { t } from '@/i18n'
import { useNoticeStore } from '@/store/notice'

const { data, isPending, isFetching, isError, refetch } = useNoticeQuery()
const noticeStore = useNoticeStore()
const hasUnread = computed(() => data.value?.some(notice => !noticeStore.isRead(notice)) ?? false)

async function openNotices() {
  if (data.value?.length) {
    noticeStore.open(data.value)
    return
  }
  if (isError.value) {
    const result = await refetch()
    if (result.data?.length)
      noticeStore.open(result.data)
    else if (result.isError)
      toast.error(t('NoticeButton.failed_to_load_announcements'))
  }
}
</script>

<template>
  <Tooltip :content="t('notice.announcements')" placement="bottom" align="center">
    <AppButton icon-only shape="pill" class="relative" :aria-label="hasUnread ? t('NoticeButton.announcements_unread_announcements_available') : t('notice.announcements')" :aria-busy="isFetching" :disabled="isPending || isFetching || (!isError && !data?.length)" @click="openNotices">
      <LucideMegaphone class="size-4.5" />
      <span v-if="hasUnread" class="absolute -top-0.5 -right-0.5 size-2 bg-red-500 rounded-full ring-2 ring-white dark:ring-[var(--theme-surface)] pointer-events-none" aria-hidden="true" />
    </AppButton>
  </Tooltip>
</template>
