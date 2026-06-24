<script setup lang="ts">
import { useQueryClient } from '@tanstack/vue-query'
import NotificationPanel from './NotificationPanel.vue'

const visible = defineModel<boolean>({ required: true })

const queryClient = useQueryClient()

function onUnreadCountChange(count: number) {
  queryClient.setQueryData(['notificationUnreadCount'], { count })
}
</script>

<template>
  <AppDialog v-model="visible" title="站内信" size="md">
    <NotificationPanel @unread-count-change="onUnreadCountChange" />
  </AppDialog>
</template>
