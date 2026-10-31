<script setup lang="ts">
import { useQueryClient } from '@tanstack/vue-query'
import { t } from '@/i18n'
import NotificationPanel from './NotificationPanel.vue'

const visible = defineModel<boolean>({ required: true })

const queryClient = useQueryClient()

function onUnreadCountChange(count: number) {
  queryClient.setQueryData(['notificationUnreadCount'], { count })
}
</script>

<template>
  <AppDialog v-model="visible" :title="t('NotificationBell.inbox')" size="md">
    <NotificationPanel @unread-count-change="onUnreadCountChange" @navigate="visible = false" />
  </AppDialog>
</template>
