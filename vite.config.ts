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
        // Only proxy requests from social media crawlers or when explicitly requesting HTML
        bypass(req, res, options) {
          const userAgent = req.headers['user-agent'] || '';
          const isBot = /bot|crawler|spider|crawling|facebookexternalhit|twitterbot|linkedinbot|whatsapp|telegram|skype|slack/i.test(userAgent);
          
          // Only proxy requests from social media crawlers
          if (isBot) {
            console.log('Proxying to read-api for bot:', userAgent);
            return; // Continue with proxy
          }
          console.log('Serving React app for user:', userAgent.slice(0, 50));
          return req.url; // Bypass proxy, serve React app
        }
      }
    }
  }
})
