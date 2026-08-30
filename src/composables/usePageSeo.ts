import type { MaybeRefOrGetter } from 'vue'
import { useHead, useSeoMeta } from '@unhead/vue'
import { appTitle, siteUrl } from '@/constants'

export interface PageSeoOptions {
  /** 页面标题(不含站点名后缀) */
  title: MaybeRefOrGetter<string | null | undefined>
  /** 页面描述 */
  description?: MaybeRefOrGetter<string | null | undefined>
  /** 页面路径(以 / 开头),用于 canonical 与 og:url;缺省时使用当前路由路径 */
  path?: MaybeRefOrGetter<string | null | undefined>
  /** 分享/预览图片(绝对 URL 或相对路径) */
  image?: MaybeRefOrGetter<string | null | undefined>
  /** 是否禁止搜索引擎索引(如设置页、验证页) */
  noindex?: MaybeRefOrGetter<boolean | undefined>
}

function resolveUrl(path: string): string {
  if (!siteUrl)
    return path
  return `${siteUrl}${path.startsWith('/') ? path : `/${path}`}`
}

/**
 * 统一管理页面 SEO:title、description、canonical、og/twitter 标签与 noindex。
 * 所有入参支持响应式值,数据加载完成后自动更新。
 */
export function usePageSeo(options: PageSeoOptions) {
  const { title, description, path, image, noindex } = options

  const fullTitle = computed(() => {
    const t = toValue(title)
    return t ? `${t} - ${appTitle}` : appTitle
  })

  const canonicalPath = computed(() => toValue(path) ?? useRoute().path)

  const canonicalUrl = computed(() => resolveUrl(canonicalPath.value))

  const resolvedDescription = computed(() => toValue(description) ?? '')

  const resolvedImage = computed(() => {
    const img = toValue(image)
    if (!img)
      return undefined
    return img.startsWith('http') ? img : resolveUrl(img)
  })

  const resolvedNoindex = computed(() => toValue(noindex) ?? false)

  useHead({
    title: fullTitle,
    link: computed(() => [
      { rel: 'canonical', href: canonicalUrl.value },
    ]),
    meta: computed(() => [
      { name: 'robots', content: resolvedNoindex.value ? 'noindex, nofollow' : 'index, follow' },
    ]),
  })

  useSeoMeta({
    title: fullTitle,
    description: resolvedDescription,
    ogTitle: fullTitle,
    ogDescription: resolvedDescription,
    ogUrl: canonicalUrl,
    ogImage: resolvedImage,
    twitterTitle: fullTitle,
    twitterDescription: resolvedDescription,
    twitterImage: resolvedImage,
  })
}
