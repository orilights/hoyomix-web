<script setup lang="ts">
import { renderMarkdown } from '@/utils/markdown'

const props = defineProps<{ content: string }>()
const html = computed(() => renderMarkdown(props.content))
</script>

<template>
  <div class="markdown-content text-sm leading-7 break-words [overflow-wrap:anywhere]" v-html="html" />
</template>

<style scoped>
.markdown-content :deep(> :first-child) { margin-top: 0; }
.markdown-content :deep(> :last-child) { margin-bottom: 0; }
.markdown-content :deep(p),
.markdown-content :deep(ul),
.markdown-content :deep(ol),
.markdown-content :deep(blockquote),
.markdown-content :deep(pre),
.markdown-content :deep(table) { margin: 1em 0; }
.markdown-content :deep(h1),
.markdown-content :deep(h2),
.markdown-content :deep(h3),
.markdown-content :deep(h4),
.markdown-content :deep(h5),
.markdown-content :deep(h6) { font-weight: 600; margin: 1.4em 0 0.6em; line-height: 1.5; }
.markdown-content :deep(h1) { font-size: 1.5em; }
.markdown-content :deep(h2) { font-size: 1.25em; }
.markdown-content :deep(h3) { font-size: 1.1em; }
.markdown-content :deep(ul) { list-style: disc; padding-left: 1.5em; }
.markdown-content :deep(ol) { list-style: decimal; padding-left: 1.5em; }
.markdown-content :deep(li > p) { margin: 0.4em 0; }
.markdown-content :deep(a) { color: #3b82f6; text-decoration: underline; text-underline-offset: 3px; }
.markdown-content :deep(a:focus-visible) { outline: 2px solid #60a5fa; outline-offset: 2px; }
.markdown-content :deep(blockquote) { border-left: 3px solid #9ca3af; padding-left: 1em; color: #6b7280; }
.markdown-content :deep(code) { background: rgb(128 128 128 / 12%); border-radius: 4px; padding: 0.15em 0.3em; font-size: 0.9em; }
.markdown-content :deep(pre) { overflow-x: auto; background: rgb(128 128 128 / 12%); border-radius: 8px; padding: 1em; }
.markdown-content :deep(pre code) { padding: 0; background: none; }
.markdown-content :deep(table) { display: block; overflow-x: auto; border-collapse: collapse; }
.markdown-content :deep(th),
.markdown-content :deep(td) { border: 1px solid rgb(128 128 128 / 25%); padding: 0.4em 0.8em; }
.markdown-content :deep(img) { max-width: 100%; height: auto; border-radius: 8px; }
.markdown-content :deep(hr) { border-top: 1px solid rgb(128 128 128 / 25%); margin: 1.5em 0; }
:global(.dark .markdown-content blockquote) { color: #9ca3af; }
:global(.dark .markdown-content a) { color: #60a5fa; }
</style>
