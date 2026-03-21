<script setup lang="ts">
const props = defineProps<{
  lyricData: string
  currentTime: number
}>()

const emit = defineEmits<{
  seek: [time: number]
}>()

interface LyricLine {
  time: number
  text: string
}

const lyricContainer = ref<HTMLElement>()

const isInit = ref(false)

const lyricTimeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/g

const parsedLyrics = computed<LyricLine[]>(() => {
  if (!props.lyricData)
    return []

  const lines: LyricLine[] = []

  for (const line of props.lyricData.split('\n')) {
    const matches = [...line.matchAll(lyricTimeRegex)]
    if (matches.length === 0)
      continue

    const text = line.replace(lyricTimeRegex, '').trim()
    if (!text)
      continue

    for (const match of matches) {
      const minutes = Number.parseInt(match[1], 10)
      const seconds = Number.parseInt(match[2], 10)
      const ms = Number.parseInt(match[3].padEnd(3, '0'), 10)
      lines.push({
        time: minutes * 60 + seconds + ms / 1000,
        text,
      })
    }
  }

  return lines.sort((a, b) => a.time - b.time)
})

const currentLineIndex = computed(() => {
  const defaultOffset = 0.5

  if (parsedLyrics.value.length === 0)
    return -1

  for (let i = parsedLyrics.value.length - 1; i >= 0; i--) {
    if (props.currentTime + defaultOffset >= parsedLyrics.value[i].time) {
      return i
    }
  }
  return -1
})

// 自动滚动到当前行
watch(currentLineIndex, () => {
  if (!isInit.value) {
    isInit.value = true
    return
  }
  scrollToCurrentLine()
}, { immediate: true })

function scrollToCurrentLine() {
  if (currentLineIndex.value >= 0 && lyricContainer.value) {
    const lines = lyricContainer.value.querySelectorAll('[data-lyric-line]')
    const currentEl = lines[currentLineIndex.value] as HTMLElement
    if (currentEl) {
      const containerHeight = lyricContainer.value.clientHeight
      const targetTop = currentEl.offsetTop - containerHeight / 2 + currentEl.clientHeight / 2
      lyricContainer.value.scrollTo({
        top: targetTop,
        behavior: 'smooth',
      })
    }
  }
}

function onClickLine(line: LyricLine) {
  emit('seek', line.time)
}

onMounted(() => {
  scrollToCurrentLine()
})
</script>

<template>
  <div
    ref="lyricContainer"
    class="lyrics-container h-full overflow-y-auto scrollbar-hide py-[40%]"
    :options="{ scrollbars: undefined }"
  >
    <div v-if="parsedLyrics.length === 0" class="text-white/50 text-center mt-8">
      暂无歌词
    </div>
    <div
      v-for="(line, index) in parsedLyrics"
      :key="index"
      data-lyric-line
      class="px-4 py-2 cursor-pointer transition-all duration-300 rounded-lg hover:bg-white/10"
      :class="index === currentLineIndex
        ? 'text-white text-lg font-bold'
        : 'text-white/40 text-base'"
      @click="onClickLine(line)"
    >
      {{ line.text }}
    </div>
  </div>
</template>

<style scoped>
.lyrics-container {
  mask-image: linear-gradient(
    to bottom,
    transparent 0%,
    black 20%,
    black 80%,
    transparent 100%
  );
}

.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
