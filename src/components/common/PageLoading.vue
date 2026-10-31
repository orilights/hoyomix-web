<script setup lang="ts">
import { t } from '@/i18n'
</script>

<template>
  <div class="page-loading absolute top-0 left-0 right-0 flex items-center justify-center gap-2 px-4 text-center text-gray-400 pointer-events-none" role="status">
    <LucideLoader2 class="size-5 animate-spin" />{{ t('App.loading') }}
  </div>
</template>

<style scoped>
/* 与启动状态一样，在页头和播放条之间的主内容可视区域居中。 */
.page-loading {
  /* 页面上的 space-y 等间距工具类不应改变可视区域的居中位置。 */
  margin: 0 !important;
  height: calc(100vh - 128px);
  height: calc(100dvh - 128px);
}
</style>
