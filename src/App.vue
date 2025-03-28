<script setup lang="ts">
import { getIndexApi } from '@/api'
import DefaultLayout from '@/layout/DefaultLayout.vue'
import { useStore } from '@/store'

const store = useStore()
const { indexData } = toRefs(store)

const layout = shallowRef(DefaultLayout)

onMounted(() => {
  getIndexApi()
    .then(res => res.json())
    .then((data: any) => {
      indexData.value = data
    })
})
</script>

<template>
  <component :is="layout">
    <router-view />
  </component>
</template>

<style>
body {
  --background-image: url('');
  background-image: var(--background-image);
  background-size: cover;
  background-position: center;
}
</style>
