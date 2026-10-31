<script setup lang="ts">
import type { Emoticon } from '@/types/emoticon'
import { autoUpdate, flip, offset, shift, size, useFloating } from '@floating-ui/vue'
import { useEmoticonsQuery } from '@/composables/queries'
import { useRecentEmoticons } from '@/composables/useRecentEmoticons'
import { t } from '@/i18n'
import { emoticonInsertion } from '@/utils/emoticons'

const props = defineProps<{ disabled?: boolean }>()
const emit = defineEmits<{ select: [text: string, onInserted: () => void] }>()
const isOpen = ref(false)
const trigger = useTemplateRef<HTMLElement>('trigger')
const panel = useTemplateRef<HTMLElement>('panel')
const { data, isPending, isError, isFetching, refetch } = useEmoticonsQuery(isOpen)
const groups = computed(() => (data.value ?? []).filter(group => group.emoticons.length > 0))
const selectedId = ref('')
const recentTabId = '__recent__'
const isRecent = computed(() => selectedId.value === recentTabId)
const group = computed(() => isRecent.value ? undefined : groups.value.find(item => item.id === selectedId.value) ?? groups.value[0])
const { recentIds, record } = useRecentEmoticons()
const itemEntries = computed(() => new Map(groups.value.flatMap(group => group.emoticons.map(item => [item.id, { group, item }] as const))))
const visibleItems = computed(() => isRecent.value
  ? recentIds.value.flatMap(id => itemEntries.value.get(id)?.item ?? [])
  : group.value?.emoticons ?? [])
