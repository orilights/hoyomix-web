<script setup lang="ts">
import { usePageSeo } from '@/composables/usePageSeo'

usePageSeo({
  title: '反馈',
  description: '反馈问题、建议或分享使用体验',
  path: '/feedback',
})
</script>

<template>
  <div class="max-w-3xl mx-auto">
    <PageHeader title="反馈" subtitle="告诉我们你遇到的问题或想法" />
    <CommentSection post-id="hoyomix:feedback" title="反馈与讨论" />
  </div>
</template>
