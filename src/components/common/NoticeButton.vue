<script setup lang="ts">
import { toast } from 'vue-sonner'
import { useNoticeQuery } from '@/composables/queries'
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
      toast.error('公告加载失败')
  }
}
</script>

<template>
  <Tooltip content="公告" placement="bottom" align="center">
    <AppButton icon-only shape="pill" class="relative" :aria-label="hasUnread ? '公告，有未读公告' : '公告'" :aria-busy="isFetching" :disabled="isPending || isFetching || (!isError && !data?.length)" @click="openNotices">
      <LucideMegaphone class="size-4.5" />
      <span v-if="hasUnread" class="absolute -top-0.5 -right-0.5 size-2 bg-red-500 rounded-full ring-2 ring-white dark:ring-[var(--theme-surface)] pointer-events-none" aria-hidden="true" />
    </AppButton>
  </Tooltip>
</template>
