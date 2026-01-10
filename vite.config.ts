import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true, // Allow network access
    port: 5173
  },
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
