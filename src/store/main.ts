import type { AlbumListItemInfo, AppConfigResponse, PlaylistSongItem, ProductListItemInfo } from '@/types/core'
import { defineStore } from 'pinia'
import { addFavoriteApi, addPlaylistFavoriteApi, getAllFavoritesApi, getFavoritePlaylistsApi, removeFavoriteApi, removePlaylistFavoriteApi } from '@/api/music'
import { queryClient } from '@/utils/query-client'

export const useMainStore = defineStore('main', {
  state: () => ({
    productList: [] as ProductListItemInfo[],
    albumList: [] as AlbumListItemInfo[],
    backgroundUrl: '',
    showSearch: false,
    albumLayoutMap: {} as Record<string, 'grid' | 'list'>,
    // 随机播放列表
    randomPlaylistMode: 'random' as 'random' | 'album',
    randomPlaylistLimit: 20,
    randomPlaylistProducts: [] as string[],
    randomPlaylistDateFrom: '',
    randomPlaylistDateTo: '',
    randomPlaylistExcludeAlbums: [] as number[],
    randomPlaylistExcludeInstrumental: false,
    randomPlaylistAlbums: [] as number[],
    randomPlaylist: [] as PlaylistSongItem[],
    // 收藏
    favoriteSongIds: [] as number[],
    favoritePlaylistIds: [] as string[],
  }),
  getters: {
    // 产品 alias（如 genshin）→ 产品名称（如 原神）
    productNameMap: state =>
      Object.fromEntries(state.productList.map(p => [p.alias, p.name] as const)),
    // 产品名称（如 原神）→ 产品 alias（如 genshin）
    productAliasMap: state =>
      Object.fromEntries(state.productList.map(p => [p.name, p.alias] as const)),
  },
  actions: {
    setBackground(url = '') {
      this.backgroundUrl = url
    },
    setAppConfig(data: AppConfigResponse) {
      this.productList = data.products
    },
    setAlbumLayout(key: string, layout: 'grid' | 'list') {
      this.albumLayoutMap[key] = layout
    },
    clearFavorites() {
      this.favoriteSongIds = []
      this.favoritePlaylistIds = []
    },
    async fetchFavoriteSongs() {
      try {
        const res = await getAllFavoritesApi()
        this.favoriteSongIds = res.songIds
      }
      catch {
        this.favoriteSongIds = []
      }
    },
    async addFavoriteSong(songId: number) {
      if (this.favoriteSongIds.includes(songId))
        return
      this.favoriteSongIds.push(songId)
      try {
        await addFavoriteApi(songId)
        void queryClient.invalidateQueries({ queryKey: ['myPlaylists'] })
      }
      catch {
        this.favoriteSongIds = this.favoriteSongIds.filter(id => id !== songId)
        throw new Error('收藏失败')
      }
    },
    async removeFavoriteSong(songId: number) {
      if (!this.favoriteSongIds.includes(songId))
        return
      this.favoriteSongIds = this.favoriteSongIds.filter(id => id !== songId)
      try {
        await removeFavoriteApi(songId)
        void queryClient.invalidateQueries({ queryKey: ['myPlaylists'] })
      }
      catch {
        this.favoriteSongIds.push(songId)
        throw new Error('取消收藏失败')
      }
    },
    async fetchFavoritePlaylists() {
      try {
        const res = await getFavoritePlaylistsApi()
        this.favoritePlaylistIds = res.items.map(item => item.id)
      }
      catch {
        this.favoritePlaylistIds = []
      }
    },
    async addFavoritePlaylist(id: string) {
      if (this.favoritePlaylistIds.includes(id))
        return
      this.favoritePlaylistIds.push(id)
      try {
        await addPlaylistFavoriteApi(id)
        void queryClient.invalidateQueries({ queryKey: ['favoritePlaylists'] })
      }
      catch {
        this.favoritePlaylistIds = this.favoritePlaylistIds.filter(pid => pid !== id)
        throw new Error('收藏失败')
      }
    },
    async removeFavoritePlaylist(id: string) {
      if (!this.favoritePlaylistIds.includes(id))
        return
      this.favoritePlaylistIds = this.favoritePlaylistIds.filter(pid => pid !== id)
      try {
        await removePlaylistFavoriteApi(id)
        void queryClient.invalidateQueries({ queryKey: ['favoritePlaylists'] })
      }
      catch {
        this.favoritePlaylistIds.push(id)
        throw new Error('取消收藏失败')
      }
    },
  },
  persist: {
    pick: ['albumLayoutMap', 'randomPlaylistMode', 'randomPlaylistLimit', 'randomPlaylistProducts', 'randomPlaylistDateFrom', 'randomPlaylistDateTo', 'randomPlaylistExcludeAlbums', 'randomPlaylistExcludeInstrumental', 'randomPlaylistAlbums', 'randomPlaylist'],
  },
})
