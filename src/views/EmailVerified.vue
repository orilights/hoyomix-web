<script setup lang="ts">
import { useAuthStore } from '@/store/auth'

const auth = useAuthStore()
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-[60vh] py-16">
    <div class="w-full max-w-md bg-white rounded-2xl shadow-md border border-gray-100 px-8 py-10">
      <div class="flex flex-col items-center gap-4">
        <div class="size-16 rounded-full bg-green-100 flex items-center justify-center">
          <LucideMailCheck class="size-8 text-green-600" />
        </div>
        <h1 class="text-xl font-semibold text-gray-900">
          邮箱验证成功
        </h1>
        <p class="text-sm text-gray-500 text-center">
          恭喜！邮箱验证已完成，点击下方按钮即可登录！
        </p>
        <button
          class="mt-2 px-8 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors cursor-pointer"
          @click="auth.openAuthDialog()"
        >
          立即登录
        </button>
      </div>
    </div>
  </div>
</template>
