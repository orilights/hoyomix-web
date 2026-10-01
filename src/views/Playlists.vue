<script setup lang="ts">
import type { PlaylistListItem } from '@/types/core'
import { useElementSize, useIntersectionObserver } from '@vueuse/core'
import { toast } from 'vue-sonner'
import { deletePlaylistApi, getPublicPlaylistsApi } from '@/api/music'
import { useFavoritePlaylistsQuery, useMyPlaylistsQuery } from '@/composables/queries'
import { usePageSeo } from '@/composables/usePageSeo'
import { useAuthStore } from '@/store/auth'
import { useMainStore } from '@/store/main'
import { queryClient } from '@/utils/query-client'

const store = useMainStore()
const auth = useAuthStore()
const { isLoggedIn } = storeToRefs(auth)

usePageSeo({
  title: '歌单',
  description: '发现和管理歌单',
  path: '/playlists',
})

const route = useRoute()
const router = useRouter()
const tab = computed<string>({
  get: () => route.query.tab === 'mine' || route.query.tab === 'favorites' ? route.query.tab : 'public',
  set: (val) => { void router.replace({ query: { ...route.query, tab: val === 'public' ? undefined : val } }) },
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

watch([tab, () => auth.isPending], ([val, pending]) => {
  if (!pending && (val === 'mine' || val === 'favorites') && !isLoggedIn.value) {
    auth.requireLogin()
    tab.value = 'public'
  }
})

const showCreateDialog = ref(false)
const deletePlaylistId = ref<string | null>(null)
const deletingPlaylist = ref(false)
const showDeleteDialog = computed({
  get: () => deletePlaylistId.value !== null,
  set: (visible: boolean) => {
    if (!visible && !deletingPlaylist.value)
      deletePlaylistId.value = null
  },
})

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

const { data: myPlaylists, isLoading: isMyLoading, isError: isMyError, error: myError } = useMyPlaylistsQuery()
const deleteTargetPlaylist = computed(() => myPlaylists.value?.find(pl => pl.id === deletePlaylistId.value))

const {
  data: favoritePlaylists,
  isLoading: isFavLoading,
  isError: isFavError,
  error: favError,
} = useFavoritePlaylistsQuery()

watch(isMyError, (v) => {
  if (v && isLoggedIn.value)
    toast.error(`我的歌单加载失败：${myError.value?.message ?? '未知错误'}`)
})

watch(isFavError, (v) => {
  if (v && isLoggedIn.value)
    toast.error(`收藏歌单加载失败：${favError.value?.message ?? '未知错误'}`)
})

function requestDeletePlaylist(id: string) {
  deletePlaylistId.value = id
}

async function confirmDeletePlaylist() {
  const id = deletePlaylistId.value
  if (!id || deletingPlaylist.value)
    return
  deletingPlaylist.value = true
  try {
    await deletePlaylistApi(id)
    deletePlaylistId.value = null
    void queryClient.invalidateQueries({ queryKey: ['myPlaylists'] })
    void queryClient.invalidateQueries({ queryKey: ['favoritePlaylists'] })
    void queryClient.invalidateQueries({ queryKey: ['playlists'] })
    toast.success('删除成功')
  }
  catch (error) {
    toast.error(`删除失败：${error instanceof Error ? error.message : '未知错误'}`)
  }
  finally {
    deletingPlaylist.value = false
  }
}

function onCreateSuccess() {
  if (isLoggedIn.value)
    tab.value = 'mine'
}

onMounted(() => {
  store.setBackground()
  if (!auth.isPending && !isLoggedIn.value)
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
            @delete="requestDeletePlaylist"
          />
        </div>
      </AsyncFade>
    </div>

    <AppDialog v-model="showDeleteDialog" title="删除歌单">
      <div class="px-6 py-5 text-sm text-gray-600 dark:text-gray-400">
        <p>确定要删除歌单「{{ deleteTargetPlaylist?.name ?? '这个歌单' }}」吗？</p>
        <p class="mt-2 text-red-500">
          删除后无法恢复
        </p>
      </div>
      <template #footer>
        <div class="px-6 py-3 flex justify-end gap-2">
          <AppButton variant="outline" :disabled="deletingPlaylist" @click="showDeleteDialog = false">
            取消
          </AppButton>
          <AppButton variant="danger" :disabled="deletingPlaylist" @click="confirmDeletePlaylist">
            <LucideLoader2 v-if="deletingPlaylist" class="size-4 animate-spin" />
            {{ deletingPlaylist ? '删除中...' : '确认删除' }}
          </AppButton>
        </div>
      </template>
    </AppDialog>
    <CreatePlaylistDialog v-model="showCreateDialog" @success="onCreateSuccess" />
  </div>
</template>
