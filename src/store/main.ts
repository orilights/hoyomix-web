import type { AlbumListItemInfo, ProductListItemInfo } from '@/types/core'
import { defineStore } from 'pinia'

export const useMainStore = defineStore('main', {
  state: () => ({
    productList: [] as ProductListItemInfo[],
    albumList: [] as AlbumListItemInfo[],
    backgroundUrl: '',
    showSearch: false,
    albumLayoutMap: {} as Record<string, 'grid' | 'list'>,
    playlistsTab: 'public' as 'public' | 'mine',
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
    pick: ['albumLayoutMap', 'playlistsTab'],
  },
})
