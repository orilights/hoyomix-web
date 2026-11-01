<script setup lang="ts">
import { toast } from 'vue-sonner'
import { formatNumber, t } from '@/i18n'
import { insertCommentText } from '@/utils/emoticons'

const props = withDefaults(defineProps<{
  disabled?: boolean
  placeholder?: string
  maxLength?: number
}>(), { maxLength: 2000, placeholder: t('CommentEditor.share_your_thoughts') })
const emit = defineEmits<{ submit: [] }>()
const content = defineModel<string>({ default: '' })
const textarea = useTemplateRef<HTMLTextAreaElement>('textarea')
const selection = ref({ start: content.value.length, end: content.value.length })
function rememberSelection() {
  if (textarea.value)
    selection.value = { start: textarea.value.selectionStart, end: textarea.value.selectionEnd }
}
async function insert(text: string, onInserted: () => void) {
  if (props.disabled)
    return
  const result = insertCommentText(content.value, text, selection.value.start, selection.value.end, props.maxLength)
  if (!result) {
    toast.error(t('CommentEditor.comments_cannot_exceed_characters', { p0: props.maxLength }))
    return
  }
  content.value = result.value
  onInserted()
  selection.value = { start: result.cursor, end: result.cursor }
  await nextTick()
  textarea.value?.focus({ preventScroll: true })
  textarea.value?.setSelectionRange(result.cursor, result.cursor)
}
</script>

<template>
  <div>
    <textarea
      ref="textarea"
      v-model="content"
      rows="3"
      :maxlength="maxLength"
      :disabled="disabled"
      :placeholder="placeholder"
      class="w-full resize-y bg-transparent outline-none text-sm leading-6 placeholder:text-gray-400 placeholder:dark:text-gray-500 focus:ring-0 disabled:cursor-not-allowed disabled:opacity-60"
      @select="rememberSelection"
      @input="rememberSelection"
      @click="rememberSelection"
      @keyup="rememberSelection"
      @blur="rememberSelection"
      @keydown.ctrl.enter.prevent="emit('submit')"
      @keydown.meta.enter.prevent="emit('submit')"
    />
    <div class="mt-2 flex items-center justify-between gap-3">
      <div class="flex items-center gap-2">
        <EmoticonPicker :disabled="disabled" @select="insert" />
        <span class="text-xs text-gray-400">{{ formatNumber(content.length) }}/{{ maxLength }}</span>
      </div>
      <slot name="actions" />
    </div>
  </div>
</template>
