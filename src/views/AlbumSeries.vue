<script setup lang="ts">
import { toast } from 'vue-sonner'
import { useTagAlbumsQuery } from '@/composables/queries'
import { useMainStore } from '@/store/main'
import { getProductIconUrl } from '@/utils'

const route = useRoute()
const store = useMainStore()

const seriesName = computed(() => route.params.seriesName as string || null)

const productName = computed(() => seriesName.value?.split('-')[0] ?? '')

const { data: albums, isLoading, isError, error } = useTagAlbumsQuery('series', seriesName)

watch(isError, (val) => {
  if (val)
    toast.error(`系列专辑加载失败：${error.value?.message ?? '未知错误'}`)
})

watch(seriesName, (val) => {
  if (val)
    document.title = `${val} 系列专辑 - HOYO-MiX Online`
}, { immediate: true })

onMounted(() => {
  store.setBackground()
})
</script>

<template>
  <div v-if="isLoading" class="flex items-center justify-center py-20 text-gray-400">
    <LucideLoader2 class="size-6 animate-spin mr-2" />
    加载中...
  </div>

  <div v-else-if="isError" class="flex items-center justify-center py-20 text-red-400">
    加载失败，请刷新重试
  </div>

  <div v-else class="flex flex-col md:flex-row gap-4 mt-4">
    <div class="w-full md:w-[400px] h-fit p-4 bg-black/5 rounded-xl shrink-0">
      <div class="font-bold text-2xl pb-4">
        {{ seriesName }}
        <div class="font-normal text-base text-gray-500">
          系列专辑
        </div>
      </div>
      <RouterLink
        :to="{ name: 'ProductInfo', params: { name: productName } }"
        class="flex items-center hover:bg-gray-500/20 px-2 py-1 rounded-lg transition-colors w-fit"
      >
        <img
          class="size-[20px] rounded-lg"
          :src="getProductIconUrl(productName)"
          :alt="productName"
        >
        <span class="ml-2">{{ productName }}</span>
      </RouterLink>
    </div>

    <div class="flex-1">
      <AlbumList :albums-list="albums ?? []" persist-key="albums-series" default-layout="list" />
    </div>
  </div>
</template>

<style scoped>

</style>
