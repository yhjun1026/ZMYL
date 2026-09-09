import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  // 子路径部署（如 nginx location /yl/）时：BASE_PATH=/yl/ npm run build
  // 默认 '/' —— 根路径部署与 8888 直访不受影响
  base: process.env.BASE_PATH || '/',
  plugins: [vue()],
  server: {
    host: '::',
    port: 5175,
    proxy: {
      '/api': { target: 'http://localhost:8888', changeOrigin: true }
    }
  },
  build: { outDir: 'dist', chunkSizeWarningLimit: 1500 }
})
