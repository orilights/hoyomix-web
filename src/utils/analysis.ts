import type { AnalysisSegment } from '@/types/song-analysis'

/** 时间轴标注取整秒，详细时间默认保留十分之一秒。 */
export function formatAnalysisTime(seconds: number, precision: 'seconds' | 'tenths' = 'tenths') {
  const tenths = precision === 'seconds' ? Math.floor(seconds) * 10 : Math.round(seconds * 10)
  const minutes = Math.floor(tenths / 600)
  const remainder = tenths % 600
  return `${minutes}:${String(Math.floor(remainder / 10)).padStart(2, '0')}${remainder % 10 ? `.${remainder % 10}` : ''}`
}

/** 边界归入下一段，全曲结束位置仍保留最后一段高亮。 */
export function findAnalysisSegment(segments: AnalysisSegment[], time: number) {
  const index = segments.findIndex((segment, index) =>
    time >= segment.start_seconds
    && (time < segment.end_seconds || (index === segments.length - 1 && time === segment.end_seconds)),
  )
  return index < 0 ? undefined : index
}
