# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type aware lint rules:

- Configure the top-level `parserOptions` property like this:

```js
export default tseslint.config({
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

- Replace `tseslint.configs.recommended` to `tseslint.configs.recommendedTypeChecked` or `tseslint.configs.strictTypeChecked`
- Optionally add `...tseslint.configs.stylisticTypeChecked`
- Install [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) and update the config:

```js
// eslint.config.js
import react from 'eslint-plugin-react'

export default tseslint.config({
  // Set the react version
  settings: { react: { version: '18.3' } },
  plugins: {
    // Add the react plugin
    react,
  },
  rules: {
    // other rules...
    // Enable its recommended rules
    ...react.configs.recommended.rules,
    ...react.configs['jsx-runtime'].rules,
  },
})
```

## GitHub Actions Deployment

This repo includes a GitHub Actions workflow at `.github/workflows/deploy-frontend.yml` that builds and deploys to the server over SSH.

- Required repository secrets (Settings → Secrets and variables → Actions → New repository secret):
  - `VITE_REDDIT_CLIENT_ID`: Reddit OAuth client id.
  - `VITE_REDDIT_REDIRECT_URI`: e.g. `https://reddzit.seojeek.com/reddit`.
  - `VITE_READ_API_BASE`: e.g. `https://read-api.seojeek.com`.
  - `SSH_HOST`: e.g. `seojeek.com`.
  - `SSH_USER`: e.g. `alxvallejo`.
  - `SSH_KEY`: SSH private key used by Actions to connect to the server (see below).
  - `SSH_PORT` (optional): e.g. `22`.

- Generating and installing a deploy SSH key:
  1. On your local machine, generate a key pair:
     - `ssh-keygen -t ed25519 -C "github-actions@reddzit-refresh" -f ~/.ssh/reddzit_refresh_actions -N ''`
  2. Copy the public key to the server user’s `authorized_keys`:
     - `ssh-copy-id -i ~/.ssh/reddzit_refresh_actions.pub alxvallejo@seojeek.com`
     - Or manually append the contents of `~/.ssh/reddzit_refresh_actions.pub` to `/home/alxvallejo/.ssh/authorized_keys` on the server.
  3. Add the private key as the `SSH_KEY` secret (paste the full contents of `~/.ssh/reddzit_refresh_actions`).
  4. (Optional) Add host key to known hosts to verify host fingerprints on first connect:
     - `ssh-keyscan -H seojeek.com`

- Deployment path and behavior:
  - Target directory: `/var/www/reddzit-refresh/dist`.
  - The action cleans the remote `dist` directory, uploads the new build, then (if sudo is available) sets ownership to `www-data` and reloads nginx.
