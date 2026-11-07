<script setup lang="ts">
import type { WordLyricLine } from '@/types/word-lyrics'
import { wordLyricAnimationKey } from '@/composables/useWordLyricAnimation'
import { wordLyricActiveRange, wordProgress } from '@/utils/word-lyrics'

const props = defineProps<{ line: WordLyricLine }>()
const activeRange = computed(() => wordLyricActiveRange(props.line))
const animation = inject(wordLyricAnimationKey)!
const root = useTemplateRef<HTMLElement>('root')
const expanded = ref(false)
let spans: HTMLElement[] = []
let lastProgress: number[] = []
let lastActive: boolean | undefined
let unregister: (() => void) | undefined

function paint(time: number, discrete: boolean) {
  const active = time >= activeRange.value.start && time < activeRange.value.end
  if (lastActive !== active) {
    root.value?.setAttribute('data-active', String(active))
    lastActive = active
  }
  if (spans.length !== props.line.words.length)
    return
  for (let i = 0; i < spans.length; i++) {
    const progress = Math.round(wordProgress(props.line.words[i], time, discrete) * 1000) / 10
    if (progress === lastProgress[i])
      continue
    lastProgress[i] = progress
    spans[i].style.setProperty('--word-progress', `${progress}%`)
    spans[i].classList.toggle('word-lit', progress > 0)
  }
}
watch([expanded, () => props.line], () => {
  spans = Array.from(root.value?.querySelectorAll<HTMLElement>('[data-word]') ?? [])
  lastProgress = []
  lastActive = undefined
  animation.refresh()
}, { flush: 'post' })
onMounted(() => {
  unregister = animation.register({ element: root.value!, visible: value => expanded.value = value, paint })
})
onUnmounted(() => unregister?.())
</script>

<template>
  <div ref="root" class="word-line whitespace-pre-line" :class="{ 'word-background': line.backgroundOf }">
    <template v-if="expanded && line.words.length">
      <span v-for="(word, index) in line.words" :key="index" data-word class="lyric-word">{{ word.text }}</span>
    </template>
    <template v-else>
      {{ line.text }}
    </template>
  </div>
</template>

<style scoped>
.word-line {
  --word-lit: white;
  --word-unlit: var(--word-lit);
  color: var(--word-lit);
  opacity: 0.4;
  transition: opacity 300ms ease-out;
  font-weight: 500;
}
.word-line[data-active='true'] {
  --word-unlit: rgb(255 255 255 / 40%);
  opacity: 1;
  transition: none;
}
.word-background {
  --word-lit: rgb(255 255 255 / 70%);
  /* 70% × 此透明度 = 非高亮时的 40%。 */
  opacity: 0.5714285714;
}
.word-background[data-active='true'] { opacity: 1; }
.lyric-word { color: var(--word-unlit); }
.word-lit { color: var(--word-lit); }
@supports ((background-clip: text) or (-webkit-background-clip: text)) {
  .lyric-word {
    background-image: linear-gradient(to right, var(--word-lit) var(--word-progress, 0%), var(--word-unlit) var(--word-progress, 0%));
    background-clip: text;
    -webkit-background-clip: text;
    color: transparent;
    -webkit-text-fill-color: transparent;
  }
}
@media (prefers-reduced-motion: reduce) {
  .word-line { transition: none; }
}
</style>
