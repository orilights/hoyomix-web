import type { AudioQuality, FullscreenCoverShape, LyricsSource, MobileFullscreenLayout, PlaylistItem, PlayMode, SongListPlayBehavior, SongMediaItem } from '@/types/player'
import type { SleepTimerPreferences } from '@/utils/sleep-timer'
import { defineStore } from 'pinia'
import { toast } from 'vue-sonner'
import { getLyricsApi, getSongMediaApi } from '@/api/music'
import { audioQualityOptions } from '@/constants'
import { t } from '@/i18n'
import { clearMediaSession, getAvailableQualities, parseSongMediaResponse, selectLyricProvider, selectMediaUrlsWithSource, setupMediaSessionHandlers, updateMediaSession } from '@/utils'
import { getAudioPlayer } from '@/utils/player'
import { queryClient } from '@/utils/query-client'
import { createShuffleState, getShuffleNextId, getShufflePrevId, normalizeShuffleState, recordShuffleSong } from '@/utils/shuffle'
import { checkSleepTimer, consumeSleepTimerSong, startSleepTimer as createRunningSleepTimer, createSleepTimerState, normalizeSleepTimerPreferences } from '@/utils/sleep-timer'
import { createSpectrumSettings, normalizeSpectrumSettings } from '@/utils/spectrum'
import { useMediaSourceStore } from './media-source'

