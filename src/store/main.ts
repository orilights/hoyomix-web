import type { AlbumListItemInfo, AppConfigResponse, MapSongsSort, PlaylistSongItem, ProductListItemInfo } from '@/types/core'
import { defineStore } from 'pinia'
import { addFavoriteApi, addPlaylistFavoriteApi, getAllFavoritesApi, getFavoritePlaylistsApi, removeFavoriteApi, removePlaylistFavoriteApi } from '@/api/music'
import { sidebarNavigation } from '@/constants/sidebar'
import { LocalizedError } from '@/i18n/error'
import { queryClient } from '@/utils/query-client'

export const useMainStore = defineStore('main', {
  state: () => ({
    productList: [] as ProductListItemInfo[],
    albumList: [] as AlbumListItemInfo[],
    backgroundUrl: '',
    showSearch: false,
    albumLayoutMap: {} as Record<string, 'grid' | 'list'>,
    regionSongsSort: 'region' as MapSongsSort,
    sidebarOrder: [] as string[],
    sidebarHiddenItems: [] as string[],
    // 随机播放列表
    randomPlaylistMode: 'random' as 'random' | 'album',
    randomPlaylistLimit: 20,
    randomPlaylistMinDuration: 0,
    randomPlaylistProducts: [] as string[],
    randomPlaylistDateFrom: '',
    randomPlaylistDateTo: '',
    randomPlaylistExcludeAlbums: [] as number[],
    randomPlaylistExcludeInstrumental: false,
    randomPlaylistAlbums: [] as number[],
    randomPlaylist: [] as PlaylistSongItem[],
    // 收藏
    favoriteSongIds: [] as number[],
    favoriteAlbumIds: [] as number[],
    pendingAlbumFavorites: [] as number[],
    favoritesRevision: 0,
    favoritePlaylistIds: [] as string[],
  }),
  getters: {
    orderedSidebarItems: (state) => {
      const items = new Map(sidebarNavigation.map(item => [item.name, item]))
      // 新菜单没有已保存的位置，按默认顺序追加。
      return [...new Set([...state.sidebarOrder, ...items.keys()])]
        .map(name => items.get(name))
        .filter(item => item !== undefined)
    },
    visibleSidebarItems(): typeof sidebarNavigation {
      return this.orderedSidebarItems.filter(item => item.required || !this.sidebarHiddenItems.includes(item.name))
    },
    // 产品 alias（如 genshin）→ 产品名称（如 原神）
    productNameMap: state =>
      Object.fromEntries(state.productList.map(p => [p.alias, p.name] as const)),
    // 产品名称（如 原神）→ 产品 alias（如 genshin）
    productAliasMap: state =>
      Object.fromEntries(state.productList.map(p => [p.name, p.alias] as const)),
  },
  actions: {
    moveSidebarItem(name: string, offset: -1 | 1) {
      const order = this.orderedSidebarItems.map(item => item.name)
      const index = order.indexOf(name)
      const target = index + offset
      if (index === -1 || target < 0 || target >= order.length)
        return

      order.splice(index, 1)
      order.splice(target, 0, name)
      this.sidebarOrder = order
    },
    toggleSidebarItem(name: string) {
      const item = sidebarNavigation.find(item => item.name === name)
      if (!item || item.required)
        return

      this.sidebarHiddenItems = this.sidebarHiddenItems.includes(name)
        ? this.sidebarHiddenItems.filter(hidden => hidden !== name)
        : [...this.sidebarHiddenItems, name]
    },
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
      this.favoritesRevision++
      this.favoriteAlbumIds = []
      this.pendingAlbumFavorites = []
      this.favoriteSongIds = []
      this.favoritePlaylistIds = []
    },
    async fetchFavoriteSongs() {
      const revision = this.favoritesRevision
      try {
        const res = await getAllFavoritesApi()
        if (revision === this.favoritesRevision)
          this.favoriteSongIds = res.songIds
      }
      catch {
        if (revision === this.favoritesRevision)
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
        throw new LocalizedError('main.failed_to_save_favorite')
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
        throw new LocalizedError('main.failed_to_remove_favorite')
      }
    },
    async fetchFavoritePlaylists() {
      const revision = this.favoritesRevision
      try {
        const res = await getFavoritePlaylistsApi()
        if (revision === this.favoritesRevision)
          this.favoritePlaylistIds = res.items.map(item => item.id)
      }
      catch {
        if (revision === this.favoritesRevision)
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
        throw new LocalizedError('main.failed_to_save_favorite')
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
        throw new LocalizedError('main.failed_to_remove_favorite')
      }
    },
  },
  persist: {
    pick: ['albumLayoutMap', 'regionSongsSort', 'sidebarOrder', 'sidebarHiddenItems', 'randomPlaylistMode', 'randomPlaylistLimit', 'randomPlaylistMinDuration', 'randomPlaylistProducts', 'randomPlaylistDateFrom', 'randomPlaylistDateTo', 'randomPlaylistExcludeAlbums', 'randomPlaylistExcludeInstrumental', 'randomPlaylistAlbums', 'randomPlaylist'],
  },
})
