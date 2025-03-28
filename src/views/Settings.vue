<script setup lang="ts">
import { useStore } from '@/store'
import { goFeedbackPage } from '@/utils'

const store = useStore()

onMounted(() => {
  store.setBackground()
})
</script>

<template>
  <div>
    <div class="font-bold text-2xl">
      设置
    </div>
    <div class="mt-4">
      这里理应是一个设置页面，但是由于 <del>作者太懒</del> 还没做完，所以暂时什么都没有
    </div>
    <div class="font-bold text-2xl mt-4">
      关于 HOYO-MiX Online
    </div>
    <div class="mt-4 px-4 py-2 bg-red-50 rounded-lg border border-red-500">
      <div class="font-bold text-red-500">
        须知
      </div>
      本网站由爱好者制作，并非 HOYO-MiX 官方网站。 网站内使用的图标、专辑图片、文本，仅用于信息展示，其版权属于 米哈游/miHoYo/上海米哈游网络科技股份有限公司
    </div>
    <div class="mt-2">
      一个兴趣使然的 HOYO-MiX 音乐信息收集网站
      <br>
      <div class="mt-2">
        当前版本：v0.1.0 <span class="border rounded-md px-1 py-0.5 text-sm text-green-700">早期预览版</span>
      </div>
      <div class="mt-2">
        <br>
        <button
          class="text-sm bg-gray-500/10 p-2 rounded-lg hover:bg-gray-500/20 transition-colors cursor-pointer my-2"
          @click="goFeedbackPage"
        >
          反馈问题
        </button>
        <br>
      </div>
    </div>
  </div>
</template>

<style scoped>

</style>
