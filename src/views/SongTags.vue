<script setup lang="ts">
import { useSongTagsQuery } from '@/composables/queries'
import { usePageSeo } from '@/composables/usePageSeo'
import { formatNumber, t } from '@/i18n'
import { useMainStore } from '@/store/main'
import { groupSongTags } from '@/types/song-tag'

const { data, isPending, isError, refetch } = useSongTagsQuery()
const tagGroups = computed(() => groupSongTags(data.value ?? []))
usePageSeo({ title: () => t('DesktopSidebar.tags'), path: '/tags', description: () => t('Home.find_songs_by_tag') })
onMounted(() => useMainStore().setBackground())
</script>

<template>
  <div class="max-w-4xl mx-auto space-y-6">
    <PageHeader :title="t('DesktopSidebar.tags')" />
    <AsyncFade>
      <PageLoading v-if="isPending" />
      <div v-else-if="isError" class="py-16 text-center space-y-3">
        <p class="text-red-400">
          {{ t('SongTagEditDialog.failed_to_load_tags') }}
        </p>
        <AppButton @click="refetch()">
          {{ t('App.retry') }}
        </AppButton>
      </div>
      <p v-else-if="!data?.length" class="py-12 text-center text-gray-400">
        {{ t('SongTags.no_tags') }}
      </p>
      <div v-else class="space-y-6">
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
              <span v-if="!tag.enabled" class="text-xs text-gray-400">{{ t('SongTagEditDialog.disabled') }}</span>
              <span class="text-sm text-gray-500 tabular-nums">{{ formatNumber(tag.songCount ?? 0) }}</span>
            </RouterLink>
            <p v-if="!group.tags.length" class="text-sm text-gray-400">
              {{ t('SongTags.no_tags') }}
            </p>
          </div>
        </section>
      </div>
    </AsyncFade>
  </div>
</template>
