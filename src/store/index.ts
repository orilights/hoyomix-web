import type { AlbumData } from '@/types/core'
import { defineStore } from 'pinia'

export const useStore = defineStore('main', {
  state: () => ({
    indexData: [] as AlbumData[],

    backgroundUrl: '',
  }),
  getters: {
    albums: state => state.indexData,
  },
  actions: {
    setBackground(url = '') {
      this.backgroundUrl = url
    },
  },
})
