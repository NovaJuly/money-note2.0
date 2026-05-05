import { fileURLToPath, URL } from 'node:url'
import { baseUrl } from './baseUrl'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },server: {
    port: 5173,
    proxy: {
      '/api': {
        target: baseUrl,  // 后端地址
        changeOrigin: true,
        // 如果后端没有 /api 前缀，可以 rewrite 掉
        // rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
})
