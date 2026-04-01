import type { ExportAlbumListItem } from '@/types/export'
import { defineStore } from 'pinia'

export const useStore = defineStore('main', {
  state: () => ({
    albumList: [] as ExportAlbumListItem[],
    backgroundUrl: '',
    showSearch: false,
  }),
  actions: {
    setBackground(url = '') {
      this.backgroundUrl = url
    },
  },
})
