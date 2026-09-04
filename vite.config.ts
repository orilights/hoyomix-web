import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { defineConfig } from 'vite'
import pkg from './package.json' with { type: 'json' }
import buildInfo from './plugins/buildInfo.ts'
import injectHead from './plugins/injectHead.ts'

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
    },
  },
  base: '/',
  build: {
    cssCodeSplit: false,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'core',
              test: /node_modules[\\/](vue|vue-router|pinia)[\\/]/,
              priority: 30,
            },
            {
              name: 'vendor',
              test: id => id.includes('node_modules')
                && !id.includes('echarts')
                && !id.includes('zrender'),
              priority: 20,
            },
            {
              name: 'pages',
              test: /views[\\/]/,
              priority: 10,
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
