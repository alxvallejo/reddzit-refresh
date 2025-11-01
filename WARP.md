# Warp AI Rules for reddzit-refresh

## Git Workflow
- Push commits directly to the `main` branch
- Do not create feature branches unless explicitly requested

## Architecture

### SSR and Development Setup
- The backend (`read-api` on port 3000) handles server-side rendering (SSR) for `/p/*` routes to inject Open Graph and Twitter Card meta tags for social media sharing
- In **development**: Do NOT proxy `/p/*` routes in `vite.config.ts` - the frontend React app handles these routes directly
- In **production**: The backend serves both the static frontend files AND handles SSR for bot requests to `/p/*` routes
- The frontend `PostView.tsx` component fetches post data client-side from Reddit's public JSON API
- SSR metadata will only appear when sharing links in production, not during local development
