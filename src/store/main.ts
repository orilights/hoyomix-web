import type { AlbumListItemInfo, PlaylistSongItem, ProductListItemInfo } from '@/types/core'
import { defineStore } from 'pinia'
import { addFavoriteApi, getAllFavoritesApi, removeFavoriteApi } from '@/api/music'

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
    // 收藏
    favoriteIds: [] as number[],
  }),
  actions: {
    setBackground(url = '') {
      this.backgroundUrl = url
    },
    setAlbumLayout(key: string, layout: 'grid' | 'list') {
      this.albumLayoutMap[key] = layout
    },
    async fetchFavorites() {
      try {
        const res = await getAllFavoritesApi()
        this.favoriteIds = res.songIds
      }
      catch {
        this.favoriteIds = []
      }
    },
    clearFavorites() {
      this.favoriteIds = []
    },
    async addFavorite(songId: number) {
      if (this.favoriteIds.includes(songId))
        return
      this.favoriteIds.push(songId)
      try {
        await addFavoriteApi(songId)
      }
      catch {
        this.favoriteIds = this.favoriteIds.filter(id => id !== songId)
        throw new Error('收藏失败')
      }
    },
    async removeFavorite(songId: number) {
      if (!this.favoriteIds.includes(songId))
        return
      this.favoriteIds = this.favoriteIds.filter(id => id !== songId)
      try {
        await removeFavoriteApi(songId)
      }
      catch {
        this.favoriteIds.push(songId)
        throw new Error('取消收藏失败')
      }
    },
  },
  persist: {
    pick: ['albumLayoutMap', 'randomPlaylistMode', 'randomPlaylistLimit', 'randomPlaylistProducts', 'randomPlaylistDateFrom', 'randomPlaylistDateTo', 'randomPlaylistExcludeAlbums', 'randomPlaylistAlbums', 'randomPlaylist'],
  },
})
