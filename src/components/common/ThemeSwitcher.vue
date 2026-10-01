<script setup lang="ts">
import type { ThemeMode } from '@/store/theme'
import { useThemeStore } from '@/store/theme'

defineProps<{ compact?: boolean }>()
const theme = useThemeStore()
const options: { value: ThemeMode, label: string }[] = [
  { value: 'system', label: '跟随系统' },
  { value: 'light', label: '亮色模式' },
  { value: 'dark', label: '暗色模式' },
]
const currentLabel = computed(() => options.find(option => option.value === theme.mode)!.label)
const nextOption = computed(() => options[(options.findIndex(option => option.value === theme.mode) + 1) % options.length]!)
const hint = computed(() => `当前：${currentLabel.value}，切换为${nextOption.value.label}`)
</script>

<template>
  <Tooltip v-if="compact" :content="hint" placement="bottom" align="center">
    <AppButton icon-only shape="pill" :aria-label="hint" @click="theme.setMode(nextOption.value)">
      <LucideMonitor v-if="theme.mode === 'system'" class="size-4.5" />
      <LucideSun v-else-if="theme.mode === 'light'" class="size-4.5" />
      <LucideMoon v-else class="size-4.5" />
    </AppButton>
  </Tooltip>
  <RadioGroup v-else aria-label="主题模式" :options="options" :model-value="theme.mode" @update:model-value="theme.setMode($event as ThemeMode)" />
</template>
