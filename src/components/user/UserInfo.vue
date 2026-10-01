<script setup lang="ts">
import { toast } from 'vue-sonner'
import { useAuthStore } from '@/store/auth'

const auth = useAuthStore()
const { user, isLoggedIn, isPending, showAuthDialog } = storeToRefs(auth)

const showDropdown = ref(false)
const showChangePassword = ref(false)
const showChangeName = ref(false)

function getInitial(): string {
  return user.value?.name?.charAt(0).toUpperCase() ?? '?'
}

function openDropdown() {
  showDropdown.value = true
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
    <Tooltip v-if="!isLoggedIn && !isPending" content="登录" placement="bottom" align="center">
      <AppButton
        shape="pill"
        aria-label="登录"
        @click="auth.openAuthDialog()"
      >
        <LucideUser class="size-4.5" />
        <span class="hidden md:inline text-xs">登录</span>
      </AppButton>
    </Tooltip>

    <div v-else-if="isLoggedIn" class="relative">
      <Tooltip :content="user?.name ?? '账户'" placement="bottom" align="center">
        <button
          class="size-8 rounded-full overflow-hidden ring-2 ring-transparent hover:ring-blue-400 transition-all cursor-pointer flex items-center justify-center"
          aria-label="账户菜单"
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
      </Tooltip>
    </div>

    <Transition name="dropdown-fade">
      <div
        v-if="showDropdown"
        class="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-[var(--theme-surface)] rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden z-50"
        @click.stop
      >
        <div class="px-4 pt-4 pb-3 flex items-center gap-3 border-b border-gray-100 dark:border-gray-700">
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
            <p class="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
              {{ user?.email }}
            </p>
          </div>
        </div>
        <div class="p-2">
          <AppButton
            variant="ghost"
            class="w-full !justify-start"
            @click="showChangeName = true"
          >
            <LucidePenLine class="size-4" />
            修改用户名
          </AppButton>
          <AppButton
            variant="ghost"
            class="w-full !justify-start"
            @click="showChangePassword = true"
          >
            <LucideKeyRound class="size-4" />
            修改密码
          </AppButton>
          <AppButton
            variant="danger"
            class="w-full !justify-start"
            @click="logout"
          >
            <LucideLogOut class="size-4" />
            退出登录
          </AppButton>
        </div>
      </div>
    </Transition>
  </div>

  <AuthDialog v-model="showAuthDialog" />
  <ChangePasswordDialog v-model="showChangePassword" />
  <ChangeUsernameDialog v-model="showChangeName" />
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
