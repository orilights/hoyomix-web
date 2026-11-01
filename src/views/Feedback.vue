<script setup lang="ts">
import { usePageSeo } from '@/composables/usePageSeo'
import { appGithubRepoUrl } from '@/constants'
import { t } from '@/i18n'

usePageSeo({
  title: () => t('DesktopSidebar.feedback'),
  description: () => t('Feedback.report_issues_suggest_improvements_or_share_your_experience'),
  path: '/feedback',
})
</script>

<template>
  <div class="max-w-3xl mx-auto">
    <PageHeader :title="t('DesktopSidebar.feedback')" :subtitle="t('Feedback.tell_us_about_a_problem_or_an_idea')" />
    <NoticeCard />
    <p class="mb-4 text-sm text-gray-500 dark:text-gray-400">
      {{ t('Feedback.you_can_also_visit') }} <a
        :href="`${appGithubRepoUrl}/issues`"
        target="_blank"
        rel="noopener noreferrer"
        class="text-blue-600 dark:text-blue-400 underline underline-offset-4 hover:text-blue-500"
      >GitHub Issues</a> {{ t('Feedback.to_report_issues_or_suggest_improvements') }}
    </p>
    <CommentSection post-id="hoyomix:feedback" :title="t('Feedback.feedback_and_discussion')" />
  </div>
</template>
