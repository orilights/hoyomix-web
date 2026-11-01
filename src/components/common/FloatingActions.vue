<script setup lang="ts">
import { usePageScroll } from '@/composables/usePageScroll'
import { useSongLocator } from '@/composables/useSongLocator'
import { t } from '@/i18n'
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

const buttonClass = 'size-11 rounded-full inline-flex items-center justify-center cursor-pointer bg-white/70 dark:bg-[var(--theme-surface)]/70 backdrop-blur-xl border border-white/70 dark:border-gray-700/70 shadow-lg text-gray-600 dark:text-gray-400 hover:text-gray-900 hover:dark:text-gray-100 hover:bg-white/90 hover:dark:bg-[var(--theme-surface)]/90 transition-colors focus-visible:ring-2 focus-visible:ring-blue-400/60'
</script>

<template>
  <div class="fixed right-4 bottom-22 z-40 flex flex-col items-end gap-2">
    <Transition name="fade">
      <div v-if="showLocate">
        <Tooltip :content="t('FloatingActions.go_to_the_current_song')" placement="left" align="center">
          <button :class="buttonClass" type="button" :aria-label="t('FloatingActions.go_to_the_current_song')" @click="locateCurrentSong">
            <LucideLocateFixed class="size-5" />
          </button>
        </Tooltip>
      </div>
    </Transition>

    <Transition name="fade">
      <div v-if="showBackToTop">
        <Tooltip :content="t('FloatingActions.back_to_top')" placement="left" align="center">
          <button :class="buttonClass" type="button" :aria-label="t('FloatingActions.back_to_top')" @click="backToTop">
            <LucideArrowUp class="size-5" />
          </button>
        </Tooltip>
      </div>
    </Transition>
  </div>
</template>
