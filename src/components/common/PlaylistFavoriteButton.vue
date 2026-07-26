<script setup lang="ts">
import { toast } from 'vue-sonner'
import { useAuthStore } from '@/store/auth'
import { useMainStore } from '@/store/main'

interface Props {
  playlistId: string
  variant?: 'icon' | 'action'
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'action',
})

const auth = useAuthStore()
const mainStore = useMainStore()
const loading = ref(false)

const isFavorited = computed(() => mainStore.favoritePlaylistIds.includes(props.playlistId))

async function handleClick() {
  if (!auth.requireLogin())
    return

  loading.value = true
  try {
    if (isFavorited.value)
      await mainStore.removeFavoritePlaylist(props.playlistId)
    else
      await mainStore.addFavoritePlaylist(props.playlistId)
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
  <button
    v-if="variant === 'action'"
    class="text-sm bg-gray-500/10 px-3 py-2 rounded-lg hover:bg-gray-500/20 transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-50"
    :disabled="loading"
    @click.stop="handleClick"
  >
    <LucideLoader2
      v-if="loading"
      class="size-4 animate-spin text-gray-400"
    />
    <LucideHeart
      v-else
      class="size-4 transition-colors"
      :class="isFavorited ? 'text-red-500' : 'text-gray-400'"
      :fill="isFavorited ? 'currentColor' : 'none'"
    />
    <span>
      {{ isFavorited ? '已收藏' : '收藏' }}
    </span>
  </button>
  <button
    v-else
    class="p-1 rounded transition-colors cursor-pointer group shrink-0"
    :class="{
      'opacity-50': loading,
    }"
    :disabled="loading"
    :title="isFavorited ? '取消收藏' : '收藏'"
    @click.stop="handleClick"
  >
    <LucideLoader2
      v-if="loading"
      class="size-4 animate-spin text-gray-400"
    />
    <LucideHeart
      v-else
      class="size-4 transition-colors group-hover:text-red-400"
      :class="isFavorited ? 'text-red-500' : 'text-gray-400'"
      :fill="isFavorited ? 'currentColor' : 'none'"
    />
  </button>
</template>
