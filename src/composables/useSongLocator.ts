import type { MaybeRefOrGetter } from 'vue'
import { toValue } from 'vue'
import { usePlayerStore } from '@/store/player'

/**
 * 歌曲列表页（专辑/歌单/榜单/随机/艺术家）注册本页歌曲 id，
 * 供悬浮定位按钮判断“当前播放歌曲是否在本页列表中”并滚动定位。
 * 因页面组件随路由销毁重建，注册状态放在模块级共享；
 * 用 owner token 避免旧页面卸载时清掉新页面的注册。
 */
interface SongListRegistration {
  songIds: MaybeRefOrGetter<number[]>
  /** 定位前执行（例如切回歌曲 Tab、展开折叠的分组） */
  onBeforeLocate?: () => void | Promise<void>
}

const registration = shallowRef<SongListRegistration | null>(null)
let owner: object | null = null

export function registerSongList(options: SongListRegistration) {
  const token = {}
  owner = token
  registration.value = options

  onScopeDispose(() => {
    // 仅清理本页面建立且未被新页面覆盖的注册
    if (owner === token) {
      owner = null
      registration.value = null
    }
  })
}

export function useSongLocator() {
  const player = usePlayerStore()

  const currentSongId = computed(() => player.currentSong?.songId ?? null)

  const isCurrentSongInList = computed(() => {
    const songId = currentSongId.value
    if (songId === null || !registration.value)
      return false
    return toValue(registration.value.songIds).includes(songId)
  })

  async function locateCurrentSong() {
    const songId = currentSongId.value
    const current = registration.value
    if (songId === null || !current)
      return
    await current.onBeforeLocate?.()
    await nextTick()
    document
      .querySelector(`[data-song-id="${songId}"]`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return { currentSongId, isCurrentSongInList, locateCurrentSong }
}
