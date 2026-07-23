import type { AlbumListItemInfo, PlaylistSongItem, ProductListItemInfo } from '@/types/core'
import { defineStore } from 'pinia'

export const useMainStore = defineStore('main', {
  state: () => ({
    productList: [] as ProductListItemInfo[],
    albumList: [] as AlbumListItemInfo[],
    backgroundUrl: '',
    showSearch: false,
    albumLayoutMap: {} as Record<string, 'grid' | 'list'>,
    // 随机歌单
    randomPlaylistMode: 'random' as 'random' | 'album',
    randomPlaylistLimit: 20,
    randomPlaylistProducts: [] as string[],
    randomPlaylistDateFrom: '',
    randomPlaylistDateTo: '',
    randomPlaylistExcludeAlbums: [] as number[],
    randomPlaylistAlbums: [] as number[],
    randomPlaylist: [] as PlaylistSongItem[],
  }),
  actions: {
    setBackground(url = '') {
      this.backgroundUrl = url
    },
    setAlbumLayout(key: string, layout: 'grid' | 'list') {
      this.albumLayoutMap[key] = layout
    },
  },
  persist: {
    pick: ['albumLayoutMap', 'randomPlaylistMode', 'randomPlaylistLimit', 'randomPlaylistProducts', 'randomPlaylistDateFrom', 'randomPlaylistDateTo', 'randomPlaylistExcludeAlbums', 'randomPlaylistAlbums', 'randomPlaylist'],
  },
})
