export function formatDuration(duration: number) {
  const hours = Math.floor(duration / 1000 / 60 / 60)
  const minutes = Math.floor(duration / 1000 / 60)
  const seconds = duration % 60
  if (hours) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function getPublishDate(publishTime: number) {
  const date = new Date(publishTime)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
