# Reddzit Chrome Extension

This Chrome extension provides quick access to the Reddzit web application by opening it in a new tab.

## Setup Instructions

### 1. Deploy Your Web App First
Before publishing the extension, deploy your Reddzit app to a hosting service:

**Recommended hosting platforms:**
- **Vercel** (recommended for React apps)
- **Netlify** 
- **Firebase Hosting**
- **GitHub Pages**

### 2. Update the Extension
1. Update `background.js` with your deployed app URL
2. Add icon files to the `icons/` directory (see icons/README.md)
3. Update `manifest.json` with your actual homepage URL

### 3. Test Locally
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (top right toggle)
3. Click "Load unpacked" and select this `chrome-extension` folder
4. Test that clicking the extension icon opens your app

### 4. Prepare for Chrome Web Store

#### Required Files:
- [x] `manifest.json` - Extension configuration
- [x] `background.js` - Service worker
- [ ] Icon files (16x16, 32x32, 48x48, 128x128 PNG)
- [ ] Screenshots for store listing
- [ ] Promotional images (optional)

#### Store Listing Requirements:
- **Developer Account**: $5 one-time registration fee
- **Privacy Policy**: Required if extension handles user data
- **Store Screenshots**: 1280x800 or 640x400 pixels
- **Promotional Images**: 440x280 pixels (optional)

### 5. Chrome Web Store Submission

1. **Create Developer Account**
   - Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
   - Pay $5 registration fee

2. **Upload Extension**
   - Zip the entire `chrome-extension` folder
   - Upload the zip file
   - Fill out store listing details

3. **Store Listing Details**
   - **Name**: Reddzit - Reddit Saved Posts Viewer
   - **Description**: See suggested description below
   - **Category**: Productivity
   - **Screenshots**: Show your app in action
   - **Privacy Policy**: Create if needed

### Suggested Store Description:

```
Reddzit makes it easy to review and organize your saved Reddit posts in a clean, distraction-free interface.

✨ Features:
• Clean, organized view of your saved Reddit posts
• Easy navigation and search
• Distraction-free reading experience
• Direct Reddit OAuth integration
• Fast loading and responsive design

🚀 How it works:
1. Click the Reddzit extension icon
2. Log in with your Reddit account
3. Browse your saved posts in a beautiful interface

Perfect for Reddit users who save posts for later reading but struggle to find them again in Reddit's cluttered interface.

Note: This extension opens the Reddzit web application in a new tab. Reddit account required.
```

### 6. Review Process
- **Review Time**: 1-7 days typically
- **Common Rejection Reasons**: 
  - Missing privacy policy
  - Poor quality icons
  - Misleading descriptions
  - Broken functionality

## Development Tips

### Local Development
- Use `chrome://extensions/` to reload the extension during development
- Check the background script console for errors
- Test on different screen sizes

### Privacy Policy
If your app collects any user data, you'll need a privacy policy. Template:
```
This extension opens the Reddzit web application which uses Reddit OAuth for authentication. 
No personal data is collected or stored by this extension itself.
User data handling is governed by the Reddzit web application privacy policy.
```

## File Structure
```
chrome-extension/
├── manifest.json           # Extension configuration
├── background.js          # Service worker
├── icons/                 # Extension icons
│   ├── icon16.png
│   ├── icon32.png  
│   ├── icon48.png
│   └── icon128.png
└── README.md             # This file
```

## Support
For issues with the extension, create an issue on the Reddzit GitHub repository. 