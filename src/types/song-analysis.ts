export interface AnalysisKeyword {
  keyword: string
  type: 'primary' | 'secondary'
}

export interface AnalysisSegment {
  start_seconds: number
  end_seconds: number
  summary: string
  style_keywords: AnalysisKeyword[]
  mood_keywords: AnalysisKeyword[]
}

export interface SongAnalysis {
  content_summary: string
  style_summary: string
  mood_summary: string
  arrangement_summary: string
  style_keywords: AnalysisKeyword[]
  mood_keywords: AnalysisKeyword[]
  segments: AnalysisSegment[]
  analyzedAt: string
}
