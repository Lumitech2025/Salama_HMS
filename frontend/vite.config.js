// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    allowedHosts: ['detra-unjapanned-ashton.ngrok-free.dev', '.ngrok-free.dev'],
    proxy: {
      // Catches /api/v1/, /api/ext/, etc.
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
      },
      // Fallback: If you are serving the token from a standalone /icd11/ route on Django
      '/icd11': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})