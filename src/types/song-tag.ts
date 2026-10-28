import type { PlaylistSongItem } from './core'

export interface SongTagGroup {
  id: number
  name: string
  sortOrder: number
}

export function groupSongTags(tags: SongTag[]) {
  const groups = new Map<number, { value: number, label: string, sortOrder: number, tags: SongTag[] }>()
  for (const tag of tags) {
    const id = tag.groupId ?? 0
    const group = groups.get(id) ?? { value: id, label: tag.group?.name ?? '未分组', sortOrder: tag.group?.sortOrder ?? 0, tags: [] }
    group.tags.push(tag)
    groups.set(id, group)
  }
  return [...groups.values()].sort((a, b) => {
    if (!a.value)
      return b.value ? 1 : 0
    if (!b.value)
      return -1
    return a.sortOrder - b.sortOrder || a.value - b.value
  }).map(group => ({ ...group, tags: group.tags.sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id) }))
}

export interface SongTag {
  id: number
  code: string
  name: string
  groupId: number | null
  group: SongTagGroup | null
  description: string
  sortOrder: number
  enabled: boolean
  songCount?: number
}

export interface SongTagPatch { add?: number[], remove?: number[] }
export interface SongTagSongsParams { productId?: number, page: number, sort: 'album_asc' | 'album_desc' }
export interface SongTagSongsResponse { items: PlaylistSongItem[], total: number, page: number, limit: number }
