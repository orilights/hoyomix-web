export const apiBase = import.meta.env.VITE_API_BASE as string
export const resourceBase = import.meta.env.VITE_RESOURCE_BASE as string
export const feedbackPageUrl = import.meta.env.VITE_FEEDBACK_URL as string
export const productMap: { [key: string]: string }
   = {
     genshin: '原神',
     starrail: '崩坏：星穹铁道',
     zzz: '绝区零',
     honkai3: '崩坏3',
     honkai2: '崩坏学园2',
     wd: '未定事件簿',
   }

export const artistTypeSort = [
  '作曲',
  '编曲',
  '作词',
  '歌手',
  '演唱',
  '人声',
]
