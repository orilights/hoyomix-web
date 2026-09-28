<script setup lang="ts">
import { usePageScroll } from '@/composables/usePageScroll'
import { useSongLocator } from '@/composables/useSongLocator'
import { useMainStore } from '@/store/main'
import { usePlayerStore } from '@/store/player'

const route = useRoute()
const store = useMainStore()
const player = usePlayerStore()

const { scrollY, scrollPageToTop } = usePageScroll()
const { showSearch } = storeToRefs(store)
const { isFullscreen, showPlaylist } = storeToRefs(player)
const { isCurrentSongInList, locateCurrentSong } = useSongLocator()

const overlayVisible = computed(() => isFullscreen.value || showPlaylist.value || showSearch.value)

const showBackToTop = computed(() =>
  !overlayVisible.value
  && !!route.meta.showScrollToTop
  && scrollY.value > 400,
)

const showLocate = computed(() => !overlayVisible.value && isCurrentSongInList.value)

function backToTop() {
  scrollPageToTop('smooth')
}

const buttonClass = 'size-11 rounded-full inline-flex items-center justify-center cursor-pointer bg-white/70 backdrop-blur-xl border border-white/70 shadow-lg text-gray-600 hover:text-gray-900 hover:bg-white/90 transition-colors focus-visible:ring-2 focus-visible:ring-blue-400/60'
</script>

<template>
  <div class="fixed right-4 bottom-22 z-40 flex flex-col items-end gap-2">
    <Transition name="fade">
      <div v-if="showLocate">
        <Tooltip content="定位到当前播放歌曲" placement="left" align="center">
          <button :class="buttonClass" type="button" aria-label="定位到当前播放歌曲" @click="locateCurrentSong">
            <LucideLocateFixed class="size-5" />
          </button>
        </Tooltip>
      </div>
    </Transition>

    <Transition name="fade">
      <div v-if="showBackToTop">
        <Tooltip content="返回顶部" placement="left" align="center">
          <button :class="buttonClass" type="button" aria-label="返回顶部" @click="backToTop">
            <LucideArrowUp class="size-5" />
          </button>
        </Tooltip>
      </div>
    </Transition>
  </div>
</template>
