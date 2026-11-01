<script setup lang="ts">
import type { Component } from 'vue'
import type { ArtistTypeInfo } from '@/types/core'
import { AudioLines, Building2, ListMusic, MicVocal, Music2, PenLine, SlidersHorizontal, UsersRound } from '@lucide/vue'
import { useCreditInfoQuery } from '@/composables/queries'
import { formatNumber, t } from '@/i18n'

const props = defineProps<{
  id: number | string
  type: 'album' | 'song' | 'product'
}>()

const id = computed(() => props.id || null)
const type = computed(() => props.type)

const { data: rawData, isLoading, isError } = useCreditInfoQuery(id, type)

type CreditArtist = ArtistTypeInfo[string][number] & { roles: string[] }

const groupIcons: Record<string, Component> = {
  '作曲': Music2,
  '编曲': ListMusic,
  '作词': PenLine,
  '演唱 / 人声': MicVocal,
  '出品': Building2,
  '制作人': SlidersHorizontal,
  '其他': UsersRound,
}

function groupIcon(label: string) {
  return groupIcons[label] ?? AudioLines
}

const priorityGroups = [
  { label: '作曲', roles: ['作曲'] },
  { label: '编曲', roles: ['编曲'] },
  { label: '作词', roles: ['作词'] },
  { label: '演唱 / 人声', roles: ['歌手', '演唱', '人声', '主唱'] },
  { label: '出品', roles: ['出品'] },
  { label: '制作人', roles: ['制作人'] },
]

function mergeArtists(roles: string[]): CreditArtist[] {
  const artists = new Map<string, CreditArtist>()
  for (const role of roles) {
    for (const artist of rawData.value?.[role] ?? []) {
      const existing = artists.get(artist.name)
      if (!existing) {
        artists.set(artist.name, { ...artist, songs: [...(artist.songs ?? [])], roles: [role] })
        continue
      }
      existing.roles.push(role)
      // 同一艺术家的多个人声角色按歌曲去重，数量与悬浮卡保持一致。
      const songs = new Map([...existing.songs, ...(artist.songs ?? [])].map(song => [song.id, song]))
      existing.songs = [...songs.values()]
      if (existing.songCount != null || artist.songCount != null)
        existing.songCount = songs.size || Math.max(existing.songCount ?? 0, artist.songCount ?? 0)
    }
  }
  return [...artists.values()].sort((a, b) => (b.songCount ?? 0) - (a.songCount ?? 0))
}

const displayGroups = computed(() => {
  const groups = priorityGroups.flatMap((group) => {
    const artists = mergeArtists(group.roles)
    return artists.length ? [{ label: group.label, other: false, entries: [{ role: group.label, artists }] }] : []
  })
  const priorityRoles = new Set(priorityGroups.flatMap(group => group.roles))
  const otherEntries = Object.keys(rawData.value ?? {})
    .filter(role => !priorityRoles.has(role))
    .map(role => ({ role, artists: mergeArtists([role]) }))
    .filter(entry => entry.artists.length)
  if (otherEntries.length)
    groups.push({ label: t('ArtistListByType.other'), other: true, entries: otherEntries })
  return groups
})
</script>

<template>
  <AsyncFade>
    <div v-if="isLoading" role="status" class="flex items-center justify-center py-8 text-gray-400">
      <LucideLoader2 class="size-6 animate-spin mr-2" />{{ t('App.loading') }}
    </div>

    <div v-else-if="isError" class="flex items-center justify-center py-8 text-red-400">
      {{ t('ArtistListByType.unable_to_load_refresh_to_try_again') }}
    </div>

    <div v-else class="grid grid-cols-2 gap-2 items-start">
      <section
        v-for="group in displayGroups" :key="group.label"
        :aria-label="group.label"
        class="min-w-0"
        :class="{ 'col-span-2': group.other || group.entries[0]?.artists.length !== 1 }"
      >
        <h3 class="flex items-center gap-2 font-bold mb-2">
          <component :is="groupIcon(group.label)" class="size-4 shrink-0 text-gray-500 dark:text-gray-400" aria-hidden="true" />
          {{ group.label }}
        </h3>
        <div :class="{ 'p-4 bg-black/5 dark:bg-white/5 rounded-xl': group.other }">
          <div v-for="entry in group.entries" :key="entry.role" :class="{ 'pb-1': group.other }">
            <div v-if="group.other" class="font-bold">
              {{ entry.role }}
            </div>
            <div :class="group.other ? 'flex flex-wrap gap-x-2' : entry.artists.length === 1 ? 'grid grid-cols-1 gap-2' : 'grid grid-cols-2 gap-2'">
              <div
                v-for="artist in entry.artists" :key="artist.name"
                class="min-w-0 text-sm break-words [overflow-wrap:anywhere]"
              >
                <ArtistSongsHoverCard
                  v-if="type !== 'song' && artist.songs?.length"
                  :artist-name="artist.name"
                  :role="entry.role"
                  :roles="artist.roles"
                  :context-id="props.id"
                  :context-type="type"
                  :song-count="artist.songCount"
                  :block="!group.other"
                />
                <RouterLink
                  v-else
                  :to="{ name: 'ArtistInfo', params: { name: artist.name } }"
                  :class="!group.other ? 'flex items-center justify-between gap-2 rounded-xl bg-black/5 dark:bg-white/5 px-3 py-2 hover:bg-black/10 hover:dark:bg-white/10 transition-colors' : undefined"
                >
                  <span class="min-w-0">{{ artist.name }}</span>
                  <span v-if="artist.songCount != null" class="mx-1 shrink-0 text-xs text-gray-600 dark:text-gray-400 tabular-nums">{{ formatNumber(artist.songCount) }}</span>
                </RouterLink>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </AsyncFade>
</template>

<style scoped>

</style>
