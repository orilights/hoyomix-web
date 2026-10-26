<script setup lang="ts">
import { useSongTagsQuery } from '@/composables/queries'
import { usePageSeo } from '@/composables/usePageSeo'
import { useMainStore } from '@/store/main'
import { groupSongTags } from '@/types/song-tag'

const { data, isPending, isError, refetch } = useSongTagsQuery()
const tagGroups = computed(() => groupSongTags(data.value ?? []))
usePageSeo({ title: '标签', path: '/tags', description: '按标签查找歌曲' })
onMounted(() => useMainStore().setBackground())
</script>

<template>
  <div class="max-w-4xl mx-auto space-y-6">
    <PageHeader title="标签" />
    <div v-if="isPending" class="py-16 text-center text-gray-400">
      加载中...
    </div>
    <div v-else-if="isError" class="py-16 text-center space-y-3">
      <p class="text-red-400">
        标签加载失败
      </p>
      <AppButton @click="refetch()">
        重试
      </AppButton>
    </div>
    <p v-else-if="!data?.length" class="py-12 text-center text-gray-400">
      暂无标签
    </p>
    <template v-else>
      <section v-for="group in tagGroups" :key="group.value" class="space-y-3">
        <h2 class="font-bold">
          {{ group.label }}
        </h2>
        <div class="flex flex-wrap gap-2">
          <RouterLink
            v-for="tag in group.tags"
            :key="tag.id"
            :to="{ name: 'SongTagDetail', params: { code: tag.code } }"
            class="inline-flex items-center gap-3 px-3 py-2 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 hover:dark:bg-white/10 transition-colors"
          >
            <span>{{ tag.name }}</span>
            <span v-if="!tag.enabled" class="text-xs text-gray-400">已停用</span>
            <span class="text-sm text-gray-500 tabular-nums">{{ tag.songCount ?? 0 }}</span>
          </RouterLink>
          <p v-if="!group.tags.length" class="text-sm text-gray-400">
            暂无标签
          </p>
        </div>
      </section>
    </template>
  </div>
</template>
