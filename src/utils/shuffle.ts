export interface ShuffleState {
  knownIds: number[]
  remaining: number[]
  history: number[]
  cursor: number
}

const historyLimit = 200

function shuffle(ids: number[], avoidFirst?: number): number[] {
  const result = [...ids]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  if (result.length > 1 && result[0] === avoidFirst) {
    const j = 1 + Math.floor(Math.random() * (result.length - 1))
    ;[result[0], result[j]] = [result[j], result[0]]
  }
  return result
}

export function createShuffleState(ids: number[] = [], currentId?: number): ShuffleState {
  const knownIds = [...new Set(ids)]
  const state = { knownIds, remaining: shuffle(knownIds), history: [], cursor: -1 }
  if (currentId !== undefined && knownIds.includes(currentId))
    recordShuffleSong(state, currentId)
  return state
}

// 每次选中即消耗本轮名额；回看历史和重新加载当前歌曲不调用此函数。
export function recordShuffleSong(state: ShuffleState, songId: number) {
  state.remaining = state.remaining.filter(id => id !== songId)
  state.history = state.history.slice(0, state.cursor + 1)
  state.history.push(songId)
  state.history = state.history.slice(-historyLimit)
  state.cursor = state.history.length - 1
  // 提前准备下一轮，使界面预览与实际下一首使用同一个结果。
  if (!state.remaining.length)
    state.remaining = shuffle(state.knownIds, songId)
}

export function normalizeShuffleState(value: unknown, ids: number[], currentId?: number): ShuffleState {
  const knownIds = [...new Set(ids)]
  if (!knownIds.length)
    return createShuffleState()
  const saved = value as Partial<ShuffleState> | null
  const isIds = (items: unknown): items is number[] => Array.isArray(items) && items.every(id => Number.isSafeInteger(id))
  if (!saved || !isIds(saved.knownIds) || !isIds(saved.remaining) || !isIds(saved.history)
    || !Number.isInteger(saved.cursor) || saved.cursor! < -1 || saved.cursor! >= saved.history.length) {
    return createShuffleState(knownIds, currentId)
  }

  const validIds = new Set(knownIds)
  const previousIds = new Set(saved.knownIds)
  const remaining = [...new Set(saved.remaining)].filter(id => validIds.has(id))
  // 新增歌曲随机插入剩余顺序，已播放歌曲不会因为队列变动重新加入。
  for (const id of knownIds.filter(id => !previousIds.has(id)))
    remaining.splice(Math.floor(Math.random() * (remaining.length + 1)), 0, id)

  const history = saved.history.filter(id => validIds.has(id))
  let cursor = saved.history.slice(0, saved.cursor! + 1).filter(id => validIds.has(id)).length - 1
  const offset = Math.min(Math.max(0, cursor - historyLimit + 1), Math.max(0, history.length - historyLimit))
  cursor -= offset
  const state = { knownIds, remaining, history: history.slice(offset, offset + historyLimit), cursor }
  if (currentId !== undefined && validIds.has(currentId) && state.history[state.cursor] !== currentId)
    recordShuffleSong(state, currentId)
  else if (!state.remaining.length)
    state.remaining = shuffle(knownIds, currentId)
  return state
}

export function getShuffleNextId(state: ShuffleState): number | undefined {
  return state.history[state.cursor + 1] ?? state.remaining[0]
}

export function getShufflePrevId(state: ShuffleState): number | undefined {
  return state.history[state.cursor - 1]
}

// 每首歌只展示一次：已播放歌曲在前，当前歌曲后面是前进历史和剩余随机顺序。
export function getShuffleQueueIds(state: ShuffleState, currentId?: number): number[] {
  const upcoming = [...new Set([...state.history.slice(state.cursor + 1), ...state.remaining])]
    .filter(id => id !== currentId)
  const upcomingIds = new Set(upcoming)
  const played = [...new Set(state.history.slice(0, state.cursor).reverse())].reverse().filter(id => id !== currentId && !upcomingIds.has(id))
  const ordered = [...played, ...(currentId === undefined ? [] : [currentId]), ...upcoming]
  const included = new Set(ordered)
  return [...state.knownIds.filter(id => !included.has(id)), ...ordered]
}
