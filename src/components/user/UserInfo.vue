<script setup lang="ts">
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { toast } from 'vue-sonner'
import { getNotificationUnreadCountApi } from '@/api/music'
import { useAuthStore } from '@/store/auth'
import NotificationPanel from './NotificationPanel.vue'

const auth = useAuthStore()
const { user, isLoggedIn, isPending, showAuthDialog } = storeToRefs(auth)

const showDropdown = ref(false)
const activeTab = ref<'notifications' | 'account'>('notifications')
const queryClient = useQueryClient()

const { data: unreadCountData } = useQuery({
  queryKey: ['notificationUnreadCount'],
  queryFn: getNotificationUnreadCountApi,
  enabled: isLoggedIn,
  refetchInterval: 60 * 1000,
  staleTime: 30 * 1000,
})

const unreadCount = computed(() => unreadCountData.value?.count ?? 0)
const badgeText = computed(() => {
  if (unreadCount.value <= 0)
    return ''
  return unreadCount.value > 99 ? '99+' : String(unreadCount.value)
})

function getInitial(): string {
  return user.value?.name?.charAt(0).toUpperCase() ?? '?'
}

function openDropdown() {
  showDropdown.value = true
  activeTab.value = 'notifications'
  nextTick(() => {
    document.addEventListener('click', closeDropdown)
  })
}

function closeDropdown() {
  showDropdown.value = false
  document.removeEventListener('click', closeDropdown)
}

function onAvatarClick(e: MouseEvent) {
  e.stopPropagation()
  if (showDropdown.value) {
    closeDropdown()
  }
  else {
    openDropdown()
  }
}

function onUnreadCountChange(count: number) {
  queryClient.setQueryData(['notificationUnreadCount'], { count })
}

async function logout() {
  closeDropdown()
  await auth.logout()
  toast.success('已退出登录')
}

onUnmounted(() => {
  document.removeEventListener('click', closeDropdown)
})
</script>

<template>
  <div class="relative">
    <button
      v-if="!isLoggedIn && !isPending"
      class="text-sm bg-gray-500/10 px-3 py-2 rounded-full hover:bg-gray-500/20 transition-colors cursor-pointer flex items-center gap-1.5"
      @click="auth.openAuthDialog()"
    >
      <LucideUser class="size-4.5" />
      <span class="hidden md:inline text-xs">登录</span>
    </button>

    <div v-else-if="isLoggedIn" class="relative">
      <button
        class="size-8 rounded-full overflow-hidden ring-2 ring-transparent hover:ring-blue-400 transition-all cursor-pointer flex items-center justify-center"
        @click="onAvatarClick"
      >
        <img
          v-if="user?.image"
          :src="user.image"
          :alt="user.name"
          loading="lazy"
          class="size-full object-cover"
        >
        <div v-else class="size-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium">
          {{ getInitial() }}
        </div>
      </button>
      <div
        v-if="badgeText"
        class="absolute -top-1 -right-1 min-w-4 h-4 bg-red-500 text-white text-[10px] font-medium rounded-full flex items-center justify-center px-1 pointer-events-none select-none"
      >
        {{ badgeText }}
      </div>
    </div>

    <Transition name="dropdown-fade">
      <div
        v-if="showDropdown"
        class="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50"
        @click.stop
      >
        <div class="flex border-b border-gray-100">
          <button
            class="flex-1 py-2.5 text-sm font-medium transition-colors cursor-pointer relative"
            :class="activeTab === 'notifications' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'"
            @click="activeTab = 'notifications'"
          >
            通知
            <span
              v-if="unreadCount > 0"
              class="ml-1 inline-flex items-center justify-center min-w-4 h-4 text-[10px] bg-red-500 text-white rounded-full px-1"
            >{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
            <div v-if="activeTab === 'notifications'" class="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />
          </button>
          <button
            class="flex-1 py-2.5 text-sm font-medium transition-colors cursor-pointer relative"
            :class="activeTab === 'account' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'"
            @click="activeTab = 'account'"
          >
            账户
            <div v-if="activeTab === 'account'" class="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />
          </button>
        </div>

        <NotificationPanel
          v-if="activeTab === 'notifications'"
          @unread-count-change="onUnreadCountChange"
        />

        <div v-if="activeTab === 'account'">
          <div class="px-4 pt-4 pb-3 flex items-center gap-3 border-b border-gray-100">
            <div class="size-10 rounded-full overflow-hidden shrink-0 flex items-center justify-center">
              <img
                v-if="user?.image"
                :src="user.image"
                :alt="user?.name"
                loading="lazy"
                class="size-full object-cover"
              >
              <div v-else class="size-full bg-blue-500 flex items-center justify-center text-white font-medium">
                {{ getInitial() }}
              </div>
            </div>
            <div class="min-w-0">
              <p class="text-sm font-medium truncate">
                {{ user?.name }}
              </p>
              <p class="text-xs text-gray-500 truncate mt-0.5">
                {{ user?.email }}
              </p>
            </div>
          </div>
          <div class="p-2">
            <button
              class="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
              @click="logout"
            >
              <LucideLogOut class="size-4" />
              退出登录
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>

  <AuthDialog v-model="showAuthDialog" />
</template>

<style scoped>
.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.dropdown-fade-enter-from,
.dropdown-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
