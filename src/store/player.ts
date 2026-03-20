import type { AudioQuality, PlaylistItem, PlayMode, SongMediaItem } from '@/types/player'
import { defineStore } from 'pinia'
import { getLyricsApi, getSongMediaApi } from '@/api'
import { getAvailableQualities, parseSongMedia, selectMediaUrls } from '@/utils'
import { getAudioPlayer } from '@/utils/player'

export const usePlayerStore = defineStore('player', {
  state: () => ({
    // 持久化字段
    playlist: [] as PlaylistItem[],
    currentIndex: -1,
    playMode: 'sequential' as PlayMode,
    volume: 0.8,
    quality: 5 as AudioQuality,
    showSpectrum: false,

    // 运行时状态
    isPlaying: false,
    currentMediaItems: [] as SongMediaItem[],
    availableQualities: new Set<AudioQuality>(),
    currentTime: 0,
    duration: 0,
    bufferedEnd: 0,
    isLoading: false,
    isFullscreen: false,
    lyricData: '',
    showPlaylist: false,
  }),

  getters: {
    currentSong: (state) => {
      if (state.currentIndex >= 0 && state.currentIndex < state.playlist.length) {
        return state.playlist[state.currentIndex]
      }
      return null
    },
    hasNext: (state) => {
      if (state.playlist.length === 0)
        return false
      if (state.playMode === 'loop' || state.playMode === 'shuffle')
        return true
      return state.currentIndex < state.playlist.length - 1
    },
    hasPrev: (state) => {
      if (state.playlist.length === 0)
        return false
      if (state.playMode === 'loop' || state.playMode === 'shuffle')
        return true
      return state.currentIndex > 0
    },
  },

  actions: {
    initPlayer() {
      const player = getAudioPlayer()
      player.setVolume(this.volume)

      player.on('play', () => {
        this.isPlaying = true
      })
      player.on('pause', () => {
        this.isPlaying = false
      })
      player.on('timeupdate', (time: number) => {
        this.currentTime = time
      })
      player.on('durationchange', (dur: number) => {
        this.duration = dur
      })
      player.on('bufferupdate', (end: number) => {
        this.bufferedEnd = end
      })
      player.on('loading', (loading: boolean) => {
        this.isLoading = loading
      })
      player.on('canplay', () => {
        this.isLoading = false
      })
      player.on('ended', () => {
        this.playNext()
      })
      player.on('error', () => {
        // 播放出错时尝试下一首
        if (this.playlist.length > 1) {
          this.playNext()
        }
        else {
          this.isPlaying = false
          this.isLoading = false
        }
      })
    },

    async playSong(index: number) {
      if (index < 0 || index >= this.playlist.length)
        return

      this.currentIndex = index
      const song = this.playlist[index]

      // 立即重置播放状态，不等待加载完成
      this.currentTime = 0
      this.duration = 0
      this.bufferedEnd = 0
      this.isLoading = true
      this.lyricData = ''
      this.fetchLyric()

      try {
        const res = await getSongMediaApi(song.songId)
        const data = await res.json()
        this.currentMediaItems = parseSongMedia(data.medias)
        this.availableQualities = getAvailableQualities(this.currentMediaItems)
      }
      catch {
        this.currentMediaItems = []
        this.availableQualities = new Set()
        this.isPlaying = false
        this.isLoading = false
        return
      }

      const urls = selectMediaUrls(this.currentMediaItems, this.quality)
      if (urls.length === 0) {
        this.isPlaying = false
        this.isLoading = false
        return
      }

      const player = getAudioPlayer()
      await player.loadSong(urls)
      await player.play()
    },

    async togglePlay() {
      if (this.isLoading) {
        return
      }
      const player = getAudioPlayer()
      if (this.isPlaying) {
        player.pause()
      }
      else if (this.currentSong) {
        if (player.urls.length === 0) {
          await this.playSong(this.currentIndex)
        }
        else {
          await player.play()
        }
      }
      else if (this.playlist.length > 0) {
        await this.playSong(0)
      }
    },

    async playNext() {
      if (this.playlist.length === 0)
        return

      let nextIndex: number

      switch (this.playMode) {
        case 'single':
          nextIndex = this.currentIndex
          break
        case 'shuffle':
          if (this.playlist.length === 1) {
            nextIndex = 0
          }
          else {
            do {
              nextIndex = Math.floor(Math.random() * this.playlist.length)
            } while (nextIndex === this.currentIndex)
          }
          break
        case 'loop':
          nextIndex = (this.currentIndex + 1) % this.playlist.length
          break
        default: // sequential
          if (this.currentIndex < this.playlist.length - 1) {
            nextIndex = this.currentIndex + 1
          }
          else {
            this.isPlaying = false
            return
          }
      }

      await this.playSong(nextIndex)
    },

    async playPrev() {
      if (this.playlist.length === 0)
        return

      let prevIndex: number

      switch (this.playMode) {
        case 'single':
          prevIndex = this.currentIndex
          break
        case 'shuffle':
          if (this.playlist.length === 1) {
            prevIndex = 0
          }
          else {
            do {
              prevIndex = Math.floor(Math.random() * this.playlist.length)
            } while (prevIndex === this.currentIndex)
          }
          break
        case 'loop':
          prevIndex = (this.currentIndex - 1 + this.playlist.length) % this.playlist.length
          break
        default: // sequential
          if (this.currentIndex > 0) {
            prevIndex = this.currentIndex - 1
          }
          else {
            return
          }
      }

      await this.playSong(prevIndex)
    },

    async replacePlaylist(items: PlaylistItem[], startIndex = 0) {
      this.playlist = items
      if (items.length > 0) {
        await this.playSong(startIndex)
      }
    },

    addToPlaylist(item: PlaylistItem) {
      // 防止重复添加相同歌曲
      const exists = this.playlist.some(i => i.songId === item.songId)
      if (!exists) {
        this.playlist.push(item)
      }
      return this.playlist.findIndex(i => i.songId === item.songId)!
    },

    removeFromPlaylist(index: number) {
      if (index < 0 || index >= this.playlist.length)
        return

      const wasPlaying = index === this.currentIndex
      this.playlist.splice(index, 1)

      if (this.playlist.length === 0) {
        this.currentIndex = -1
        this.isPlaying = false
        getAudioPlayer().pause()
        return
      }

      if (wasPlaying) {
        // 被删除的是当前歌曲，播放下一首
        const newIndex = Math.min(index, this.playlist.length - 1)
        this.playSong(newIndex)
      }
      else if (index < this.currentIndex) {
        this.currentIndex--
      }
    },

    clearPlaylist() {
      this.playlist = []
      this.currentIndex = -1
      this.isPlaying = false
      this.currentTime = 0
      this.duration = 0
      this.bufferedEnd = 0
      this.lyricData = ''
      getAudioPlayer().pause()
    },

    reorderPlaylist(oldIndex: number, newIndex: number) {
      const item = this.playlist.splice(oldIndex, 1)[0]
      this.playlist.splice(newIndex, 0, item)

      // 更新 currentIndex
      if (this.currentIndex === oldIndex) {
        this.currentIndex = newIndex
      }
      else {
        if (oldIndex < this.currentIndex && newIndex >= this.currentIndex) {
          this.currentIndex--
        }
        else if (oldIndex > this.currentIndex && newIndex <= this.currentIndex) {
          this.currentIndex++
        }
      }
    },

    setVolume(v: number) {
      this.volume = Math.max(0, Math.min(1, v))
      getAudioPlayer().setVolume(this.volume)
    },

    seek(time: number) {
      getAudioPlayer().seek(time)
      this.currentTime = time
    },

    async switchQuality(q: AudioQuality) {
      if (q === this.quality)
        return
      this.quality = q

      if (!this.currentSong || this.currentMediaItems.length === 0)
        return

      const savedTime = this.currentTime
      const wasPlaying = this.isPlaying

      const urls = selectMediaUrls(this.currentMediaItems, q)
      if (urls.length === 0)
        return

      const player = getAudioPlayer()
      await player.loadSong(urls)

      const onCanPlay = async () => {
        player.off('canplay', onCanPlay)
        player.seek(savedTime)
        if (wasPlaying) {
          await player.play()
        }
      }
      player.on('canplay', onCanPlay)
    },

    togglePlayMode() {
      const modes: PlayMode[] = ['sequential', 'loop', 'single', 'shuffle']
      const currentIdx = modes.indexOf(this.playMode)
      this.playMode = modes[(currentIdx + 1) % modes.length]
    },

    toggleSpectrum() {
      this.showSpectrum = !this.showSpectrum
    },

    setFullscreen(value: boolean) {
      this.isFullscreen = value
    },

    fetchLyric() {
      const song = this.currentSong
      if (!song) {
        this.lyricData = ''
        return
      }

      if (!song.platforms || Object.keys(song.platforms).length === 0) {
        this.lyricData = ''
        return
      }

      getLyricsApi(Object.keys(song.platforms)[0] as 'qq' | 'ncm', song.songId)
        .then(res => res.json())
        .then((data) => {
          // 确认仍然是同一首歌
          if (this.currentSong?.songId === song.songId) {
            this.lyricData = data.content
          }
        })
        .catch(() => {
          this.lyricData = ''
        })
    },
  },

  persist: {
    pick: ['playlist', 'currentIndex', 'playMode', 'volume', 'quality', 'showSpectrum'],
  },
})
