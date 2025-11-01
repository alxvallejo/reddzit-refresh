import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  css: {
    preprocessorOptions: {
      scss: {
        quietDeps: true,
        silenceDeprecations: ['slash-div', 'color-functions']
      }
    }
  }
  // Proxy not needed in dev - frontend handles /p/* routes
  // In production, backend serves both frontend and SSR
})
