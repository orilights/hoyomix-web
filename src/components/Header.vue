<script setup lang="ts">
import { t } from '@/i18n'
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
    class="fixed left-0 xl:left-[240px] right-0 top-0 z-10 px-2 sm:px-4 md:px-16 xl:px-8 py-2 transition-all duration-500 flex items-center" :class="{
      '-translate-y-full opacity-0 pointer-events-none': isFullscreen,
    }"
  >
    <div class="flex items-center">
      <Tooltip :content="t('Header.go_back')" placement="bottom" align="center">
        <AppButton
          icon-only
          shape="pill"
          :aria-label="t('Header.go_back')"
          @click="$router.back()"
        >
          <LucideChevronLeft class="size-4.5" />
        </AppButton>
      </Tooltip>
      <Tooltip class="ml-0.5 sm:ml-2 xl:hidden" :content="t('Header.go_to_home')" placement="bottom" align="center">
        <AppButton
          icon-only
          shape="pill"
          :aria-label="t('Header.go_to_home')"
          @click="$router.push({ name: 'Home' })"
        >
          <LucideLayoutGrid class="size-4.5" />
        </AppButton>
      </Tooltip>
      <Tooltip class="ml-0.5 sm:ml-2" :content="t('Header.search')" placement="bottom" align="center">
        <AppButton
          class="max-md:w-9 max-md:px-0"
          shape="pill"
          :aria-label="t('Header.search')"
          @click="showSearch = true"
        >
          <LucideSearch class="size-4.5" />
          <kbd class="hidden md:inline text-xs text-gray-400">Ctrl+K</kbd>
        </AppButton>
      </Tooltip>
    </div>
    <div class="ml-auto flex items-center gap-0.5 sm:gap-2">
      <ThemeSwitcher compact />
      <Tooltip class="xl:hidden" :content="t('Header.open_settings')" placement="bottom" align="center">
        <AppButton
          icon-only
          shape="pill"
          :aria-label="t('Header.open_settings')"
          @click="$router.push({ name: 'Settings' })"
        >
          <LucideSlidersHorizontal class="size-4.5" />
        </AppButton>
      </Tooltip>
      <NoticeButton />
      <NotificationBell />
      <UserInfo />
    </div>
  </div>
  <SearchModal v-model="showSearch" />
</template>

<style scoped>

</style>
