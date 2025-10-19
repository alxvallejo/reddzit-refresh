import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy share URLs to read-api for SSR metadata
      '/p/': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        // Only proxy requests from social media crawlers
        bypass(req, res, options) {
          const userAgent = req.headers['user-agent'] || '';
          const isBot = /bot|crawler|spider|crawling|facebookexternalhit|twitterbot|linkedinbot|whatsapp|telegram|skype|slack|googlebot|bingbot/i.test(userAgent);
          
          // Only proxy requests from social media crawlers
          if (isBot) {
            console.log(`[PROXY] Bot detected: ${userAgent.slice(0, 50)}`);
            return; // Continue with proxy to read-api
          }
          
          console.log(`[BYPASS] Human user: ${userAgent.slice(0, 50)}`);
          return false; // Bypass proxy, serve React app
        }
      }
    }
  }
})
