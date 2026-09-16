<script setup lang="ts">
import type { OverlayScrollbarsComponentRef } from 'overlayscrollbars-vue'
import { autoUpdate, flip, offset, shift, useFloating } from '@floating-ui/vue'
import { useId } from 'vue'
import { useTagAlbumsQuery } from '@/composables/queries'
import { getCoverUrl } from '@/utils'

const props = defineProps<{
  seriesName: string
  currentAlbumId: number
}>()

const route = useRoute()
const isOpen = ref(false)
const trigger = useTemplateRef<HTMLElement>('trigger')
const card = useTemplateRef<HTMLElement>('card')
const albumList = useTemplateRef<HTMLElement>('albumList')
const scrollbar = useTemplateRef<OverlayScrollbarsComponentRef>('scrollbar')
const cardId = useId()
const seriesName = computed<string | null>(() => props.seriesName)
const { data: albums, isLoading, isError, refetch } = useTagAlbumsQuery('series', seriesName, isOpen)

const sortedAlbums = computed(() => [...(albums.value ?? [])].sort((a, b) => {
  const dateDiff = b.publishDate.localeCompare(a.publishDate)
  return dateDiff || b.id - a.id
}))

const { floatingStyles } = useFloating(trigger, card, {
  placement: 'right-start',
  middleware: [offset(6), flip(), shift({ padding: 8 })],
  strategy: 'fixed',
  open: isOpen,
  whileElementsMounted: autoUpdate,
})

let closeTimer: ReturnType<typeof setTimeout> | undefined
let lastPointerType = ''

function onTriggerPointerDown(event: PointerEvent) {
  lastPointerType = event.pointerType
}

function cancelClose() {
  if (closeTimer)
    clearTimeout(closeTimer)
  closeTimer = undefined
}

function openCard() {
  cancelClose()
  isOpen.value = true
}

function closeCard() {
  cancelClose()
  isOpen.value = false
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
  if (event.detail !== 0 && (lastPointerType === 'touch' || window.matchMedia('(hover: none)').matches)) {
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

watch(() => [route.fullPath, props.seriesName, props.currentAlbumId], closeCard)

async function scrollToCurrentAlbum() {
  await nextTick()
  if (!isOpen.value)
    return

  const viewport = scrollbar.value?.osInstance()?.elements().viewport
  const currentAlbum = albumList.value?.querySelector<HTMLElement>('[data-current-album]')
  if (!viewport || !currentAlbum)
    return

  const viewportRect = viewport.getBoundingClientRect()
  const albumRect = currentAlbum.getBoundingClientRect()
  viewport.scrollTop += albumRect.top - viewportRect.top - (viewportRect.height - albumRect.height) / 2
}

watch([isOpen, isLoading, isError, sortedAlbums], ([open, loading, error]) => {
  if (open && !loading && !error)
    void scrollToCurrentAlbum()
}, { flush: 'post' })

onBeforeUnmount(() => {
  cancelClose()
  document.removeEventListener('pointerdown', onDocumentPointerDown, true)
  document.removeEventListener('keydown', onDocumentKeydown, true)
})
</script>

<template>
  <span ref="trigger" class="inline-flex">
    <RouterLink
      v-slot="{ href, navigate }"
      :to="{ name: 'AlbumSeries', params: { seriesName } }"
      custom
    >
      <a
        :href="href"
        :aria-controls="cardId"
        :aria-expanded="isOpen"
        aria-haspopup="dialog"
        class="px-2 py-0.5 bg-black/5 rounded-xl hover:bg-black/10 transition-colors"
        @pointerdown="onTriggerPointerDown"
        @pointerenter="($event.pointerType !== 'touch') && openCard()"
        @pointerleave="($event.pointerType !== 'touch') && scheduleClose()"
        @focus="openCard"
        @blur="scheduleClose"
        @keydown.down.stop.prevent="focusCard"
        @click="onTriggerClick($event, navigate)"
      >
        {{ seriesName }} 系列专辑
      </a>
    </RouterLink>
  </span>

  <Teleport to="body">
    <Transition name="series-card">
      <div
        v-if="isOpen"
        :id="cardId"
        ref="card"
        tabindex="-1"
        role="dialog"
        :aria-label="`${seriesName} 系列专辑`"
        class="z-1000 w-80 max-w-[calc(100vw-16px)] overflow-hidden rounded-xl bg-white/95 backdrop-blur-xl border border-white/70 shadow-xl p-2 text-sm outline-none"
        :style="floatingStyles"
        @pointerenter="cancelClose"
        @pointerleave="scheduleClose"
        @focusin="cancelClose"
        @focusout="scheduleClose"
      >
        <div class="flex items-center gap-2 px-2 py-1.5">
          <span class="font-medium flex-1 min-w-0 truncate">{{ seriesName }} 系列</span>
          <RouterLink
            :to="{ name: 'AlbumSeries', params: { seriesName } }"
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
        <div v-else-if="!sortedAlbums.length" class="px-2 py-5 text-center text-gray-500">
          暂无系列专辑
        </div>
        <div v-else ref="albumList">
          <OverlayScrollbarsComponent
            ref="scrollbar"
            class="max-h-80"
            :options="{ scrollbars: { theme: 'os-theme-custom', autoHide: 'leave', clickScroll: true } }"
            @os-initialized="scrollToCurrentAlbum"
          >
            <template v-for="album in sortedAlbums" :key="album.id">
              <div
                v-if="album.id === currentAlbumId"
                data-current-album
                class="flex items-center gap-2 rounded-lg p-2 bg-black/5"
                aria-current="page"
              >
                <div class="size-10 shrink-0 rounded-md overflow-hidden">
                  <CoverImage :src="getCoverUrl(album.platforms, '128px')" />
                </div>
                <div class="min-w-0 flex-1">
                  <div class="truncate font-medium">
                    {{ album.name }}
                  </div>
                  <div class="text-xs text-gray-500">
                    {{ album.publishDate }}
                  </div>
                </div>
                <span class="text-xs text-gray-500 shrink-0">当前</span>
              </div>
              <RouterLink
                v-else
                :to="{ name: 'AlbumInfo', params: { id: album.id } }"
                class="flex items-center gap-2 rounded-lg p-2 hover:bg-black/5 transition-colors"
                @click="closeCard"
              >
                <div class="size-10 shrink-0 rounded-md overflow-hidden">
                  <CoverImage :src="getCoverUrl(album.platforms, '128px')" />
                </div>
                <div class="min-w-0 flex-1">
                  <div class="truncate font-medium">
                    {{ album.name }}
                  </div>
                  <div class="text-xs text-gray-500">
                    {{ album.publishDate }}
                  </div>
                </div>
              </RouterLink>
            </template>
          </OverlayScrollbarsComponent>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.series-card-enter-active,
.series-card-leave-active {
  transition: opacity 0.15s;
}

.series-card-enter-from,
.series-card-leave-to {
  opacity: 0;
}
</style>
