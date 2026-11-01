<script setup lang="ts">
import type { PlaylistListItem } from '@/types/core'
import { useElementSize, useIntersectionObserver } from '@vueuse/core'
import { toast } from 'vue-sonner'
import { deletePlaylistApi, getPublicPlaylistsApi } from '@/api/music'
import { useFavoritePlaylistsQuery, useMyPlaylistsQuery } from '@/composables/queries'
import { usePageSeo } from '@/composables/usePageSeo'
import { t } from '@/i18n'
import { useAuthStore } from '@/store/auth'
import { useMainStore } from '@/store/main'
import { queryClient } from '@/utils/query-client'

const store = useMainStore()
const auth = useAuthStore()
const { isLoggedIn } = storeToRefs(auth)

usePageSeo({
  title: () => t('Home.playlists'),
  description: () => t('Home.discover_and_manage_playlists'),
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
  { key: 'public', get label() {
    return t('Playlists.community')
  } },
  { key: 'mine', get label() {
    return t('Playlists.mine')
  } },
  { key: 'favorites', get label() {
    return t('Playlists.favorites')
  } },
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
const publicError = ref(false)
const publicFinished = ref(false)
const sentinel = useTemplateRef('sentinel')

async function loadPublic() {
  if (publicLoading.value || publicFinished.value)
    return
  publicLoading.value = true
  publicError.value = false
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
    publicError.value = true
    toast.error(t('Playlists.failed_to_load_playlists', { p0: error instanceof Error ? error.message : t('App.unknown_error') }))
  }
  finally {
    publicLoading.value = false
  }
}

useIntersectionObserver(
  sentinel,
  ([entry]) => {
    if (entry.isIntersecting && tab.value === 'public' && !publicError.value)
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
    toast.error(t('Playlists.failed_to_load_your_playlists', { p0: myError.value?.message ?? t('App.unknown_error') }))
})

watch(isFavError, (v) => {
  if (v && isLoggedIn.value)
    toast.error(t('Playlists.failed_to_load_saved_playlists', { p0: favError.value?.message ?? t('App.unknown_error') }))
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
    toast.success(t('Playlists.deleted'))
  }
  catch (error) {
    toast.error(t('Playlist.failed_to_delete', { p0: error instanceof Error ? error.message : t('App.unknown_error') }))
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
    <PageHeader :title="t('Home.playlists')" :subtitle="t('Home.discover_and_manage_playlists')">
      <template #extra>
        <AppButton
          variant="primary"
          @click="openCreate"
        >
          <LucidePlus class="size-4" />{{ t('DesktopSidebar.new_playlist') }}
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
        <PageLoading v-if="publicItems.length === 0 && publicLoading" />
        <div v-else-if="publicItems.length === 0 && publicError" class="text-center py-16 text-gray-400" role="alert">
          {{ t('Music.failed_to_load_playlist') }}<AppButton class="ml-2" @click="loadPublic()">
            {{ t('App.retry') }}
          </AppButton>
        </div>
        <div v-else-if="publicItems.length === 0 && !publicLoading" class="text-center py-16 text-gray-400">
          {{ t('Playlists.no_public_playlists') }}
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
        <AsyncFade>
          <span v-if="publicLoading && publicItems.length > 0" class="flex items-center gap-2 text-xs text-gray-400" role="status">
            <LucideLoader2 class="size-5 animate-spin" />{{ t('App.loading') }}</span>
          <AppButton v-else-if="publicError && publicItems.length > 0" size="sm" variant="ghost" @click="loadPublic()">
            {{ t('Playlists.unable_to_load_retry') }}
          </AppButton>
          <span v-else-if="publicFinished && publicItems.length > 0" class="text-xs text-gray-300">{{ t('Playlists.all_items_loaded') }}</span>
        </AsyncFade>
      </div>
    </div>

    <div v-else-if="tab === 'favorites'">
      <AsyncFade>
        <PageLoading v-if="auth.isPending" />
        <div v-else-if="!isLoggedIn" class="text-center py-16 text-gray-400">
          {{ t('Playlists.sign_in_to_view_saved_playlists') }}
        </div>
        <PageLoading v-else-if="isFavLoading" />
        <div v-else-if="isFavError" class="flex items-center justify-center py-16 text-red-400">
          {{ t('ArtistListByType.unable_to_load_refresh_to_try_again') }}
        </div>
        <div v-else-if="favoritePlaylists?.length === 0" class="text-center py-16">
          <LucideHeart class="size-12 text-gray-200 mx-auto mb-3" />
          <p class="text-sm text-gray-400">
            {{ t('Playlists.no_saved_playlists') }}
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
        <PageLoading v-if="auth.isPending" />
        <div v-else-if="!isLoggedIn" class="text-center py-16 text-gray-400">
          {{ t('Playlists.sign_in_to_view_your_playlists') }}
        </div>
        <PageLoading v-else-if="isMyLoading" />
        <div v-else-if="isMyError" class="flex items-center justify-center py-16 text-red-400">
          {{ t('ArtistListByType.unable_to_load_refresh_to_try_again') }}
        </div>
        <div v-else-if="myPlaylists?.length === 0" class="text-center py-16">
          <LucideMusic class="size-12 text-gray-200 mx-auto mb-3" />
          <p class="text-sm text-gray-400">
            {{ t('Playlists.no_playlists_yet_create_one_to_get_started') }}
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

    <AppDialog v-model="showDeleteDialog" :title="t('Playlist.delete_playlist')">
      <div class="px-6 py-5 text-sm text-gray-600 dark:text-gray-400">
        <p>{{ t('Playlist.delete_the_playlist', { p0: deleteTargetPlaylist?.name ?? t('Playlists.this_playlist') }) }}</p>
        <p class="mt-2 text-red-500">
          {{ t('Playlist.this_cannot_be_undone') }}
        </p>
      </div>
      <template #footer>
        <div class="px-6 py-3 flex justify-end gap-2">
          <AppButton variant="outline" :disabled="deletingPlaylist" @click="showDeleteDialog = false">
            {{ t('AlbumPickerDialog.cancel') }}
          </AppButton>
          <AppButton variant="danger" :disabled="deletingPlaylist" @click="confirmDeletePlaylist">
            <LucideLoader2 v-if="deletingPlaylist" class="size-4 animate-spin" />
            {{ deletingPlaylist ? t('Playlist.deleting') : t('Playlist.confirm_deletion') }}
          </AppButton>
        </div>
      </template>
    </AppDialog>
    <CreatePlaylistDialog v-model="showCreateDialog" @success="onCreateSuccess" />
  </div>
</template>
