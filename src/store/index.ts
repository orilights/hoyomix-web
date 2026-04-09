import type { AlbumListItemInfo } from '@/types/core'
import { defineStore } from 'pinia'

export const useStore = defineStore('main', {
  state: () => ({
    albumList: [] as AlbumListItemInfo[],
    backgroundUrl: '',
    showSearch: false,
    albumLayoutMap: {} as Record<string, 'grid' | 'list'>,
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
    pick: ['albumLayoutMap'],
  },
})
