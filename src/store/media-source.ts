import type { MediaSourceConfig } from '@/types/core'
import type { MediaSourceSelection } from '@/types/player'
import { defineStore } from 'pinia'
import { pingMediaSource } from '@/api/music'

// 每个源的延迟测试轮数
const LATENCY_TEST_ROUNDS = 3
// 每个源完成全部测试轮数的总时限（毫秒），超时视为测试失败
const LATENCY_TEST_TIMEOUT = 3000

export const useMediaSourceStore = defineStore('media-source', () => {
  // 媒体源配置列表
  const sources = ref<MediaSourceConfig[]>([])
  // 用户选择的媒体源，'auto' 表示自动选择
  const selectedSource = ref<MediaSourceSelection>('auto')
  // 自动模式下优先使用的节点（延迟最低）
  const autoPreferredNode = ref<string | null>(null)
  // 各源平均延迟（毫秒）
  const latencyResults = ref<Record<string, number>>({})
  // 是否正在测试延迟
  const isTestingLatency = ref(false)
  // 配置是否已加载完成
  const isLoaded = ref(false)

  // 实际生效的优先节点：自动模式下取延迟最低节点，否则取用户手动选择的源
  const effectiveSource = computed<string | null>(() => {
    if (selectedSource.value === 'auto')
      return autoPreferredNode.value
    return selectedSource.value
  })

  // 测试所有源的延迟，多轮取平均，将延迟最低的源设为自动优先节点
  async function testLatency() {
    if (sources.value.length === 0)
      return
    isTestingLatency.value = true
    try {
      const results = await Promise.all(sources.value.map(async (source) => {
        // 3 秒内未完成全部测试轮数视为该源测试失败
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), LATENCY_TEST_TIMEOUT)
        try {
          let total = 0
          let count = 0
          for (let i = 0; i < LATENCY_TEST_ROUNDS; i++) {
            if (controller.signal.aborted)
              return { name: source.name, latency: null }
            const latency = await pingMediaSource(source.baseUrl, controller.signal)
            if (latency !== null) {
              total += latency
              count++
            }
          }
          return { name: source.name, latency: count > 0 ? total / count : null }
        }
        finally {
          clearTimeout(timer)
        }
      }))

      const nextResults: Record<string, number> = {}
      let bestName: string | null = null
      let bestLatency = Infinity
      for (const { name, latency } of results) {
        if (latency !== null) {
          nextResults[name] = latency
          if (latency < bestLatency) {
            bestLatency = latency
            bestName = name
          }
        }
      }
      latencyResults.value = nextResults
      autoPreferredNode.value = bestName
    }
    finally {
      isTestingLatency.value = false
    }
  }

  // 获取媒体源配置，并后台测试各源延迟
  async function fetchAndConfigure(sourceList: MediaSourceConfig[]) {
    try {
      sources.value = sourceList
    }
    catch (err) {
      console.warn('获取媒体源配置失败:', err)
    }
    finally {
      isLoaded.value = true
    }
    await testLatency()
  }

  // 选择媒体源（'auto' 或具体源名称）
  function selectSource(source: MediaSourceSelection) {
    selectedSource.value = source
  }

  return {
    sources,
    selectedSource,
    autoPreferredNode,
    latencyResults,
    isTestingLatency,
    isLoaded,
    effectiveSource,
    fetchAndConfigure,
    testLatency,
    selectSource,
  }
}, {
  persist: {
    pick: ['selectedSource', 'autoPreferredNode'],
  },
})
