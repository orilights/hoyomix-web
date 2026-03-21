import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { ClickScrollPlugin, OverlayScrollbars } from 'overlayscrollbars'
import App from '@/App.vue'
import router from '@/router'

import 'overlayscrollbars/overlayscrollbars.css'
import '@/assets/tailwind.css'

OverlayScrollbars.plugin(ClickScrollPlugin)

const app = createApp(App)

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

app.use(router)
app.use(pinia)

app.mount('#app')
