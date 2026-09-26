<script setup lang="ts">
import { autoUpdate, flip, offset, shift, useFloating } from '@floating-ui/vue'
import { useId } from 'vue'
import { useArtistInfoQuery } from '@/composables/queries'
import { useMainStore } from '@/store/main'

const props = defineProps<{
  artistName: string
  role: string
  contextId: number | string
  contextType: 'album' | 'product'
  songCount: number
}>()

const route = useRoute()
const { albumList } = storeToRefs(useMainStore())
const isOpen = ref(false)
const trigger = useTemplateRef<HTMLElement>('trigger')
const card = useTemplateRef<HTMLElement>('card')
const cardId = useId()
const queryName = computed(() => isOpen.value ? props.artistName : null)
const { data: artist, isLoading, isError, refetch } = useArtistInfoQuery(queryName)

const songs = computed(() => {
  const filtered = (artist.value?.songs ?? []).filter(song =>
    song.roles.includes(props.role)
    && (props.contextType === 'album'
      ? song.albumId === Number(props.contextId)
      : song.productName === props.contextId),
  )
  if (props.contextType === 'album')
    return filtered.sort((a, b) => a.albumIndex - b.albumIndex)

  const dates = new Map(albumList.value.map(album => [album.id, album.publishDate]))
  return filtered.sort((a, b) =>
    (dates.get(b.albumId) ?? '').localeCompare(dates.get(a.albumId) ?? '')
    || a.albumIndex - b.albumIndex,
  )
})

const { floatingStyles } = useFloating(trigger, card, {
  placement: 'right-start',
  middleware: [offset(6), flip({ fallbackPlacements: ['left-start', 'bottom-start', 'top-start'], crossAxis: false }), shift({ padding: 8, crossAxis: true })],
  strategy: 'fixed',
  open: isOpen,
  whileElementsMounted: autoUpdate,
})

let closeTimer: ReturnType<typeof setTimeout> | undefined
let hoverTimer: ReturnType<typeof setTimeout> | undefined
const lastPointerType = ref('')

function cancelHover() {
  if (hoverTimer)
    clearTimeout(hoverTimer)
  hoverTimer = undefined
}

function cancelClose() {
  if (closeTimer)
    clearTimeout(closeTimer)
  closeTimer = undefined
}

function openCard() {
  cancelHover()
  cancelClose()
  isOpen.value = true
}

function closeCard() {
  cancelHover()
  cancelClose()
  isOpen.value = false
}

function onTriggerPointerEnter(event: PointerEvent) {
  if (event.pointerType === 'touch')
    return
  cancelClose()
  if (isOpen.value)
    return
  cancelHover()
  hoverTimer = setTimeout(openCard, 500)
}

function onTriggerPointerLeave(event: PointerEvent) {
  if (event.pointerType === 'touch')
    return
  cancelHover()
  if (isOpen.value)
    scheduleClose()
}

function scheduleClose() {
  cancelClose()
  closeTimer = setTimeout(() => {
    const focused = document.activeElement
    if (!trigger.value?.contains(focused) && !card.value?.contains(focused))
      isOpen.value = false
  }, 150)
}

function onTriggerClick(event: MouseEvent, navigate: (event: MouseEvent) => void) {
  if (event.detail !== 0 && (lastPointerType.value === 'touch' || window.matchMedia('(hover: none)').matches)) {
    event.preventDefault()
    openCard()
  }
  else {
    navigate(event)
  }
}

function onDocumentPointerDown(event: PointerEvent) {
  const target = event.target as Node
  if (!trigger.value?.contains(target) && !card.value?.contains(target))
    closeCard()
}

function onDocumentKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape')
    return
  event.stopPropagation()
  trigger.value?.querySelector('a')?.focus()
  closeCard()
}

async function focusCard() {
  openCard()
  await nextTick()
  card.value?.focus()
}

