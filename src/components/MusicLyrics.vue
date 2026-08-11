<script setup lang="ts">
import { toast } from 'vue-sonner'
import { NotFoundError } from '@/api/music'
import { useLyricsQuery } from '@/composables/queries'
import { usePlayerStore } from '@/store/player'
import { mergeLyrics } from '@/utils'

const props = defineProps<{
  lyricProvider: 'ncm' | 'qq' | null
  lyricSongId: number | null
  hasNcmPlatform: boolean
  hasQqPlatform: boolean
}>()

const player = usePlayerStore()
const { lyricsSource } = storeToRefs(player)

const providerRef = toRef(props, 'lyricProvider')
const songIdRef = toRef(props, 'lyricSongId')

const { data: lyricsData, isLoading: isLyricsLoading, isError: isLyricsError, error: lyricsError } = useLyricsQuery(providerRef, songIdRef)

const lyricList = computed(() => {
  if (!lyricsData.value)
    return []
  return mergeLyrics(lyricsData.value.content, lyricsData.value.translation ?? '')
})

watch(isLyricsError, (val) => {
  if (!val || lyricsError.value instanceof NotFoundError)
    return
  toast.error(`歌词加载失败：${lyricsError.value?.message ?? '未知错误'}`)
})
</script>

<template>
  <div class="bg-black/5 rounded-xl overflow-hidden p-4">
    <div class="mb-2">
      <div class="flex items-center gap-0.5">
        <button
          class="p-1 rounded transition-colors cursor-pointer"
          :class="lyricsSource === 'ncm' ? 'bg-red-500/10' : hasNcmPlatform ? '' : 'cursor-not-allowed'"
          :disabled="!hasNcmPlatform"
          :title="hasNcmPlatform ? '切换至网易云音乐歌词' : '当前歌曲无网易云音乐数据'"
          @click="player.setLyricsSource('ncm')"
        >
          <IconNcm class="size-5 text-red-500" />
        </button>
        <button
          class="p-1 rounded transition-colors cursor-pointer"
          :class="lyricsSource === 'qq' ? 'bg-[#02B053]/10' : hasQqPlatform ? '' : 'cursor-not-allowed'"
          :disabled="!hasQqPlatform"
          :title="hasQqPlatform ? '切换至QQ音乐歌词' : '当前歌曲无QQ音乐数据'"
          @click="player.setLyricsSource('qq')"
        >
          <IconQQ class="size-5" />
        </button>
      </div>
    </div>
    <AsyncFade>
      <div v-if="!lyricProvider" class="text-gray-400 text-sm text-center py-4">
        暂无数据
      </div>
      <div v-else-if="isLyricsLoading" class="flex items-center justify-center py-4 text-gray-400">
        <LucideLoader2 class="size-4 animate-spin mr-1" />
        加载中...
      </div>
      <div v-else>
        <div v-if="lyricList.length === 0" class="text-gray-400 text-sm text-center py-4">
          暂无数据
        </div>
        <div v-for="line, index in lyricList" v-else :key="index" class="my-1">
          <span>{{ line.text }}</span>
          <span v-if="line.translation" class="text-gray-500 ml-2">/ {{ line.translation }}</span>
        </div>
      </div>
    </AsyncFade>
  </div>
</template>
