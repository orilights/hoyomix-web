import type { ExportAlbumListItem } from '@/types/export'
import { defineStore } from 'pinia'

export const useStore = defineStore('main', {
  state: () => ({
    albumList: [] as ExportAlbumListItem[],
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
