import { createRouter, createWebHistory } from 'vue-router'
import { beginPageRender, cancelPageScrollRestoration, getPageScrollPosition, restorePageScrollPosition, scrollPageToElement, waitForPageRender } from '@/composables/usePageScroll'
import routes from './routes'

const history = createWebHistory()
const scrollPositions = new Map<number, { left: number, top: number }>()
let activeHistoryPosition = Number(history.state.position)
let restoredPosition: { left: number, top: number } | undefined

const router = createRouter({
  history,
  routes,
  async scrollBehavior(to, from): Promise<false> {
    const position = restoredPosition
    await waitForPageRender()
    if (router.currentRoute.value !== to)
      return false

    // Vue Router 的 savedPosition 来自 window，内容容器的位置需按历史条目单独保存。
    if (position) {
      restorePageScrollPosition(position)
      return false
    }

    // 评论组件会在目标回复加载后定位；默认回顶会覆盖定位结果。
    if (typeof to.query.commentPostId === 'string' && typeof to.query.commentId === 'string')
      return false

    // 定位完成后会清理 query，同页参数变化应保留当前滚动位置。
    if (to.path === from.path && to.hash === from.hash)
      return false

    if (to.hash) {
      const target = document.getElementById(to.hash.slice(1))
      if (target && scrollPageToElement(target, 72))
        return false
    }

    restorePageScrollPosition({ left: 0, top: 0 })
    return false
  },
})

router.beforeEach(() => {
  cancelPageScrollRestoration()
  scrollPositions.set(activeHistoryPosition, getPageScrollPosition())
  const targetPosition = Number(history.state.position)
  restoredPosition = targetPosition !== activeHistoryPosition ? scrollPositions.get(targetPosition) : undefined
})

router.afterEach((to, from, failure) => {
  if (failure)
    return
  activeHistoryPosition = Number(history.state.position)
  if (to.path !== from.path)
    beginPageRender()
})

export default router
