<script setup lang="ts">
import draggable from 'vuedraggable'
import { usePlayerStore } from '@/store/player'
import { formatDuration, getCoverUrl } from '@/utils'

const playerStore = usePlayerStore()
const { playlist, currentIndex, showPlaylist } = storeToRefs(playerStore)

function onDragEnd(evt: { oldIndex: number, newIndex: number }) {
  if (evt.oldIndex !== evt.newIndex) {
    playerStore.reorderPlaylist(evt.oldIndex, evt.newIndex)
  }
}

function playSong(index: number) {
  playerStore.playSong(index)
}

function removeSong(index: number) {
  playerStore.removeFromPlaylist(index)
}

function clearAll() {
  playerStore.clearPlaylist()
  showPlaylist.value = false
}
</script>

<template>
  <Transition name="playlist-panel">
    <div
      v-if="showPlaylist"
      class="fixed inset-0 z-80 flex justify-end pb-[72px]"
      @click.self="showPlaylist = false"
    >
      <div class="w-full max-w-md h-full bg-gray-900/95 backdrop-blur-xl flex flex-col shadow-2xl" @click.stop>
        <div class="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div class="text-white font-bold">
            播放列表
            <span class="text-white/50 text-sm font-normal ml-2">{{ playlist.length }} 首</span>
          </div>
          <div class="flex items-center gap-2">
            <button
              class="text-white/60 hover:text-white text-sm px-2 py-1 rounded hover:bg-white/10 transition-colors cursor-pointer"
              @click="clearAll"
            >
              清空
            </button>
            <button
              class="text-white/60 hover:text-white p-1.5 rounded hover:bg-white/10 transition-colors cursor-pointer"
              @click="showPlaylist = false"
            >
              <LucideX class="size-5" />
            </button>
          </div>
        </div>

        <OverlayScrollbarsComponent class="flex-1" :options="{ scrollbars: { theme: 'os-theme-custom-light', autoHide: 'leave', clickScroll: true } }" defer>
          <draggable
            :model-value="playlist"
            item-key="songId"
            handle=".drag-handle"
            :animation="200"
            @end="onDragEnd"
          >
            <template #item="{ element, index }">
              <div
                class="flex items-center px-4 py-2 hover:bg-white/5 transition-colors group mr-1"
                :class="{ 'bg-white/10': index === currentIndex }"
              >
                <div class="drag-handle cursor-grab active:cursor-grabbing text-white/30 hover:text-white/60 mr-2 shrink-0">
                  <LucideGripVertical class="size-4" />
                </div>

                <img
                  :src="getCoverUrl(element.albumPlatforms, '128px')"
                  class="size-10 rounded object-cover shrink-0"
                  loading="lazy"
                >

                <div
                  class="flex-1 min-w-0 ml-3 cursor-pointer"
                  @click="playSong(index)"
                >
                  <div class="text-sm truncate" :class="index === currentIndex ? 'text-blue-400' : 'text-white'">
                    {{ element.songName }}
                  </div>
                  <div class="text-xs text-white/40 truncate">
                    {{ element.albumName }}
                  </div>
                </div>

                <div class="text-xs text-white/40 ml-2 shrink-0">
                  {{ formatDuration(element.duration) }}
                </div>

                <button
                  class="text-white/30 hover:text-red-400 ml-2 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shrink-0"
                  @click.stop="removeSong(index)"
                >
                  <LucideX class="size-4" />
                </button>
              </div>
            </template>
          </draggable>

          <div v-if="playlist.length === 0" class="text-white/30 text-center mt-16">
            播放列表为空
          </div>
        </OverlayScrollbarsComponent>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.playlist-panel-enter-active,
.playlist-panel-leave-active {
  transition: all 0.3s ease;
}
.playlist-panel-enter-active > div:last-child,
.playlist-panel-leave-active > div:last-child {
  transition: transform 0.3s ease;
}

.playlist-panel-enter-from,
.playlist-panel-leave-to {
  background-color: transparent;
}
.playlist-panel-enter-from > div:last-child,
.playlist-panel-leave-to > div:last-child {
  transform: translateX(100%);
}
</style>
