import { ClickScrollPlugin, OverlayScrollbars } from 'overlayscrollbars'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import App from '@/App.vue'
import router from '@/router'

import 'overlayscrollbars/overlayscrollbars.css'
import '@/assets/tailwind.css'
import '@/assets/style.css'

OverlayScrollbars.plugin(ClickScrollPlugin)

const app = createApp(App)

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

app.use(router)
app.use(pinia)

app.mount('#app')
