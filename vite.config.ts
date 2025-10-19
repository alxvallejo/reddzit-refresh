import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Note: Proxy removed for development to allow client-side routing
  // In production, nginx or similar should handle bot detection and SSR
})
