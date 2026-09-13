<script setup lang="ts">
import type { PlaylistListItem } from '@/types/core'
import { useElementSize, useIntersectionObserver, useUrlSearchParams } from '@vueuse/core'
import { toast } from 'vue-sonner'
import { deletePlaylistApi, getPublicPlaylistsApi } from '@/api/music'
import { useFavoritePlaylistsQuery, useMyPlaylistsQuery } from '@/composables/queries'
import { usePageSeo } from '@/composables/usePageSeo'
import { useAuthStore } from '@/store/auth'
import { useMainStore } from '@/store/main'

const store = useMainStore()
const auth = useAuthStore()
const { isLoggedIn } = storeToRefs(auth)

usePageSeo({
  title: '歌单',
  description: '发现和管理歌单',
  path: '/playlists',
})

const params = useUrlSearchParams('history', { removeFalsyValues: true })
const tab = computed<string>({
  get: () => (params.tab as string) || 'public',
  set: (val) => { params.tab = val },
})

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
  { key: 'favorites', label: '收藏' },
]

watch(isLoggedIn, (v) => {
  if (!v)
    tab.value = 'public'
})

watch(tab, (val) => {
  if ((val === 'mine' || val === 'favorites') && !isLoggedIn.value) {
    auth.requireLogin()
    tab.value = 'public'
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
    const res = await getPublicPlaylistsApi({ page: publicPage.value, limit: 20, sort: 'desc' })
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
    if (entry.isIntersecting && tab.value === 'public')
      loadPublic()
  },
)

watch(tab, (val) => {
  if (val === 'public' && publicItems.value.length === 0)
    loadPublic()
}, { immediate: true })

const { data: myPlaylists, isLoading: isMyLoading, isError: isMyError, error: myError, refetch: refetchMine } = useMyPlaylistsQuery()

const {
  data: favoritePlaylists,
  isLoading: isFavLoading,
  isError: isFavError,
  error: favError,
  refetch: refetchFavorites,
} = useFavoritePlaylistsQuery()

watch(isMyError, (v) => {
  if (v && isLoggedIn.value)
    toast.error(`我的歌单加载失败：${myError.value?.message ?? '未知错误'}`)
})

watch(isFavError, (v) => {
  if (v && isLoggedIn.value)
    toast.error(`收藏歌单加载失败：${favError.value?.message ?? '未知错误'}`)
})

watch(() => store.favoritePlaylistIds, () => {
  if (isLoggedIn.value)
    refetchFavorites()
}, { deep: false })

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
    tab.value = 'mine'
}

onMounted(() => {
  store.setBackground()
  if (!isLoggedIn.value)
    tab.value = 'public'
})
</script>

<template>
  <div ref="homeContainer">
    <PageHeader title="歌单" subtitle="发现和管理歌单">
      <template #extra>
        <AppButton
          variant="primary"
          @click="openCreate"
        >
          <LucidePlus class="size-4" />
          新建歌单
        </AppButton>
      </template>
    </PageHeader>

    <SegmentSwitch
      v-model="tab"
      :options="tabOptions"
      class="mb-6"
    />

    <div v-if="tab === 'public'">
      <AsyncFade>
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
      </AsyncFade>
      <div ref="sentinel" class="h-10 flex items-center justify-center mt-4">
        <LucideLoader2 v-if="publicLoading && publicItems.length > 0" class="size-5 text-gray-300 animate-spin" />
        <span v-else-if="publicFinished && publicItems.length > 0" class="text-xs text-gray-300">已加载全部</span>
      </div>
    </div>

    <div v-else-if="tab === 'favorites'">
      <AsyncFade>
        <div v-if="!isLoggedIn" class="text-center py-16 text-gray-400">
          请先登录以查看收藏歌单
        </div>
        <div v-else-if="isFavLoading" class="flex justify-center py-16">
          <LucideLoader2 class="size-8 text-gray-300 animate-spin" />
        </div>
        <div v-else-if="isFavError" class="flex items-center justify-center py-16 text-red-400">
          加载失败，请刷新重试
        </div>
        <div v-else-if="favoritePlaylists?.length === 0" class="text-center py-16">
          <LucideHeart class="size-12 text-gray-200 mx-auto mb-3" />
          <p class="text-sm text-gray-400">
            暂无收藏歌单
          </p>
        </div>
        <div
          v-else class="grid justify-center"
          :style="{
            gridTemplateColumns: `repeat(${gridColumns}, minmax(0px, 1fr))`,
          }"
        >
          <PlaylistCard v-for="pl in favoritePlaylists" :key="pl.id" :playlist="pl" />
        </div>
      </AsyncFade>
    </div>

    <div v-else>
      <AsyncFade>
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
            :show-delete="pl.type !== 'favorites'"
            @delete="deletePlaylist"
          />
        </div>
      </AsyncFade>
    </div>

    <CreatePlaylistDialog v-model="showCreateDialog" @success="onCreateSuccess" />
  </div>
</template>
