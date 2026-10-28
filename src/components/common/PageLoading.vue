<template>
  <div class="page-loading absolute top-0 left-0 right-0 flex items-center justify-center gap-2 px-4 text-center text-gray-400 pointer-events-none" role="status">
    <LucideLoader2 class="size-5 animate-spin" />
    加载中...
  </div>
</template>

<style scoped>
/* 与启动状态一样，在页头和播放条之间的主内容可视区域居中。 */
.page-loading {
  height: calc(100vh - 128px);
  height: calc(100dvh - 128px);
}
</style>
