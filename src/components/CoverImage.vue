<script setup lang="ts">
import { t } from '@/i18n'

const props = withDefaults(defineProps<{
  src: string
  alt?: string
  previewSrc?: string
}>(), {
  alt: '',
})

const loaded = ref(false)
const failed = ref(false)
const showPreview = ref(false)
const previewLoaded = ref(false)
const previewFailed = ref(false)
const previewAttempt = ref(0)

function resetPreview() {
  previewLoaded.value = false
  previewFailed.value = false
  previewAttempt.value++
}

function openPreview() {
  resetPreview()
  showPreview.value = true
}

watch(() => props.previewSrc, () => {
  showPreview.value = false
})
watch(() => props.src, () => {
  loaded.value = false
  failed.value = false
})
</script>

<template>
  <div class="relative w-full pt-[100%] bg-gray-200 dark:bg-gray-700">
    <img
      v-if="!failed"
      class="absolute top-0 left-0 w-full h-full object-cover transition-opacity duration-300"
      :class="loaded ? 'opacity-100' : 'opacity-0'"
      :src="src"
      :alt="alt"
      loading="lazy"
      @load="loaded = true"
      @error="failed = true"
    >
    <div
      v-else
      class="absolute top-0 left-0 w-full h-full flex items-center justify-center text-gray-400"
    >
      <LucideCloudAlert class="size-8" />
    </div>
    <button
      v-if="previewSrc"
      type="button"
      class="absolute inset-0 cursor-zoom-in rounded-[inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-400"
      :aria-label="t('CoverImage.view_cover', { name: alt })"
      aria-haspopup="dialog"
      @click="openPreview"
    />
    <AppDialog v-if="previewSrc" v-model="showPreview" size="xl" :title="t('CoverImage.cover_preview')" hide-header-border>
      <div class="px-4 pb-4">
        <div class="cover-preview-frame relative mx-auto aspect-square bg-gray-100 dark:bg-white/5">
          <img
            v-if="showPreview && !previewFailed"
            :key="previewAttempt"
            :src="previewSrc"
            :alt="alt"
            class="size-full object-contain"
            :class="{ 'opacity-0': !previewLoaded }"
            @load="previewLoaded = true"
            @error="previewFailed = true"
          >
          <div v-if="previewFailed" class="absolute inset-0 flex flex-col items-center justify-center gap-3 text-gray-500 dark:text-gray-400" role="status">
            <LucideCloudAlert class="size-8" aria-hidden="true" />
            <span>{{ t('CoverImage.failed_to_load_cover') }}</span>
            <AppButton @click="resetPreview">
              {{ t('App.retry') }}
            </AppButton>
          </div>
          <div v-else-if="!previewLoaded" class="absolute inset-0 flex items-center justify-center text-gray-500 dark:text-gray-400" role="status" :aria-label="t('App.loading')">
            <LucideLoader2 class="size-8 animate-spin" aria-hidden="true" />
          </div>
        </div>
      </div>
    </AppDialog>
  </div>
</template>

<style scoped>
.cover-preview-frame {
  width: min(100%, calc(100vh - 132px));
  width: min(100%, calc(100dvh - 132px));
}
</style>
