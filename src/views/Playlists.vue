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

watch(isLoggedIn, (v) => {
  if (!v)
    store.playlistsTab = 'public'
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

const { data: myPlaylists, refetch: refetchMine } = useMyPlaylistsQuery()

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
    <div class="flex items-center justify-between mb-4">
      <div>
        <h1 class="text-2xl md:text-3xl font-bold">
          歌单
        </h1>
        <p class="text-gray-500 text-sm mt-1">
          发现和管理歌单
        </p>
      </div>
      <button
        class="text-sm bg-blue-500/90 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors cursor-pointer flex items-center gap-1"
        @click="openCreate"
      >
        <LucidePlus class="size-4" />
        新建歌单
      </button>
    </div>

    <div class="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit mb-6">
      <button
        class="px-5 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer"
        :class="playlistsTab === 'public' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'"
        @click="playlistsTab = 'public'"
      >
        广场
      </button>
      <button
        class="px-5 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer"
        :class="playlistsTab === 'mine' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'"
        @click="isLoggedIn ? (playlistsTab = 'mine') : auth.requireLogin()"
      >
        我的
      </button>
    </div>

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
      <div v-else-if="!myPlaylists" class="flex justify-center py-16">
        <LucideLoader2 class="size-8 text-gray-300 animate-spin" />
      </div>
      <div v-else-if="myPlaylists.length === 0" class="text-center py-16">
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
