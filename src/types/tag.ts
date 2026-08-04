export interface VideoSource {
  source: string
  link: string
  id: string
  coverUrl: string
  duration?: number
}

export interface VideoTagData {
  sources: VideoSource[]
}
