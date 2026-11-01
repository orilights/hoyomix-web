<script setup lang="ts">
import { useMediaQuery } from '@vueuse/core'
import { toast } from 'vue-sonner'
import draggable from 'vuedraggable'
import { t } from '@/i18n'
import { useAuthStore } from '@/store/auth'
import { usePlayerStore } from '@/store/player'
import { formatDuration, getCoverUrl } from '@/utils'
import { getShuffleQueueIds } from '@/utils/shuffle'

const player = usePlayerStore()
const auth = useAuthStore()
const { playlist, currentIndex, showPlaylist, isFullscreen, playMode, shuffleState } = storeToRefs(player)
const isShuffle = computed(() => playMode.value === 'shuffle')
const displayedPlaylist = computed(() => {
  const entries = playlist.value.map((song, index) => ({ song, index, key: `${song.songId}:${index}` }))
  if (!isShuffle.value)
    return entries
  const byId = new Map(entries.map(entry => [entry.song.songId, entry]))
  const current = entries[currentIndex.value]
  if (current)
    byId.set(current.song.songId, current)
  return getShuffleQueueIds(shuffleState.value, player.currentSong?.songId)
    .flatMap(id => byId.has(id) ? [byId.get(id)!] : [])
})

const showCreatePlaylistDialog = ref(false)
const showSelectPlaylistDialog = ref(false)
const isMobileViewport = useMediaQuery('(max-width: 767px)')
const queuePanel = useTemplateRef<HTMLElement>('queuePanel')
let dragOffset = 0
let dragStartOffset = 0
let headerPointerId: number | null = null
let headerPointerTarget: HTMLElement | null = null
let headerPointerStart: { x: number, y: number } | null = null
let dragDirection: 'pending' | 'vertical' = 'pending'

function setDragOffset(offset: number) {
  dragOffset = offset
  // Keep per-frame movement out of Vue's render cycle and the draggable song list.
  queuePanel.value?.style.setProperty('--queue-drag-offset', `${offset}px`)
}

function releaseHeaderPointer() {
  const pointerId = headerPointerId
  const target = headerPointerTarget
  headerPointerId = null
  headerPointerTarget = null
  headerPointerStart = null
  queuePanel.value?.classList.remove('queue-header-dragging')
  if (pointerId !== null && target?.hasPointerCapture(pointerId))
    target.releasePointerCapture(pointerId)
}

function cancelHeaderDrag() {
  releaseHeaderPointer()
  setDragOffset(0)
}

function onHeaderPointerDown(event: PointerEvent) {
  if (!isMobileViewport.value || event.pointerType === 'mouse')
    return
  if (!event.isPrimary) {
    cancelHeaderDrag()
    return
  }
  if ((event.target as Element).closest('button, a, input, [role="button"]'))
    return
  const panel = queuePanel.value
  if (!panel)
    return
  // A new grab interrupts a rebound at its visible position, not its target (0px).
  const transform = getComputedStyle(panel).transform
  dragStartOffset = transform === 'none' ? 0 : Math.max(0, new DOMMatrixReadOnly(transform).m42)
  panel.classList.add('queue-header-dragging')
  setDragOffset(dragStartOffset)
  headerPointerStart = { x: event.clientX, y: event.clientY }
  headerPointerId = event.pointerId
  headerPointerTarget = event.currentTarget as HTMLElement
  dragDirection = 'pending'
  headerPointerTarget.setPointerCapture(event.pointerId)
}

function onHeaderPointerMove(event: PointerEvent) {
  if (event.pointerId !== headerPointerId || !headerPointerStart)
    return
  const deltaX = event.clientX - headerPointerStart.x
  const deltaY = event.clientY - headerPointerStart.y
  if (dragDirection === 'pending') {
    if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < 8)
      return
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      cancelHeaderDrag()
      return
    }
    dragDirection = 'vertical'
  }
  setDragOffset(Math.max(0, dragStartOffset + deltaY))
}

function onHeaderPointerUp(event: PointerEvent) {
  if (event.pointerId !== headerPointerId)
    return
  releaseHeaderPointer()
  if (dragDirection === 'vertical' && dragOffset > 80)
    showPlaylist.value = false
  else
    setDragOffset(0)
}

function onHeaderPointerCancel(event: PointerEvent) {
  if (event.pointerId === headerPointerId)
    cancelHeaderDrag()
}

watch(isMobileViewport, cancelHeaderDrag)
onBeforeUnmount(releaseHeaderPointer)

const playlistSongIds = computed(() => displayedPlaylist.value.map(entry => entry.song.songId))

