type PlayerEventType
  = | 'play'
    | 'pause'
    | 'ended'
    | 'timeupdate'
    | 'error'
    | 'bufferupdate'
    | 'loading'
    | 'canplay'
    | 'durationchange'

type PlayerEventCallback = (...args: any[]) => void

export class AudioPlayer {
  private audio: HTMLAudioElement
  private audioContext: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private sourceNode: MediaElementAudioSourceNode | null = null
  private listeners = new Map<PlayerEventType, Set<PlayerEventCallback>>()
  private frequencyData: Uint8Array<ArrayBuffer> | null = null
  public urls: string[] = []
  private urlIndex = 0

  constructor() {
    this.audio = new Audio()
    this.audio.crossOrigin = 'anonymous'
    this.bindAudioEvents()
  }

  private initAudioContext() {
    if (this.audioContext)
      return
    this.audioContext = new AudioContext()
    this.sourceNode = this.audioContext.createMediaElementSource(this.audio)
    this.analyser = this.audioContext.createAnalyser()
    this.analyser.fftSize = 256
    this.sourceNode.connect(this.analyser)
    this.analyser.connect(this.audioContext.destination)
    this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount)
  }

  private bindAudioEvents() {
    this.audio.addEventListener('play', () => this.emit('play'))
    this.audio.addEventListener('pause', () => this.emit('pause'))
    this.audio.addEventListener('ended', () => this.emit('ended'))
    this.audio.addEventListener('canplay', () => this.emit('canplay'))

    this.audio.addEventListener('timeupdate', () => {
      this.emit('timeupdate', this.audio.currentTime)
      this.emitBufferUpdate()
    })

    this.audio.addEventListener('durationchange', () => {
      if (this.audio.duration && Number.isFinite(this.audio.duration)) {
        this.emit('durationchange', this.audio.duration)
      }
    })

    this.audio.addEventListener('waiting', () => {
      this.emit('loading', true)
    })

    this.audio.addEventListener('playing', () => {
      this.emit('loading', false)
    })

    this.audio.addEventListener('error', () => {
      // 尝试下一个 URL
      if (this.urlIndex < this.urls.length - 1) {
        this.urlIndex++
        this.loadUrl(this.urls[this.urlIndex])
      }
      else {
        this.emit('error', new Error(this.audio.error?.message || 'Audio load error'))
      }
    })
  }

  private emitBufferUpdate() {
    if (this.audio.buffered.length > 0) {
      const bufferedEnd = this.audio.buffered.end(this.audio.buffered.length - 1)
      this.emit('bufferupdate', bufferedEnd)
    }
  }

  private async loadUrl(url: string) {
    this.emit('loading', true)

    this.audio.src = url
    this.audio.load()
  }

  async loadSong(urls: string[]) {
    this.audio.pause()
    this.urls = urls
    this.urlIndex = 0

    this.initAudioContext()

    if (this.audioContext?.state === 'suspended') {
      await this.audioContext.resume()
    }

    if (urls.length > 0) {
      await this.loadUrl(urls[0])
    }
  }

  async play() {
    this.initAudioContext()
    if (this.audioContext?.state === 'suspended') {
      await this.audioContext.resume()
    }
    await this.audio.play()
  }

  pause() {
    this.audio.pause()
  }

  seek(time: number) {
    if (Number.isFinite(time)) {
      this.audio.currentTime = time
    }
  }

  setVolume(volume: number) {
    this.audio.volume = Math.max(0, Math.min(1, volume))
  }

  get currentTime(): number {
    return this.audio.currentTime
  }

  get duration(): number {
    const d = this.audio.duration
    return Number.isFinite(d) ? d : 0
  }

  get volume(): number {
    return this.audio.volume
  }

  get paused(): boolean {
    return this.audio.paused
  }

  getFrequencyData(): Uint8Array<ArrayBuffer> | null {
    if (!this.analyser || !this.frequencyData)
      return null
    this.analyser.getByteFrequencyData(this.frequencyData)
    return this.frequencyData
  }

  getBufferedEnd(): number {
    if (this.audio.buffered.length > 0) {
      return this.audio.buffered.end(this.audio.buffered.length - 1)
    }
    return 0
  }

  on(event: PlayerEventType, callback: PlayerEventCallback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback)
  }

  off(event: PlayerEventType, callback: PlayerEventCallback) {
    this.listeners.get(event)?.delete(callback)
  }

  private emit(event: PlayerEventType, ...args: any[]) {
    this.listeners.get(event)?.forEach(cb => cb(...args))
  }

  destroy() {
    this.audio.pause()
    this.audio.src = ''
    this.listeners.clear()
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }
  }
}

// 全局单例
let playerInstance: AudioPlayer | null = null

export function getAudioPlayer(): AudioPlayer {
  if (!playerInstance) {
    playerInstance = new AudioPlayer()
  }
  return playerInstance
}
