import { createRouter, createWebHistory } from 'vue-router'
import { scrollPageToElement, scrollPageToTop } from '@/composables/usePageScroll'
import routes from './routes'

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (to.hash) {
      const target = document.getElementById(to.hash.slice(1))
      if (target && scrollPageToElement(target, 72))
        return false
      return { el: to.hash, top: 128 }
    }

    if (from.hash && to.path === from.path) {
      scrollPageToTop()
      return false
    }

    if (savedPosition) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(savedPosition)
        }, 100)
      })
    }

    return { top: 0 }
  },
})

export default router
