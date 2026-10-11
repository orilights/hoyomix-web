export function normalizeRecentEmoticons(value: unknown): string[] {
  if (!Array.isArray(value))
    return []
  return [...new Set(value.filter((id): id is string => typeof id === 'string' && id.length > 0))].slice(0, 100)
}

export function rememberRecentEmoticon(value: unknown, id: string) {
  return [id, ...normalizeRecentEmoticons(value).filter(previous => previous !== id)].slice(0, 100)
}
