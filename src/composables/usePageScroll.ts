const scrollY = ref(0)
let scrollElement: HTMLElement | null = null

export function setPageScrollElement(element: HTMLElement | null) {
  scrollElement = element
  scrollY.value = element?.scrollTop ?? 0
}

export function updatePageScroll(event: Event) {
  scrollY.value = (event.target as HTMLElement).scrollTop
}

export function scrollPageToTop(behavior: ScrollBehavior = 'auto') {
  scrollElement?.scrollTo({ top: 0, behavior })
}

export function scrollPageToElement(element: Element, offset = 0): boolean {
  if (!scrollElement)
    return false

  const top = scrollElement.scrollTop + element.getBoundingClientRect().top - scrollElement.getBoundingClientRect().top - offset
  scrollElement.scrollTo({ top, behavior: 'auto' })
  return true
}

export function usePageScroll() {
  return { scrollY, scrollPageToTop }
}
