export interface SleepTimerPreferences {
  mode: 'duration' | 'songs'
  minutes: number
  songs: number
  finishCurrentSong: boolean
}

export interface SleepTimerState {
  status: 'off' | 'running' | 'waiting'
  mode: SleepTimerPreferences['mode']
  deadline: number
  remainingSongs: number
  finishCurrentSong: boolean
}

export function normalizeSleepTimerPreferences(value: Partial<SleepTimerPreferences> = {}): SleepTimerPreferences {
  const minutes = Number.isFinite(value.minutes) ? Math.round(value.minutes! / 5) * 5 : 30
  const songs = Number.isFinite(value.songs) ? Math.round(value.songs!) : 5
  return {
    mode: value.mode === 'songs' ? 'songs' : 'duration',
    minutes: Math.max(5, Math.min(120, minutes)),
    songs: Math.max(1, Math.min(50, songs)),
    finishCurrentSong: value.finishCurrentSong === true,
  }
}

export function createSleepTimerState(): SleepTimerState {
  return { status: 'off', mode: 'duration', deadline: 0, remainingSongs: 0, finishCurrentSong: false }
}

export function startSleepTimer(preferences: SleepTimerPreferences, now: number): SleepTimerState {
  const settings = normalizeSleepTimerPreferences(preferences)
  return {
    status: 'running',
    mode: settings.mode,
    deadline: settings.mode === 'duration' ? now + settings.minutes * 60_000 : 0,
    remainingSongs: settings.mode === 'songs' ? settings.songs : 0,
    finishCurrentSong: settings.finishCurrentSong,
  }
}

// 返回 true 表示需要暂停；由播放控制层负责关闭任务并暂停音频。
export function checkSleepTimer(state: SleepTimerState, now: number, isPlaying: boolean, hasSong: boolean): boolean {
  if (state.status !== 'running' || state.mode !== 'duration' || now < state.deadline)
    return false
  if (state.finishCurrentSong && isPlaying && hasSong) {
    state.status = 'waiting'
    return false
  }
  return true
}

export function consumeSleepTimerSong(state: SleepTimerState): boolean {
  if (state.status === 'waiting')
    return true
  if (state.status !== 'running' || state.mode !== 'songs')
    return false
  state.remainingSongs = Math.max(0, state.remainingSongs - 1)
  return state.remainingSongs === 0
}

export function getSleepTimerLabel(state: SleepTimerState, now: number): string {
  if (state.status === 'off')
    return '定时播放'
  if (state.status === 'waiting')
    return '播放完当前歌曲后暂停'
  if (state.mode === 'songs')
    return `剩余 ${state.remainingSongs} 首歌曲`
  const seconds = Math.max(0, Math.ceil((state.deadline - now) / 1000))
  return `剩余 ${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`
}