watch(showPlaylist, async (val) => {
  if (val)
    cancelHeaderDrag()
  else
    releaseHeaderPointer()
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
  if (!isShuffle.value && evt.oldIndex !== evt.newIndex) {
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
  toast.success(t('PlayerPlaylist.queue_cleared'))
}
</script>

<template>
  <Transition name="playlist-panel">
    <div
      v-show="showPlaylist"
      class="player-queue fixed inset-0 z-80 flex justify-end pb-[72px]"
      @click.self="showPlaylist = false"
    >
      <div
        ref="queuePanel"
        class="w-full max-w-md h-full backdrop-blur-xl flex flex-col shadow-2xl border-l border-white/10"
        :class="{
          'bg-gray-900/95': !isFullscreen,
          'bg-gray-900/20': isFullscreen,
        }"
        @click.stop
      >
        <div
          class="queue-header flex items-center justify-between px-4 py-3 border-b border-white/10"
          @pointerdown="onHeaderPointerDown"
          @pointermove="onHeaderPointerMove"
          @pointerup="onHeaderPointerUp"
          @pointercancel="onHeaderPointerCancel"
          @lostpointercapture="onHeaderPointerCancel"
        >
          <div class="text-white font-bold">
            {{ t('PlayerBar.queue') }}<span class="text-white/50 text-sm font-normal ml-2">{{ t('Random.song', { p0: displayedPlaylist.length }, Number(displayedPlaylist.length)) }}</span>
          </div>
          <div class="flex items-center gap-2">
            <Dropdown
              v-if="!isShuffle"
              position="down"
              :options="[
                { label: t('PlayerPlaylist.save_as_a_new_playlist'), onClick: saveAsNew },
                { label: t('PlayerPlaylist.replace_an_existing_playlist'), onClick: overwriteExisting },
              ]"
            >
              <AppButton variant="dark" size="sm">
                <LucideListPlus class="size-4" />{{ t('CommentItem.save') }}
              </AppButton>
            </Dropdown>
            <AppButton
              variant="dark" size="sm"
              @click="clearAll"
            >
              {{ t('AlbumPickerDialog.clear') }}
            </AppButton>
            <AppButton
              icon-only
              size="sm"
              variant="dark"
              :aria-label="t('PlayerPlaylist.close_queue')"
              @click="showPlaylist = false"
            >
              <LucideX class="size-5" />
            </AppButton>
          </div>
        </div>

        <p v-if="isShuffle" class="flex items-center gap-2 px-4 py-2 text-xs text-white/50 border-b border-white/10">
          <LucideShuffle class="size-3.5 shrink-0" />
          {{ t('PlayerPlaylist.shuffled_queue_hint') }}
        </p>

        <OverlayScrollbarsComponent class="flex-1" :options="{ scrollbars: { theme: 'os-theme-custom-light', autoHide: 'leave', clickScroll: true } }" defer>
          <draggable
            :model-value="displayedPlaylist"
            item-key="key"
            handle=".drag-handle"
            :disabled="isShuffle"
            :animation="200"
            @end="onDragEnd"
          >
            <template #item="{ element }">
              <div
                :data-playlist-index="element.index"
                class="flex items-center px-4 py-2 hover:bg-white/5 transition-colors group mr-1"
                :class="{ 'bg-white/10': element.index === currentIndex }"
              >
                <div v-if="!isShuffle" class="drag-handle cursor-grab active:cursor-grabbing text-white/30 hover:text-white/60 mr-2 shrink-0">
                  <LucideGripVertical class="size-4" />
                </div>

                <LazyImg
                  class="size-10 rounded"
                  :src="getCoverUrl(element.song.albumPlatforms, '96px')"
                />

                <div
                  class="flex-1 min-w-0 ml-3 cursor-pointer"
                  @click="playSong(element.index)"
                >
                  <div class="text-sm truncate" :class="element.index === currentIndex ? 'text-blue-400' : 'text-white'">
                    {{ element.song.songName }}
                  </div>
                  <div class="text-xs text-white/40 truncate">
                    {{ element.song.albumName }}
                  </div>
                </div>

                <div class="text-xs text-white/40 ml-2 shrink-0">
                  {{ formatDuration(element.song.duration) }}
                </div>

                <AppButton
                  icon-only
                  size="xs"
                  variant="dark"
                  class="text-white/30 hover:text-red-400 ml-2 md:opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  :aria-label="t('PlayerPlaylist.remove_song')"
                  @click.stop="removeSong(element.index)"
                >
                  <LucideX class="size-4" />
                </AppButton>
              </div>
            </template>
          </draggable>

          <div v-if="playlist.length === 0" class="text-white/30 text-center mt-16">
            {{ t('PlayerPlaylist.the_queue_is_empty') }}
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
@media (max-width: 767px) {
  .player-queue {
    align-items: flex-end;
    padding-bottom: 0;
    background: rgb(0 0 0 / 35%);
  }
  .player-queue > div:last-child {
    width: 100%;
    max-width: none;
    height: 75%;
    max-height: calc(100% - max(16px, env(safe-area-inset-top)));
    padding-bottom: env(safe-area-inset-bottom);
    border-radius: 20px 20px 0 0;
    background: rgb(17 24 39 / 95%);
    transform: translateY(var(--queue-drag-offset, 0px));
    transition: transform 0.3s ease;
  }
  .player-queue > .queue-header-dragging:last-child {
    transition: none;
  }
  .queue-header {
    user-select: none;
    touch-action: none;
  }
  .player-queue.playlist-panel-enter-from > div:last-child,
  .player-queue.playlist-panel-leave-to > div:last-child { transform: translateY(100%); }
}

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
