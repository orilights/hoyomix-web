<script setup lang="ts">
import { useMainStore } from '@/store/main'
import { usePlayerStore } from '@/store/player'

const store = useMainStore()
const player = usePlayerStore()
const { isFullscreen } = storeToRefs(player)
const { showSearch } = storeToRefs(store)

function onKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault()
    showSearch.value = true
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div
    class="fixed left-0 xl:left-[240px] right-0 top-0 z-10 px-4 md:px-16 xl:px-8 py-2 transition-all duration-500 flex items-center" :class="{
      '-translate-y-full opacity-0 pointer-events-none': isFullscreen,
    }"
  >
    <div class="flex items-center">
      <Tooltip content="返回上一页" placement="bottom" align="center">
        <AppButton
          icon-only
          shape="pill"
          aria-label="返回上一页"
          @click="$router.back()"
        >
          <LucideChevronLeft class="size-4.5" />
        </AppButton>
      </Tooltip>
      <Tooltip class="ml-2 xl:hidden" content="返回首页" placement="bottom" align="center">
        <AppButton
          icon-only
          shape="pill"
          aria-label="返回首页"
          @click="$router.push({ name: 'Home' })"
        >
          <LucideLayoutGrid class="size-4.5" />
        </AppButton>
      </Tooltip>
      <Tooltip class="ml-2" content="搜索" placement="bottom" align="center">
        <AppButton
          shape="pill"
          aria-label="搜索"
          @click="showSearch = true"
        >
          <LucideSearch class="size-4.5" />
          <kbd class="hidden md:inline text-xs text-gray-400">Ctrl+K</kbd>
        </AppButton>
      </Tooltip>
    </div>
    <div class="ml-auto flex items-center gap-2">
      <Tooltip class="xl:hidden" content="打开设置" placement="bottom" align="center">
        <AppButton
          icon-only
          shape="pill"
          aria-label="打开设置"
          @click="$router.push({ name: 'Settings' })"
        >
          <LucideSlidersHorizontal class="size-4.5" />
        </AppButton>
      </Tooltip>
      <NotificationBell />
      <UserInfo />
    </div>
  </div>
  <SearchModal v-model="showSearch" />
</template>

<style scoped>

</style>
