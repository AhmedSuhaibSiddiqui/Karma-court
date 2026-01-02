import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: true,
    proxy: {
      // This routes any request starting with /api to your Python backend
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      // This routes the WebSocket connection
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true,
      }
    }
  }
})