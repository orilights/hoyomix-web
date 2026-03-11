import type { AlbumData } from '@/types/core'
import type { ExportAlbumListItem } from '@/types/export'
import { defineStore } from 'pinia'

export const useStore = defineStore('main', {
  state: () => ({
    albumList: [] as ExportAlbumListItem[],
    indexData: [] as AlbumData[],

    backgroundUrl: '',

    pageLoading: false,
    pageLoadKey: '',
  }),
  getters: {
    albums: state => state.indexData,
  },
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