const failedImages = ref(new Set<string>())
const failedCovers = ref(new Set<string>())
const panelId = useId()
const previewId = useId()
const previewItem = ref<Emoticon>()
const previewTarget = shallowRef<HTMLElement>()
const previewPanel = useTemplateRef<HTMLElement>('previewPanel')
const previewOpen = computed(() => isOpen.value && !!previewItem.value)
const failedPreviews = ref(new Set<string>())
let previewTimer: ReturnType<typeof setTimeout> | undefined
const { floatingStyles: previewStyles, isPositioned: previewPositioned } = useFloating(previewTarget, previewPanel, {
  placement: 'top',
  strategy: 'fixed',
  open: previewOpen,
  whileElementsMounted: autoUpdate,
  middleware: [offset(8), flip({ padding: 8 }), shift({ padding: 8 })],
})
function closePreview() {
  clearTimeout(previewTimer)
  previewTimer = undefined
  previewItem.value = undefined
  previewTarget.value = undefined
}
function showPreview(item: Emoticon, event: PointerEvent | FocusEvent) {
  closePreview()
  if (item.type !== 'image' || props.disabled || !isOpen.value || ('pointerType' in event && event.pointerType === 'touch'))
    return
  const target = event.currentTarget as HTMLElement
  previewTimer = setTimeout(() => {
    previewItem.value = item
    previewTarget.value = target
  }, 150)
}
watch(selectedId, closePreview)
watch(groups, (value) => {
  closePreview()
  if (!isRecent.value && !value.some(group => group.id === selectedId.value))
    selectedId.value = value[0]?.id ?? ''
}, { immediate: true })
watch(() => props.disabled, (value) => {
  if (value)
    close()
})
const { floatingStyles } = useFloating(trigger, panel, {
  placement: 'bottom-start',
  strategy: 'fixed',
  open: isOpen,
  whileElementsMounted: autoUpdate,
  middleware: [offset(6), flip(), shift({ padding: 8 }), size({
    padding: 8,
    apply({ availableHeight, availableWidth, elements }) {
      elements.floating.style.maxHeight = `${Math.max(0, availableHeight)}px`
      elements.floating.style.maxWidth = `${Math.max(0, availableWidth)}px`
    },
  })],
})
function close() {
  closePreview()
  isOpen.value = false
}
async function toggle(event: MouseEvent) {
  if (!props.disabled) {
    isOpen.value = !isOpen.value
    if (isOpen.value && event.detail === 0) {
      await nextTick()
      panel.value?.querySelector<HTMLButtonElement>('button')?.focus()
    }
  }
}
function select(item: Emoticon) {
  const entry = itemEntries.value.get(item.id)
  if (entry && !props.disabled) {
    closePreview()
    emit('select', emoticonInsertion(entry.group, item), () => record(item.id))
  }
}
function outsideClick(event: MouseEvent) {
  const path = event.composedPath()
  if (!path.includes(trigger.value!) && !path.includes(panel.value!))
    close()
}
function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    close()
    trigger.value?.focus()
  }
}
watch(isOpen, (open) => {
  if (open) {
    document.addEventListener('click', outsideClick, true)
    document.addEventListener('keydown', onKeydown)
  }
  else {
    document.removeEventListener('click', outsideClick, true)
    document.removeEventListener('keydown', onKeydown)
  }
}, { flush: 'sync' })
onBeforeUnmount(() => {
  closePreview()
  document.removeEventListener('click', outsideClick, true)
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <button
    ref="trigger"
    type="button"
    :title="t('EmoticonPicker.insert_emoticon')"
    :aria-label="t('EmoticonPicker.insert_emoticon')"
    aria-haspopup="dialog"
    :aria-controls="panelId"
    :aria-expanded="isOpen"
    :disabled="disabled"
    class="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
    @click="toggle"
  >
    <LucideSmile class="size-4.5" />
  </button>
  <Teleport to="body">
    <Transition name="emoticon-panel">
      <div
        v-if="isOpen"
        :id="panelId"
        ref="panel"
        role="dialog"
        :aria-label="t('EmoticonPicker.choose_an_emoticon')"
        class="emoticon-panel z-[1001] flex w-88 flex-col overflow-hidden rounded-xl border border-gray-200/80 dark:border-gray-700/80 bg-white/95 dark:bg-[var(--theme-surface)]/95 text-gray-700 dark:text-gray-200 shadow-lg backdrop-blur-xl"
        :style="floatingStyles"
        @scroll.capture="closePreview"
      >
        <div class="flex shrink-0 items-center justify-between border-b border-black/5 dark:border-white/5 px-3 py-2">
          <span class="text-xs font-medium">{{ isRecent ? t('EmoticonPicker.recently_used') : group?.name ?? t('EmoticonPicker.emoticons') }}</span>
          <AppButton size="xs" icon-only variant="ghost" :title="t('EmoticonPicker.close_emoticon_picker')" :aria-label="t('EmoticonPicker.close_emoticon_picker')" @click="close">
            <LucideX class="size-4" />
          </AppButton>
        </div>
        <div class="min-h-0 overflow-y-auto overscroll-contain p-2" style="height: 240px">
          <AsyncFade>
            <div v-if="isError" class="flex h-full flex-col items-center justify-center gap-2 text-sm text-gray-400">
              <span>{{ t('EmoticonPicker.failed_to_load_emoticons') }}</span>
              <AppButton size="sm" variant="ghost" :disabled="isFetching" @click="refetch()">
                {{ t('App.retry') }}
              </AppButton>
            </div>
            <div v-else-if="isPending" role="status" class="flex h-full items-center justify-center gap-2 text-sm text-gray-400">
              <LucideLoader2 class="size-4 animate-spin" />{{ t('EmoticonPicker.loading_emoticons') }}
            </div>
            <div v-else-if="!visibleItems.length" class="flex h-full items-center justify-center text-sm text-gray-400">
              {{ isRecent ? t('EmoticonPicker.no_recently_used_emoticons') : t('EmoticonPicker.no_emoticons_available') }}
            </div>
            <div v-else class="flex flex-wrap content-start gap-1">
              <button
                v-for="item in visibleItems"
                :key="item.id"
                type="button"
                :title="item.type === 'image' ? undefined : item.name"
                :aria-label="item.name"
                :aria-describedby="previewItem?.id === item.id ? previewId : undefined"
                class="flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 cursor-pointer"
                :class="item.type === 'image' ? 'h-12' : item.type === 'kaomoji' ? 'min-h-9 max-w-full px-2 py-1 text-sm whitespace-pre-wrap break-words' : 'size-9 text-2xl'"
                :style="item.type === 'image' ? { width: 'calc((100% - 20px) / 6)' } : undefined"
                @mousedown.prevent
                @pointerenter="showPreview(item, $event)"
                @pointerleave="closePreview"
                @focus="showPreview(item, $event)"
                @blur="closePreview"
                @click="select(item)"
              >
                <EmoticonImage v-if="item.type === 'image' && !failedImages.has(item.value)" :src="item.value" :alt="item.name" :enabled="isOpen" class="size-10 max-w-full object-contain" @error="failedImages = new Set([...failedImages, item.value])" />
                <span v-else-if="item.type === 'image'" class="text-xs text-gray-400">{{ item.name }}</span>
                <template v-else>
                  {{ item.value }}
                </template>
              </button>
            </div>
          </AsyncFade>
        </div>
        <div class="flex shrink-0 gap-1 overflow-x-auto overscroll-contain border-t border-black/5 dark:border-white/5 bg-black/2 dark:bg-white/3 p-1.5" :aria-label="t('EmoticonPicker.emoticon_groups')">
          <button
            type="button"
            :title="t('EmoticonPicker.recently_used')"
            :aria-label="t('EmoticonPicker.recently_used')"
            :aria-pressed="isRecent"
            class="flex min-h-9 shrink-0 items-center justify-center rounded-lg px-2 text-xs hover:bg-black/5 dark:hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 cursor-pointer"
            :class="isRecent ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : ''"
            @mousedown.prevent
            @click="selectedId = recentTabId"
          >
            <LucideHistory class="size-6" />
          </button>
          <button
            v-for="item in groups"
            :key="item.id"
            type="button"
            :title="item.name"
            :aria-label="item.name"
            :aria-pressed="group?.id === item.id"
            class="flex min-h-9 shrink-0 items-center justify-center rounded-lg px-2 text-xs hover:bg-black/5 dark:hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 cursor-pointer"
            :class="group?.id === item.id ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : ''"
            @mousedown.prevent
            @click="selectedId = item.id"
          >
            <span v-if="item.cover && item.coverType && item.coverType !== 'image'" class="max-w-40 whitespace-pre-wrap break-words" :class="item.coverType === 'emoji' ? 'text-2xl' : ''">{{ item.cover }}</span>
            <EmoticonImage v-else-if="item.cover && !failedCovers.has(item.cover)" :src="item.cover" :alt="item.name" :enabled="isOpen" class="size-6 object-contain" @error="failedCovers = new Set([...failedCovers, item.cover!])" />
            <template v-else>
              {{ item.name }}
            </template>
          </button>
        </div>
      </div>
    </Transition>
    <div
      v-if="previewOpen && previewItem"
      :id="previewId"
      ref="previewPanel"
      role="tooltip"
      class="pointer-events-none z-[1002] w-38 max-w-[calc(100vw-16px)] rounded-xl border border-gray-200/80 dark:border-gray-700/80 bg-white/95 dark:bg-[var(--theme-surface)]/95 p-3 text-gray-700 dark:text-gray-200 shadow-lg backdrop-blur-xl"
      :style="[previewStyles, { visibility: previewPositioned ? 'visible' : 'hidden' }]"
    >
      <div class="flex size-32 items-center justify-center">
        <EmoticonImage
          v-if="previewPositioned && !failedPreviews.has(previewItem.value) && !failedImages.has(previewItem.value)"
          :key="previewItem.value"
          :src="previewItem.value"
          :alt="previewItem.name"
          :enabled="previewOpen"
          width="128"
          height="128"
          class="size-32 object-contain"
          @error="failedPreviews = new Set([...failedPreviews, previewItem!.value])"
        />
        <LucideImageOff v-else-if="failedPreviews.has(previewItem.value) || failedImages.has(previewItem.value)" class="size-8 text-gray-400" />
      </div>
      <p class="mt-2 whitespace-pre-wrap break-words text-center text-xs leading-relaxed">
        {{ previewItem.name }}
      </p>
    </div>
  </Teleport>
</template>

<style scoped>
.emoticon-panel-enter-active,
.emoticon-panel-leave-active {
  transition: opacity 0.15s ease;
}
.emoticon-panel-enter-from,
.emoticon-panel-leave-to {
  opacity: 0;
}
</style>
