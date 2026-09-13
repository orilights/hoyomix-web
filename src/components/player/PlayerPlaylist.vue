<script setup lang="ts">
import { toast } from 'vue-sonner'
import draggable from 'vuedraggable'
import { useAuthStore } from '@/store/auth'
import { usePlayerStore } from '@/store/player'
import { formatDuration, getCoverUrl } from '@/utils'

const player = usePlayerStore()
const auth = useAuthStore()
const { playlist, currentIndex, showPlaylist, isFullscreen } = storeToRefs(player)

const showCreatePlaylistDialog = ref(false)
const showSelectPlaylistDialog = ref(false)

const playlistSongIds = computed(() => playlist.value.map(item => item.songId))

watch(showPlaylist, async (val) => {
  if (val && currentIndex.value >= 0) {
    await nextTick()
    document.querySelector(`[data-playlist-index="${currentIndex.value}"]`)?.scrollIntoView({ block: 'center' })
  }
})

function saveAsNew() {
  if (!auth.requireLogin())
    return
  showCreatePlaylistDialog.value = true
}

function overwriteExisting() {
  if (!auth.requireLogin())
    return
  showSelectPlaylistDialog.value = true
}

function onDragEnd(evt: { oldIndex: number, newIndex: number }) {
  if (evt.oldIndex !== evt.newIndex) {
    player.reorderPlaylist(evt.oldIndex, evt.newIndex)
  }
}

function playSong(index: number) {
  player.playSong(index)
}

function removeSong(index: number) {
  player.removeFromPlaylist(index)
}

function clearAll() {
  player.clearPlaylist()
  showPlaylist.value = false
  toast.success('已清空播放列表')
}
</script>

<template>
  <Transition name="playlist-panel">
    <div
      v-show="showPlaylist"
      class="fixed inset-0 z-80 flex justify-end pb-[72px]"
      @click.self="showPlaylist = false"
    >
      <div
        class="w-full max-w-md h-full backdrop-blur-xl flex flex-col shadow-2xl border-l border-white/10"
        :class="{
          'bg-gray-900/95': !isFullscreen,
          'bg-gray-900/20': isFullscreen,
        }"
        @click.stop
      >
        <div class="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div class="text-white font-bold">
            播放列表
            <span class="text-white/50 text-sm font-normal ml-2">{{ playlist.length }} 首</span>
          </div>
          <div class="flex items-center gap-2">
            <Dropdown
              position="down"
              :options="[
                { label: '保存为新歌单', onClick: saveAsNew },
                { label: '覆盖已有歌单', onClick: overwriteExisting },
              ]"
            >
              <AppButton variant="dark" size="sm">
                <LucideListPlus class="size-4" />
                保存
              </AppButton>
            </Dropdown>
            <AppButton
              variant="dark" size="sm"
              @click="clearAll"
            >
              清空
            </AppButton>
            <AppButton
              icon-only
              size="sm"
              variant="dark"
              aria-label="关闭播放列表"
              @click="showPlaylist = false"
            >
              <LucideX class="size-5" />
            </AppButton>
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
                :data-playlist-index="index"
                class="flex items-center px-4 py-2 hover:bg-white/5 transition-colors group mr-1"
                :class="{ 'bg-white/10': index === currentIndex }"
              >
                <div class="drag-handle cursor-grab active:cursor-grabbing text-white/30 hover:text-white/60 mr-2 shrink-0">
                  <LucideGripVertical class="size-4" />
                </div>

                <LazyImg
                  class="size-10 rounded"
                  :src="getCoverUrl(element.albumPlatforms, '128px')"
                />

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

                <AppButton
                  icon-only
                  size="xs"
                  variant="dark"
                  class="text-white/30 hover:text-red-400 ml-2 md:opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  aria-label="移除歌曲"
                  @click.stop="removeSong(index)"
                >
                  <LucideX class="size-4" />
                </AppButton>
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

  <CreatePlaylistDialog
    v-model="showCreatePlaylistDialog"
    :initial-song-ids="playlistSongIds"
  />

  <SelectPlaylistDialog
    v-model="showSelectPlaylistDialog"
    :song-ids="playlistSongIds"
    mode="overwrite"
  />
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
