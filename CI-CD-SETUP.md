# 🚀 CI/CD Setup for Reddzit-Refresh

## Files Added:
- `bitbucket-pipelines.yml` - Bitbucket Pipelines configuration
- `deploy.sh` - Manual deployment script  
- Updated `package.json` - Build script simplified to `vite build`
- Updated `tsconfig.app.json` - Less strict TypeScript for faster builds
- `yarn.lock` - Yarn lockfile for consistent dependencies

## Next Steps:

### 1. Enable Bitbucket Pipelines
- Go to your Bitbucket repository
- Settings → Pipelines → Settings  
- Enable Pipelines

### 2. Add SSH Key to Bitbucket
- Generate SSH key on your local machine (if not already done)
- Add public key to Bitbucket: Settings → SSH Keys → Add Key
- This allows Bitbucket to connect to your server

### 3. Set Repository Variables (if needed)
- Bitbucket Settings → Repository variables
- Add `SSH_USER` = `alxvallejo` (if using different user)
- Add `SERVER` = `seojeek.com` (if using different server)

### 4. Test Manual Deployment (On Server)
```bash
cd /var/www/reddzit-refresh
./deploy.sh
```

### 5. Test CI/CD
- Push any change to master branch
- Check Bitbucket Pipelines tab to see the build
- If successful, changes will be automatically deployed!

## How It Works:
1. You push code to Bitbucket
2. Bitbucket Pipelines builds the project  
3. Bitbucket connects to your server via SSH
4. Server runs: git pull → yarn install → yarn build → reload nginx
5. Your site is updated! 🎉

## Troubleshooting:
- Check Bitbucket Pipelines logs if build fails
- SSH permissions must be set up correctly
- Server sudo permissions configured for nginx reload
