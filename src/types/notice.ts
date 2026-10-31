export interface Notice {
  key: string
  title: string
  defaultTitle?: boolean
  summary: string
  publishedAt: string | null
  important: boolean
  content: string
}
