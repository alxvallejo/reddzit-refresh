import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true, // Allow network access
    port: 5175
  },
  css: {
    preprocessorOptions: {
      scss: {
        quietDeps: true,
        silenceDeprecations: ['slash-div', 'color-functions']
      }
    }
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts']
  }
  // Proxy not needed in dev - frontend handles /p/* routes
  // In production, backend serves both frontend and SSR
})