export const usePlayerStore = defineStore('player', {
  state: () => ({
    // 持久化字段
    playlist: [] as PlaylistItem[],
    currentIndex: -1,
    playMode: 'sequential' as PlayMode,
    shuffleState: createShuffleState(),
    songListPlayBehavior: 'ask' as SongListPlayBehavior,
    volume: 0.8,
    quality: 5 as AudioQuality,
    showSpectrum: false,
    spectrumSettings: createSpectrumSettings(),
    enableAudioContext: true,
    enableMediaSession: true,
    showTranslation: true,
    showFullscreenLyrics: true,
    lyricsOffset: 0,
    lyricsFontSize: 16,
    lyricsSource: 'ncm' as LyricsSource,
    useWordLyrics: true,
    mobileFullscreenLayout: 'cover' as MobileFullscreenLayout,
    fullscreenCoverShape: 'square' as FullscreenCoverShape,
    fullscreenCoverRotation: true,
    fullscreenCoverBorder: true,
    immersiveModeEnabled: true,
    sleepTimerPreferences: normalizeSleepTimerPreferences(),

    // 运行时状态
    isPlaying: false,
    currentMediaItems: [] as SongMediaItem[],
    availableQualities: new Set<AudioQuality>(),
    currentTime: 0,
    duration: 0,
    bufferedEnd: 0,
    isLoading: false,
    isFullscreen: false,
    isImmersive: false,
    immersiveControlsVisible: true,
    lyricData: '',
    lyricRequestRevision: 0,
    lyricTranslation: '',
    showPlaylist: false,
    consecutiveErrorCount: 0,
    isRecoveringFromError: false,
    sleepTimer: createSleepTimerState(),
    sleepTimerNow: Date.now(),
    playbackRequestId: 0,
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
      if (state.playMode === 'shuffle')
        return getShufflePrevId(state.shuffleState) !== undefined
      if (state.playMode === 'loop')
        return true
      return state.currentIndex > 0
    },
    shuffleNextSong: state => state.playlist.find(song => song.songId === getShuffleNextId(state.shuffleState)) ?? null,
    shufflePrevSong: state => state.playlist.find(song => song.songId === getShufflePrevId(state.shuffleState)) ?? null,
  },

  actions: {
    syncShuffleState() {
      this.shuffleState = normalizeShuffleState(this.shuffleState, this.playlist.map(song => song.songId), this.currentSong?.songId)
    },

    startSleepTimer(preferences?: SleepTimerPreferences) {
      this.sleepTimerPreferences = normalizeSleepTimerPreferences(preferences ?? this.sleepTimerPreferences)
      this.sleepTimerNow = Date.now()
      this.sleepTimer = createRunningSleepTimer(this.sleepTimerPreferences, this.sleepTimerNow)
    },

    cancelSleepTimer() {
      this.sleepTimer = createSleepTimerState()
    },

    completeSleepTimer() {
      this.cancelSleepTimer()
      // 使仍在获取音源的播放请求失效，防止到时后恢复自动播放。
      this.playbackRequestId++
      const player = getAudioPlayer()
      player.pause()
      if (this.isLoading)
        player.urls = []
      this.isPlaying = false
      this.isLoading = false
    },

    checkSleepTimer(): boolean {
      this.sleepTimerNow = Date.now()
      if (checkSleepTimer(this.sleepTimer, this.sleepTimerNow, this.isPlaying, !!this.currentSong)) {
        this.completeSleepTimer()
        return true
      }
      return false
    },

    beforeSongTransition(): boolean {
      if (this.checkSleepTimer())
        return true
      if (this.currentSong && consumeSleepTimerSong(this.sleepTimer)) {
        this.completeSleepTimer()
        return true
      }
      return false
    },

    async onSongEnded() {
      if (!this.beforeSongTransition())
        await this.playNext(false)
    },

    initPlayer() {
      const player = getAudioPlayer()
      player.setVolume(this.volume)
      player.setAudioContextEnabled(this.enableAudioContext)

      this.setMediaSessionEnabled(this.enableMediaSession)

      player.on('play', () => {
        this.isPlaying = true
        if (this.checkSleepTimer())
          return
        if (this.enableMediaSession && 'mediaSession' in navigator)
          navigator.mediaSession.playbackState = 'playing'
      })
      player.on('pause', () => {
        this.isPlaying = false
        if (this.enableMediaSession && 'mediaSession' in navigator)
          navigator.mediaSession.playbackState = 'paused'
      })
      player.on('timeupdate', (time: number) => {
        this.currentTime = time
        if (this.enableMediaSession && 'mediaSession' in navigator && this.duration > 0) {
          try {
            navigator.mediaSession.setPositionState({ duration: this.duration, playbackRate: 1, position: time })
          }
          catch {}
        }
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
        this.onSongEnded()
      })
      player.on('error', () => {
        if (this.checkSleepTimer())
          return
        if (this.sleepTimer.status === 'waiting') {
          this.completeSleepTimer()
          return
        }
        if (this.isRecoveringFromError) {
          this.consecutiveErrorCount++
          return
        }
        this.isRecoveringFromError = true
        this.consecutiveErrorCount++

        if (this.consecutiveErrorCount >= 2) {
          toast.error(t('player.audio_service_is_temporarily_unavailable_please_try_again_later'))
          this.isPlaying = false
          this.isLoading = false
          player.pause()
          player.urls = []
          this.isRecoveringFromError = false
          return
        }

        // 播放出错时尝试下一首
        if (this.playlist.length > 1) {
          toast.error(t('player.playback_failed_skipped_to_the_next_song'), { duration: 2000 })
          this.playNext(false).finally(() => {
            this.isRecoveringFromError = false
          })
        }
        else {
          toast.error(t('player.playback_failed'))
          this.isPlaying = false
          this.isLoading = false
          this.isRecoveringFromError = false
        }
      })
    },

    async playSong(index: number, countTransition = true, historyIndex?: number) {
      if (index < 0 || index >= this.playlist.length)
        return
      if (this.checkSleepTimer())
        return
      if (countTransition && (index !== this.currentIndex || this.sleepTimer.status === 'waiting') && this.beforeSongTransition())
        return

      this.syncShuffleState()
      const song = this.playlist[index]
      if (historyIndex !== undefined) {
        this.shuffleState.cursor = historyIndex
      }
      else if (this.shuffleState.history[this.shuffleState.cursor] !== song.songId) {
        recordShuffleSong(this.shuffleState, song.songId)
      }
      const requestId = ++this.playbackRequestId
      this.currentIndex = index

      // 立即重置播放状态，不等待加载完成
      this.currentTime = 0
      this.duration = 0
      this.bufferedEnd = 0
      this.isLoading = true
      this.lyricData = ''
      this.lyricTranslation = ''
      this.fetchLyric()

      const mediaSource = useMediaSourceStore()
      const preferredSource = mediaSource.effectiveSource

      try {
        const data = await queryClient.fetchQuery({
          queryKey: ['songMedia', song.songId, preferredSource ?? 'default'],
          queryFn: () => getSongMediaApi(song.songId),
          staleTime: 1000 * 60 * 5,
        })
        if (requestId !== this.playbackRequestId || this.checkSleepTimer())
          return
        this.currentMediaItems = parseSongMediaResponse(data)
        this.availableQualities = getAvailableQualities(this.currentMediaItems)
      }
      catch (error) {
        if (requestId !== this.playbackRequestId)
          return
        this.currentMediaItems = []
        this.availableQualities = new Set()
        this.isPlaying = false
        this.isLoading = false
        toast.error(t('player.failed_to_load_song', { p0: error instanceof Error ? error.message : t('App.unknown_error') }))
        return
      }

      const urls = selectMediaUrlsWithSource(this.currentMediaItems, this.quality, preferredSource)
      if (urls.length === 0) {
        this.isPlaying = false
        this.isLoading = false
        toast.error(t('player.no_audio_available_for_this_song'))
        return
      }

      const player = getAudioPlayer()
      await player.loadSong(urls)
      if (requestId !== this.playbackRequestId || this.checkSleepTimer())
        return
      await player.play()
      if (this.enableMediaSession)
        updateMediaSession(song)
    },

    async togglePlay() {
      if (this.checkSleepTimer())
        return
      if (this.isLoading) {
        return
      }
      // 用户手动操作，重置连续错误计数
      this.consecutiveErrorCount = 0
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

    async playNext(countTransition = true) {
      if (this.playlist.length === 0)
        return

      let nextIndex: number

      switch (this.playMode) {
        case 'single':
          nextIndex = this.currentIndex
          break
        case 'shuffle': {
          this.syncShuffleState()
          const songId = getShuffleNextId(this.shuffleState)
          nextIndex = this.playlist.findIndex(song => song.songId === songId)
          break
        }
        case 'loop':
          nextIndex = (this.currentIndex + 1) % this.playlist.length
          break
        default: // sequential
          if (this.currentIndex < this.playlist.length - 1) {
            nextIndex = this.currentIndex + 1
          }
          else {
            toast.info(t('player.this_is_the_last_song'))
            return
          }
      }

      if (countTransition && this.beforeSongTransition())
        return
      const historyIndex = this.playMode === 'shuffle' && this.shuffleState.cursor + 1 < this.shuffleState.history.length
        ? this.shuffleState.cursor + 1
        : undefined
      // 单曲队列也会开启新一轮，但重新加载当前歌曲不会新增历史。
      if (this.playMode === 'shuffle' && historyIndex === undefined && nextIndex === this.currentIndex) {
        recordShuffleSong(this.shuffleState, this.playlist[nextIndex].songId)
      }
      await this.playSong(nextIndex, false, historyIndex)
    },

    async playPrev() {
      if (this.playlist.length === 0)
        return

      let prevIndex: number

      switch (this.playMode) {
        case 'single':
          prevIndex = this.currentIndex
          break
        case 'shuffle': {
          this.syncShuffleState()
          const songId = getShufflePrevId(this.shuffleState)
          if (songId === undefined)
            return
          prevIndex = this.playlist.findIndex(song => song.songId === songId)
          break
        }
        case 'loop':
          prevIndex = (this.currentIndex - 1 + this.playlist.length) % this.playlist.length
          break
        default: // sequential
          if (this.currentIndex > 0) {
            prevIndex = this.currentIndex - 1
          }
          else {
            toast.info(t('player.this_is_the_first_song'))
            return
          }
      }

      if (this.beforeSongTransition())
        return
      await this.playSong(prevIndex, false, this.playMode === 'shuffle' ? this.shuffleState.cursor - 1 : undefined)
    },

    async replacePlaylist(items: PlaylistItem[], startIndex = 0) {
      if (items.length > 0 && this.beforeSongTransition())
        return
      if (!items.length) {
        this.clearPlaylist()
        return
      }
      this.playbackRequestId++
      this.playlist = items
      this.currentIndex = -1
      this.shuffleState = createShuffleState(items.map(song => song.songId))
      // 用户手动操作，重置连续错误计数
      this.consecutiveErrorCount = 0
      if (items.length > 0) {
        await this.playSong(startIndex, false)
      }
    },

    addToPlaylist(item: PlaylistItem): { index: number, isNew: boolean } {
      // 防止重复添加相同歌曲
      const existingIndex = this.playlist.findIndex(i => i.songId === item.songId)
      if (existingIndex === -1) {
        this.syncShuffleState()
        this.playlist.push(item)
        this.syncShuffleState()
        return { index: this.playlist.length - 1, isNew: true }
      }
      return { index: existingIndex, isNew: false }
    },

    async insertNextAndPlay(item: PlaylistItem) {
      const existingIndex = this.playlist.findIndex(song => song.songId === item.songId)
      if (existingIndex === this.currentIndex && existingIndex !== -1) {
        await this.playSong(existingIndex)
        return
      }
      if (this.beforeSongTransition())
        return

      this.syncShuffleState()
      if (existingIndex !== -1) {
        this.playlist.splice(existingIndex, 1)
        if (existingIndex < this.currentIndex)
          this.currentIndex--
      }

      const nextIndex = this.currentIndex >= 0 ? this.currentIndex + 1 : 0
      this.playlist.splice(nextIndex, 0, item)
      this.consecutiveErrorCount = 0
      await this.playSong(nextIndex, false)
    },

    setSongListPlayBehavior(behavior: SongListPlayBehavior) {
      this.songListPlayBehavior = behavior
    },

    removeFromPlaylist(index: number) {
      if (index < 0 || index >= this.playlist.length)
        return

      this.syncShuffleState()
      const wasPlaying = index === this.currentIndex
      const currentId = this.currentSong?.songId
      const stopPlayback = wasPlaying && this.beforeSongTransition()
      this.playlist.splice(index, 1)
      this.shuffleState = normalizeShuffleState(this.shuffleState, this.playlist.map(song => song.songId), wasPlaying ? undefined : currentId)

      if (this.playlist.length === 0) {
        this.clearPlaylist()
        return
      }

      if (wasPlaying) {
        // 被删除的是当前歌曲，随机模式沿用剩余顺序或前进历史。
        this.playbackRequestId++
        this.currentIndex = -1
        const newIndex = this.playMode === 'shuffle'
          ? this.playlist.findIndex(song => song.songId === getShuffleNextId(this.shuffleState))
          : Math.min(index, this.playlist.length - 1)
        if (stopPlayback) {
          this.currentIndex = newIndex
          getAudioPlayer().urls = []
          this.syncShuffleState()
        }
        else if (this.playMode === 'shuffle') {
          void this.playNext(false)
        }
        else {
          void this.playSong(newIndex, false)
        }
      }
      else if (index < this.currentIndex) {
        this.currentIndex--
      }
    },

    clearPlaylist() {
      if (this.sleepTimer.status === 'waiting')
        this.completeSleepTimer()
      this.playbackRequestId++
      this.playlist = []
      this.shuffleState = createShuffleState()
      this.currentIndex = -1
      this.isPlaying = false
      this.currentTime = 0
      this.duration = 0
      this.bufferedEnd = 0
      this.lyricData = ''
      this.lyricTranslation = ''
      getAudioPlayer().pause()
      clearMediaSession()
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

      const label = audioQualityOptions.find(o => o.value === q)?.label ?? ''
      if (label)
        toast.success(t('player.switched_to_audio_quality', { p0: label }))

      if (!this.currentSong || this.currentMediaItems.length === 0)
        return

      const savedTime = this.currentTime
      const wasPlaying = this.isPlaying
      const requestId = this.playbackRequestId

      const urls = selectMediaUrlsWithSource(this.currentMediaItems, q, useMediaSourceStore().effectiveSource)
      if (urls.length === 0)
        return

      const player = getAudioPlayer()
      await player.loadSong(urls)

      const onCanPlay = async () => {
        player.off('canplay', onCanPlay)
        player.seek(savedTime)
        if (wasPlaying && requestId === this.playbackRequestId && !this.checkSleepTimer()) {
          await player.play()
        }
      }
      player.on('canplay', onCanPlay)
    },

    async reloadCurrentSong() {
      if (!this.currentSong)
        return
      const wasPlaying = this.isPlaying
      await this.playSong(this.currentIndex, false)
      if (!wasPlaying) {
        getAudioPlayer().pause()
      }
    },

    togglePlayMode() {
      this.syncShuffleState()
      const modes: PlayMode[] = ['sequential', 'loop', 'single', 'shuffle']
      const currentIdx = modes.indexOf(this.playMode)
      this.playMode = modes[(currentIdx + 1) % modes.length]
    },

    toggleSpectrum() {
      this.showSpectrum = !this.showSpectrum
    },

    toggleTranslation() {
      this.showTranslation = !this.showTranslation
    },

    toggleFullscreenLyrics() {
      this.showFullscreenLyrics = !this.showFullscreenLyrics
    },

    setLyricsSource(source: LyricsSource) {
      this.lyricsSource = source
      this.fetchLyric()
    },

    setMobileFullscreenLayout(layout: MobileFullscreenLayout) {
      this.mobileFullscreenLayout = layout
    },

    setFullscreenCoverShape(shape: FullscreenCoverShape) {
      this.fullscreenCoverShape = shape
    },

    setImmersiveModeEnabled(enabled: boolean) {
      this.immersiveModeEnabled = enabled
      if (this.isFullscreen)
        this.setImmersive(enabled)
    },

    setMediaSessionEnabled(enabled: boolean) {
      this.enableMediaSession = enabled
      if (!enabled) {
        setupMediaSessionHandlers(null)
        clearMediaSession()
        return
      }
      setupMediaSessionHandlers({
        play: () => {
          if (!this.isPlaying)
            this.togglePlay()
        },
        pause: () => {
          if (this.isPlaying)
            this.togglePlay()
        },
        playNext: () => this.playNext(),
        playPrev: () => this.playPrev(),
        seek: (time: number) => this.seek(time),
      })
      if (this.currentSong)
        updateMediaSession(this.currentSong)
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = this.currentSong ? (this.isPlaying ? 'playing' : 'paused') : 'none'
        if (Number.isFinite(this.duration) && this.duration > 0) {
          try {
            navigator.mediaSession.setPositionState({ duration: this.duration, playbackRate: 1, position: Math.max(0, Math.min(this.currentTime, this.duration)) })
          }
          catch {}
        }
      }
    },

    setAudioContextEnabled(enabled: boolean) {
      this.enableAudioContext = enabled
      getAudioPlayer().setAudioContextEnabled(enabled)
      if (!enabled && this.showSpectrum) {
        this.showSpectrum = false
      }
    },

    setFullscreen(value: boolean) {
      this.isFullscreen = value
      this.setImmersive(value && this.immersiveModeEnabled)
    },

    setImmersive(value: boolean) {
      this.isImmersive = value
      if (value) {
        this.immersiveControlsVisible = true
      }
    },

    setImmersiveControlsVisible(value: boolean) {
      this.immersiveControlsVisible = value
    },

    fetchLyric() {
      const revision = ++this.lyricRequestRevision
      const song = this.currentSong
      if (!song) {
        this.lyricData = ''
        this.lyricTranslation = ''
        return
      }

      const provider = song.platforms ? selectLyricProvider(song.platforms, this.lyricsSource) : null
      if (!provider) {
        this.lyricData = ''
        this.lyricTranslation = ''
        return
      }

      getLyricsApi(provider, song.songId)
        .then((data) => {
          // 确认仍然是同一首歌
          if (this.lyricRequestRevision === revision && this.currentSong?.songId === song.songId) {
            this.lyricData = data.content
            this.lyricTranslation = data.translation ?? ''
          }
        })
        .catch(() => {
          if (this.lyricRequestRevision !== revision || this.currentSong?.songId !== song.songId)
            return
          this.lyricData = ''
          this.lyricTranslation = ''
        })
    },
  },

  persist: {
    afterHydrate: ({ store }) => {
      store.syncShuffleState()
      store.sleepTimerPreferences = normalizeSleepTimerPreferences(store.sleepTimerPreferences ?? {})
      if (typeof store.enableMediaSession !== 'boolean')
        store.enableMediaSession = true
      if (!['ask', 'replace', 'insert-next'].includes(store.songListPlayBehavior))
        store.songListPlayBehavior = 'ask'
      store.spectrumSettings = normalizeSpectrumSettings(store.spectrumSettings ?? {})
      if (store.mobileFullscreenLayout !== 'lyrics' && store.mobileFullscreenLayout !== 'cover')
        store.mobileFullscreenLayout = 'cover'
      if (store.fullscreenCoverShape !== 'square' && store.fullscreenCoverShape !== 'circle')
        store.fullscreenCoverShape = 'square'
      if (typeof store.fullscreenCoverRotation !== 'boolean')
        store.fullscreenCoverRotation = false
      if (typeof store.fullscreenCoverBorder !== 'boolean')
        store.fullscreenCoverBorder = false
      if (typeof store.immersiveModeEnabled !== 'boolean')
        store.immersiveModeEnabled = true
      if (typeof store.useWordLyrics !== 'boolean')
        store.useWordLyrics = true
      if (typeof store.showFullscreenLyrics !== 'boolean')
        store.showFullscreenLyrics = true
    },
    pick: [
      'playlist',
      'currentIndex',
      'playMode',
      'shuffleState',
      'songListPlayBehavior',
      'volume',
      'quality',
      'showSpectrum',
      'spectrumSettings',
      'enableAudioContext',
      'enableMediaSession',
      'showTranslation',
      'showFullscreenLyrics',
      'lyricsOffset',
      'lyricsFontSize',
      'lyricsSource',
      'useWordLyrics',
      'mobileFullscreenLayout',
      'fullscreenCoverShape',
      'fullscreenCoverRotation',
      'fullscreenCoverBorder',
      'immersiveModeEnabled',
      'sleepTimerPreferences',
    ],
  },
})
