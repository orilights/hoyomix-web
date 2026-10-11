export type EmoticonType = 'image' | 'emoji' | 'kaomoji'

export interface Emoticon {
  id: string
  key: string
  name: string
  type: EmoticonType
  value: string
  sortOrder: number
}

export interface EmoticonGroup {
  id: string
  key: string
  name: string
  cover: string | null
  coverType?: 'image' | 'text' | 'emoji'
  sortOrder: number
  emoticons: Emoticon[]
}
