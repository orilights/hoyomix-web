import type { Emoticon, EmoticonGroup } from '../types/emoticon'

export interface CommentContentPart {
  text: string
  image?: Emoticon
}

export function emoticonInsertion(group: EmoticonGroup, item: Emoticon) {
  return item.type === 'image' ? `[${group.key}:${item.key}]` : item.value
}

export function insertCommentText(content: string, text: string, start: number, end: number, maxLength: number) {
  const from = Math.max(0, Math.min(start, content.length))
  const to = Math.max(from, Math.min(end, content.length))
  const value = content.slice(0, from) + text + content.slice(to)
  return value.length > maxLength ? null : { value, cursor: from + text.length }
}

export function parseCommentContent(content: string, groups: EmoticonGroup[]): CommentContentPart[] {
  const images = new Map<string, Emoticon>()
  for (const group of groups) {
    for (const item of group.emoticons) {
      if (item.type === 'image' && /^https?:\/\//i.test(item.value))
        images.set(`[${group.key}:${item.key}]`, item)
    }
  }
  const parts: CommentContentPart[] = []
  const pattern = /\[[a-z0-9_-]{1,64}:[a-z0-9_-]{1,64}\]/g
  let offset = 0
  for (const match of content.matchAll(pattern)) {
    if (match.index > offset)
      parts.push({ text: content.slice(offset, match.index) })
    const text = match[0]
    parts.push({ text, image: images.get(text) })
    offset = match.index + text.length
  }
  if (offset < content.length)
    parts.push({ text: content.slice(offset) })
  return parts
}
