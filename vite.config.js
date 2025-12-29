import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // 重要：這裡必須設定為 '/儲存庫名稱/'，否則部署後畫面會一片白
  base: '/MyBrainData/',
  build: {
    // 提高警告門檻，消除 "chunk size > 500kb" 的警告
    chunkSizeWarningLimit: 1000,
  }
})