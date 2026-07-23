<script setup lang="ts">
import type { PlaylistListItem } from '@/types/core'
import { useElementSize, useIntersectionObserver } from '@vueuse/core'
import { toast } from 'vue-sonner'
import { deletePlaylistApi, getPlaylistsApi } from '@/api/music'
import { useMyPlaylistsQuery } from '@/composables/queries'
import { useAuthStore } from '@/store/auth'
import { useMainStore } from '@/store/main'

const store = useMainStore()
const auth = useAuthStore()
const { playlistsTab } = storeToRefs(store)
const { isLoggedIn } = storeToRefs(auth)

const homeContainer = useTemplateRef<HTMLElement>('homeContainer')
const { width: containerWidth } = useElementSize(homeContainer)

const gridColumns = computed(() => {
  const num = Math.floor(containerWidth.value / 200)
  if (num < 2)
    return 2
  return num
})

const tabOptions = [
  { key: 'public', label: '广场' },
  { key: 'mine', label: '我的' },
]

watch(isLoggedIn, (v) => {
  if (!v)
    store.playlistsTab = 'public'
})

watch(playlistsTab, (tab) => {
  if (tab === 'mine' && !isLoggedIn.value) {
    auth.requireLogin()
    store.playlistsTab = 'public'
  }
})

const showCreateDialog = ref(false)

function openCreate() {
  if (!auth.requireLogin())
    return
  showCreateDialog.value = true
}

const publicItems = ref<PlaylistListItem[]>([])
const publicPage = ref(1)
const publicTotal = ref(0)
const publicLoading = ref(false)
const publicFinished = ref(false)
const sentinel = useTemplateRef('sentinel')

async function loadPublic() {
  if (publicLoading.value || publicFinished.value)
    return
  publicLoading.value = true
  try {
    const res = await getPlaylistsApi({ page: publicPage.value, limit: 20, sort: 'desc' })
    publicItems.value.push(...res.items)
    publicTotal.value = res.total
    if (publicItems.value.length >= res.total)
      publicFinished.value = true
    else
      publicPage.value++
  }
  catch (error) {
    toast.error(`加载歌单失败：${error instanceof Error ? error.message : '未知错误'}`)
  }
  finally {
    publicLoading.value = false
  }
}

useIntersectionObserver(
  sentinel,
  ([entry]) => {
    if (entry.isIntersecting && playlistsTab.value === 'public')
      loadPublic()
  },
)

watch(playlistsTab, (tab) => {
  if (tab === 'public' && publicItems.value.length === 0)
    loadPublic()
}, { immediate: true })

const { data: myPlaylists, isLoading: isMyLoading, isError: isMyError, error: myError, refetch: refetchMine } = useMyPlaylistsQuery()

watch(isMyError, (v) => {
  if (v && isLoggedIn.value)
    toast.error(`我的歌单加载失败：${myError.value?.message ?? '未知错误'}`)
})

async function deletePlaylist(id: string) {
  try {
    await deletePlaylistApi(id)
    toast.success('删除成功')
    refetchMine()
  }
  catch (error) {
    toast.error(`删除失败：${error instanceof Error ? error.message : '未知错误'}`)
  }
}

function onCreateSuccess() {
  refetchMine()
  if (isLoggedIn.value)
    playlistsTab.value = 'mine'
}

onMounted(() => {
  store.setBackground()
  if (!isLoggedIn.value)
    store.playlistsTab = 'public'
})
</script>

<template>
  <div ref="homeContainer">
    <PageHeader title="歌单" subtitle="发现和管理歌单">
      <template #extra>
        <button
          class="text-sm bg-blue-500/90 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors cursor-pointer flex items-center gap-1"
          @click="openCreate"
        >
          <LucidePlus class="size-4" />
          新建歌单
        </button>
      </template>
    </PageHeader>

    <SegmentSwitch
      v-model="playlistsTab"
      :options="tabOptions"
      class="mb-6"
    />

    <div v-if="playlistsTab === 'public'">
      <div v-if="publicItems.length === 0 && publicLoading" class="flex justify-center py-16">
        <LucideLoader2 class="size-8 text-gray-300 animate-spin" />
      </div>
      <div v-else-if="publicItems.length === 0 && !publicLoading" class="text-center py-16 text-gray-400">
        暂无公开歌单
      </div>
      <div
        v-else class="grid justify-center"
        :style="{
          gridTemplateColumns: `repeat(${gridColumns}, minmax(0px, 1fr))`,
        }"
      >
        <PlaylistCard v-for="pl in publicItems" :key="pl.id" :playlist="pl" show-owner />
      </div>
      <div ref="sentinel" class="h-10 flex items-center justify-center mt-4">
        <LucideLoader2 v-if="publicLoading && publicItems.length > 0" class="size-5 text-gray-300 animate-spin" />
        <span v-else-if="publicFinished && publicItems.length > 0" class="text-xs text-gray-300">已加载全部</span>
      </div>
    </div>

    <div v-else>
      <div v-if="!isLoggedIn" class="text-center py-16 text-gray-400">
        请先登录以查看你的歌单
      </div>
      <div v-else-if="isMyLoading" class="flex justify-center py-16">
        <LucideLoader2 class="size-8 text-gray-300 animate-spin" />
      </div>
      <div v-else-if="isMyError" class="flex items-center justify-center py-16 text-red-400">
        加载失败，请刷新重试
      </div>
      <div v-else-if="myPlaylists?.length === 0" class="text-center py-16">
        <LucideMusic class="size-12 text-gray-200 mx-auto mb-3" />
        <p class="text-sm text-gray-400">
          还没有歌单，快去创建一个吧
        </p>
      </div>
      <div
        v-else class="grid justify-center"
        :style="{
          gridTemplateColumns: `repeat(${gridColumns}, minmax(0px, 1fr))`,
        }"
      >
        <PlaylistCard
          v-for="pl in myPlaylists"
          :key="pl.id"
          :playlist="pl"
          show-delete
          @delete="deletePlaylist"
        />
      </div>
    </div>

    <CreatePlaylistDialog v-model="showCreateDialog" @success="onCreateSuccess" />
  </div>
</template>
