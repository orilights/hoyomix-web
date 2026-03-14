import type { ExportAlbumListItem } from '@/types/export'
import { defineStore } from 'pinia'

export const useStore = defineStore('main', {
  state: () => ({
    albumList: [] as ExportAlbumListItem[],

    backgroundUrl: '',

    pageLoading: false,
    pageLoadKey: '',
  }),
  actions: {
    setBackground(url = '') {
      this.backgroundUrl = url
    },

    setPageLoading(key: string) {
      this.pageLoading = true
      this.pageLoadKey = key
    },

    setPageLoaded(key: string) {
      if (this.pageLoadKey === key) {
        this.pageLoading = false
      }
    },
  },
})
