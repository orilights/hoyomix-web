<script setup lang="ts">
import { useEmoticonsQuery } from '@/composables/queries'
import { parseCommentContent } from '@/utils/emoticons'

const props = defineProps<{ content: string }>()
const { data: groups, isError } = useEmoticonsQuery()
const parts = computed(() => parseCommentContent(props.content, isError.value ? [] : groups.value ?? []))
const failed = ref(new Set<string>())
watch(() => props.content, () => {
  failed.value = new Set()
})
function markFailed(url: string) {
  failed.value = new Set([...failed.value, url])
}
</script>

<template>
  <template v-for="(part, index) in parts" :key="index">
    <EmoticonImage
      v-if="part.image && !failed.has(part.image.value)"
      :src="part.image.value"
      :alt="part.text"
      :title="part.image.name"
      width="64"
      height="64"
      class="inline-block size-16 object-contain align-text-bottom"
      @error="markFailed(part.image.value)"
    /><span v-else>{{ part.text }}</span>
  </template>
</template>
