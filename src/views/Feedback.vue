<script setup lang="ts">
import { usePageSeo } from '@/composables/usePageSeo'
import { appGithubRepoUrl } from '@/constants'

usePageSeo({
  title: '反馈',
  description: '反馈问题、建议或分享使用体验',
  path: '/feedback',
})
</script>

<template>
  <div class="max-w-3xl mx-auto">
    <PageHeader title="反馈" subtitle="告诉我们你遇到的问题或想法" />
    <p class="mb-4 text-sm text-gray-500 dark:text-gray-400">
      也欢迎前往
      <a
        :href="`${appGithubRepoUrl}/issues`"
        target="_blank"
        rel="noopener noreferrer"
        class="text-blue-600 dark:text-blue-400 underline underline-offset-4 hover:text-blue-500"
      >GitHub Issues</a>
      反馈问题或提出建议。
    </p>
    <CommentSection post-id="hoyomix:feedback" title="反馈与讨论" />
  </div>
</template>
