import { VueQueryPlugin } from '@tanstack/vue-query'
import { createHead } from '@unhead/vue/client'
import { ClickScrollPlugin, OverlayScrollbars } from 'overlayscrollbars'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import App from '@/App.vue'
import router from '@/router'
import { queryClient } from '@/utils/query-client'

import 'overlayscrollbars/overlayscrollbars.css'
import 'vue-sonner/style.css'
import 'virtual:uno.css'
import '@/assets/style.css'

OverlayScrollbars.plugin(ClickScrollPlugin)

const app = createApp(App)

const head = createHead()

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

app.use(head)
app.use(router)
app.use(pinia)
app.use(VueQueryPlugin, { queryClient })

app.mount('#app')
