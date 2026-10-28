<script setup lang="ts">
import type { EditRequestItem } from '@/types/edit-request'

defineProps<{ pendingRequest: EditRequestItem | null, checking: boolean, checkError: boolean }>()
const emit = defineEmits<{ retry: [] }>()
const selectedId = ref<number | null>(null)
</script>

<template>
  <div class="px-3 py-2 rounded-lg bg-orange-100 dark:bg-orange-500/15 text-orange-700 dark:text-orange-300 text-xs leading-relaxed" role="status">
    <AsyncFade>
      <div v-if="checking">
        正在检查审核中申请...
      </div>
      <div v-else-if="checkError">
        申请状态加载失败，暂时无法提交。
        <AppButton size="xs" variant="ghost" @click="emit('retry')">
          重试
        </AppButton>
      </div>
      <div v-else-if="pendingRequest">
        当前存在审核中的申请，暂时无法再次提交。
        <AppButton size="xs" variant="ghost" @click="selectedId = pendingRequest.id">
          查看详情
        </AppButton>
      </div>
      <div v-else>
        信息修改需审核后生效，同一资源最多同时存在一条待审核申请
      </div>
    </AsyncFade>
  </div>
  <EditRequestDetailDialog v-model="selectedId" />
</template>
