<script setup lang="ts">
import { toast } from 'vue-sonner'
import { useAlbumFavoriteMutation, useAlbumFavoritesQuery } from '@/composables/queries'
import { useAuthStore } from '@/store/auth'
import { useMainStore } from '@/store/main'

interface Props {
  type: 'song' | 'playlist' | 'album'
  albumId?: number
  songId?: number
  playlistId?: string
  size?: 'sm' | 'md'
  variant?: 'icon' | 'action'
}

const props = withDefaults(defineProps<Props>(), {
  size: 'sm',
  variant: 'icon',
})

const auth = useAuthStore()
const mainStore = useMainStore()
const loading = ref(false)
const albumMutation = props.type === 'album' ? useAlbumFavoriteMutation() : null
const albumFavorites = props.type === 'album' ? useAlbumFavoritesQuery() : null
const busy = computed(() => loading.value || (props.type === 'album' && (mainStore.pendingAlbumFavorites.includes(props.albumId!) || (auth.isLoggedIn && albumFavorites?.isPending.value))))

const isFavorited = computed(() => {
  if (props.type === 'album')
    return props.albumId != null && mainStore.favoriteAlbumIds.includes(props.albumId)
  if (props.type === 'song')
    return props.songId != null && mainStore.favoriteSongIds.includes(props.songId)
  return props.playlistId != null && mainStore.favoritePlaylistIds.includes(props.playlistId)
})

async function handleClick() {
  if (busy.value)
    return
  if (!auth.requireLogin())
    return

  loading.value = true
  try {
    if (props.type === 'album' && albumFavorites && albumMutation) {
      const albumId = props.albumId
      const userId = auth.user?.id
      if (albumId == null)
        return
      if (albumFavorites.isError.value) {
        const result = await albumFavorites.refetch()
        if (result.isError)
          throw new Error('收藏状态加载失败，请重试')
        await nextTick()
      }
      if (userId !== auth.user?.id)
        return
      await albumMutation.mutateAsync({ albumId, favorite: !mainStore.favoriteAlbumIds.includes(albumId) })
    }
    else if (props.type === 'song') {
      if (props.songId == null)
        return
      if (isFavorited.value)
        await mainStore.removeFavoriteSong(props.songId)
      else
        await mainStore.addFavoriteSong(props.songId)
    }
    else {
      if (props.playlistId == null)
        return
      if (isFavorited.value)
        await mainStore.removeFavoritePlaylist(props.playlistId)
      else
        await mainStore.addFavoritePlaylist(props.playlistId)
    }
  }
  catch (error: any) {
    toast.error(error instanceof Error ? error.message : '操作失败')
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <AppButton
    v-if="variant === 'action'"
    class="group/favorite"
    :disabled="busy"
    :aria-pressed="isFavorited"
    @click.stop="handleClick"
  >
    <LucideLoader2
      v-if="busy"
      class="size-4 animate-spin text-gray-400"
    />
    <LucideHeart
      v-else
      class="size-4 transition-colors"
      :class="isFavorited ? 'text-red-500' : 'group-hover/favorite:text-red-500'"
      :fill="isFavorited ? 'currentColor' : 'none'"
    />
    <span>
      {{ isFavorited ? '已收藏' : '收藏' }}
    </span>
  </AppButton>
  <AppButton
    v-else
    icon-only
    variant="ghost"
    :size="size === 'md' ? 'sm' : 'xs'"
    class="group/favorite favorite shrink-0"
    :class="{
      'opacity-50': loading,
    }"
    :disabled="busy"
    :aria-pressed="isFavorited"
    :title="isFavorited ? '取消收藏' : '收藏'"
    :aria-label="isFavorited ? '取消收藏' : '收藏'"
    @click.stop="handleClick"
  >
    <LucideLoader2
      v-if="busy"
      class="animate-spin text-gray-400"
      :class="size === 'md' ? 'size-5' : 'size-4'"
    />
    <LucideHeart
      v-else
      class="transition-colors"
      :class="[
        size === 'md' ? 'size-5' : 'size-4',
        isFavorited ? 'text-red-500' : 'group-hover/favorite:hover:text-red-400',
      ]"
      :fill="isFavorited ? 'currentColor' : 'none'"
    />
  </AppButton>
</template>
