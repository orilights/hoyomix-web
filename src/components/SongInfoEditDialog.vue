<script setup lang="ts">
import type { SongInfoChange } from '@/types/core'
import { toast } from 'vue-sonner'
import { submitSongInfoEditApi } from '@/api/music'

const props = defineProps<{
  songId: number
  name: string
  description: string
}>()

const emit = defineEmits<{
  success: []
}>()

const visible = defineModel<boolean>({ required: true })

const nameInput = ref('')
const descriptionInput = ref('')
const submitting = ref(false)

watch(visible, (v) => {
  if (!v)
    return
  nameInput.value = props.name
  descriptionInput.value = props.description
})

async function submit() {
  const newName = nameInput.value.trim()
  if (!newName) {
    toast.error('请输入歌曲名称')
    return
  }

  const changes: SongInfoChange = {}
  if (newName !== props.name)
    changes.name = newName
  if (descriptionInput.value !== props.description)
    changes.description = descriptionInput.value

  if (Object.keys(changes).length === 0) {
    toast.error('未做任何修改')
    return
  }

  submitting.value = true
  try {
    const res = await submitSongInfoEditApi(props.songId, changes)
    if (res.directApproved)
      toast.success('歌曲信息已更新')
    else
      toast.success('申请已提交，等待审核')
    visible.value = false
    emit('success')
  }
  catch (error) {
    toast.error(error instanceof Error ? error.message : '提交失败')
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <AppDialog v-model="visible" size="md">
    <template #title>
      修改歌曲信息
    </template>

    <div class="p-6 space-y-4">
      <div class="px-3 py-2 rounded-lg bg-orange-100 text-orange-600 text-xs leading-relaxed">
        信息修改需审核后生效，对一首歌曲每类修改最多同时提交一次申请
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          歌曲名称 <span class="text-red-500">*</span>
        </label>
        <input
          v-model="nameInput"
          type="text"
          placeholder="输入歌曲名称"
          class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          描述（可选）
        </label>
        <textarea
          v-model="descriptionInput"
          rows="4"
          placeholder="输入歌曲描述"
          class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
        />
      </div>
    </div>

    <template #footer>
      <div class="px-6 py-4 flex items-center justify-end gap-2">
        <button
          type="button"
          class="px-4 py-2 text-sm rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer text-gray-700"
          @click="visible = false"
        >
          取消
        </button>
        <button
          type="button"
          class="px-4 py-2 text-sm rounded-lg bg-blue-500/90 text-white hover:bg-blue-600 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          :disabled="submitting"
          @click="submit"
        >
          <LucideLoader2 v-if="submitting" class="size-4 animate-spin" />
          {{ submitting ? '提交中...' : '提交申请' }}
        </button>
      </div>
    </template>
  </AppDialog>
</template>

<style scoped>
</style>