watch(isOpen, (open) => {
  if (open) {
    document.addEventListener('pointerdown', onDocumentPointerDown, true)
    document.addEventListener('keydown', onDocumentKeydown, true)
  }
  else {
    document.removeEventListener('pointerdown', onDocumentPointerDown, true)
    document.removeEventListener('keydown', onDocumentKeydown, true)
  }
})

watch(() => [route.fullPath, props.artistName, props.role, props.contextId, props.contextType], closeCard)

onBeforeUnmount(() => {
  cancelHover()
  cancelClose()
  document.removeEventListener('pointerdown', onDocumentPointerDown, true)
  document.removeEventListener('keydown', onDocumentKeydown, true)
})
</script>

<template>
  <span ref="trigger" class="inline-flex">
    <RouterLink v-slot="{ href, navigate }" :to="{ name: 'ArtistInfo', params: { name: artistName } }" custom>
      <a
        :href="href"
        :aria-controls="cardId"
        :aria-expanded="isOpen"
        aria-haspopup="dialog"
        @pointerdown="lastPointerType = $event.pointerType"
        @pointerenter="onTriggerPointerEnter"
        @pointerleave="onTriggerPointerLeave"
        @focus="openCard"
        @blur="scheduleClose"
        @keydown.down.stop.prevent="focusCard"
        @click="onTriggerClick($event, navigate)"
      >
        {{ artistName }}
        <span class="text-xs text-gray-600">{{ songCount }}&nbsp;</span>
      </a>
    </RouterLink>
  </span>

  <Teleport to="body">
    <Transition name="artist-songs-card">
      <div
        v-if="isOpen"
        :id="cardId"
        ref="card"
        tabindex="-1"
        role="dialog"
        :aria-label="`${artistName}的${role}歌曲`"
        class="z-1000 w-80 max-w-[calc(100vw-16px)] overflow-hidden rounded-xl bg-white/95 backdrop-blur-xl border border-white/70 shadow-xl p-2 text-sm outline-none"
        :style="floatingStyles"
        @pointerenter="cancelClose"
        @pointerleave="scheduleClose"
        @focusin="cancelClose"
        @focusout="scheduleClose"
      >
        <div class="flex items-center gap-2 px-2 py-1.5">
          <span class="font-medium flex-1 min-w-0 truncate">{{ artistName }} · {{ role }} {{ songCount }}</span>
          <RouterLink
            :to="{ name: 'ArtistInfo', params: { name: artistName } }"
            class="shrink-0 text-blue-600 hover:text-blue-700"
            @click="closeCard"
          >
            查看全部
          </RouterLink>
        </div>

        <div v-if="isLoading" class="px-2 py-5 text-center text-gray-500">
          加载中...
        </div>
        <div v-else-if="isError" class="px-2 py-5 text-center text-gray-500">
          加载失败
          <button class="ml-1 text-blue-600 cursor-pointer" @click="refetch()">
            重试
          </button>
        </div>
        <div v-else-if="!songs.length" class="px-2 py-5 text-center text-gray-500">
          暂无歌曲
        </div>
        <OverlayScrollbarsComponent
          v-else
          class="max-h-[min(20rem,calc(100dvh-72px))]"
          :options="{ scrollbars: { theme: 'os-theme-custom', autoHide: 'leave', clickScroll: true } }"
        >
          <RouterLink
            v-for="song in songs"
            :key="song.id"
            :to="{ name: 'MusicInfo', params: { albumId: song.albumId, musicId: song.id } }"
            class="block rounded-lg px-2 py-1.5 hover:bg-black/5 transition-colors"
            :title="song.name"
            @click="closeCard"
          >
            <div class="truncate">
              {{ song.name }}
            </div>
            <div v-if="contextType === 'product'" class="truncate text-xs text-gray-500">
              {{ song.albumName }}
            </div>
          </RouterLink>
        </OverlayScrollbarsComponent>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.artist-songs-card-enter-active,
.artist-songs-card-leave-active {
  transition: opacity 0.15s;
}

.artist-songs-card-enter-from,
.artist-songs-card-leave-to {
  opacity: 0;
}
</style>
