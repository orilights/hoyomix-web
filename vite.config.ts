import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { defineConfig } from 'vite'
import buildInfo from './plugins/buildInfo.ts'
import injectHead from './plugins/injectHead.ts'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
    },
  },
  base: '/',
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [

            {
              name: 'vendor',
              test: id => id.includes('node_nodules') && !id.includes('echarts'),
            },
            {
              name: 'pages',
              test: id => id.includes('views') && !id.includes('Statistics'),
            },
          ],
        },
      },
    },
  },
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
            return { name: name.slice(6), from: '@lucide/vue' }
          if (name === 'OverlayScrollbarsComponent')
            return { name: 'OverlayScrollbarsComponent', from: 'overlayscrollbars-vue' }
        },
      ],
    }),
    buildInfo(),
    injectHead(),
  ],
})
