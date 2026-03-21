import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { defineConfig } from 'vite'
import buildInfo from './plugins/buildInfo'
import injectHead from './plugins/injectHead'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  base: '/',
  plugins: [
    vue(),
    tailwindcss(),
    AutoImport({
      imports: ['vue', 'vue-router', 'pinia'],
      dts: 'src/auto-imports.d.ts',
      vueTemplate: true,
    }),
    Components({
      dts: 'src/components.d.ts',
      resolvers: [
        (name: string) => {
          if (name.startsWith('Lucide'))
            return { name: name.slice(6), from: 'lucide-vue-next' }
          if (name === 'OverlayScrollbarsComponent')
            return { name: 'OverlayScrollbarsComponent', from: 'overlayscrollbars-vue' }
        },
      ],
    }),
    buildInfo(),
    injectHead(),
  ],
})
