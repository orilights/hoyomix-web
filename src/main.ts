import { VueQueryPlugin } from '@tanstack/vue-query'
import { createHead } from '@unhead/vue/client'
import { ClickScrollPlugin, OverlayScrollbars } from 'overlayscrollbars'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import App from '@/App.vue'
import { i18n } from '@/i18n'
import router from '@/router'
import { useLanguageStore } from '@/store/language'
import { useThemeStore } from '@/store/theme'
import { registerImageCache } from '@/utils/image-cache'
import { queryClient } from '@/utils/query-client'

import 'overlayscrollbars/overlayscrollbars.css'
import 'vue-sonner/style.css'
import '@unocss/reset/tailwind-v4.css'
import 'virtual:uno.css'
import '@/assets/style.css'
import '@/assets/detail-layout.css'

OverlayScrollbars.plugin(ClickScrollPlugin)

const app = createApp(App)

const head = createHead()

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

app.use(head)
app.use(pinia)
useLanguageStore(pinia).initialize()
app.use(i18n)
app.use(router)
useThemeStore(pinia).initialize()
app.use(VueQueryPlugin, { queryClient })

app.mount('#app')

void registerImageCache().catch(() => {})
