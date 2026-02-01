# Chrome Extension Quote Highlight Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable users to highlight text on any webpage and save it as a quote to their Reddzit account.

**Architecture:** Content script injects into all pages to detect text selection and show a floating save button. When clicked, the selection and page metadata are sent to the background service worker, which calls the Reddzit API. Authentication is handled by extracting the Reddit access token from Reddzit's localStorage when the user visits reddzit.com.

**Tech Stack:** Chrome Extension Manifest V3, Content Scripts, Service Workers, chrome.storage API

---

## Task 1: Update manifest.json with Required Permissions

**Files:**
- Modify: `chrome-extension/manifest.json`

**Step 1: Update manifest.json**

Replace the entire contents with:

```json
{
  "manifest_version": 3,
  "name": "Reddzit - Save Quotes from Any Page",
  "description": "Highlight text on any webpage and save it to your Reddzit quote library",
  "version": "2.0.0",
  "author": "Reddzit Team",

  "action": {
    "default_title": "Reddzit",
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "32": "icons/icon32.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },

  "background": {
    "service_worker": "background.js"
  },

  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "css": ["content.css"]
    },
    {
      "matches": ["https://reddzit.com/*", "http://localhost:5173/*"],
      "js": ["auth-content.js"]
    }
  ],

  "permissions": [
    "storage",
    "activeTab"
  ],

  "host_permissions": [
    "https://reddzit.com/*",
    "http://localhost:3001/*"
  ],

  "icons": {
    "16": "icons/icon16.png",
    "32": "icons/icon32.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },

  "homepage_url": "https://reddzit.com"
}
```

**Step 2: Commit**

```bash
git add chrome-extension/manifest.json
git commit -m "feat(extension): update manifest for quote highlight feature"
```

---

## Task 2: Create Auth Content Script for Token Extraction

**Files:**
- Create: `chrome-extension/auth-content.js`

**Step 1: Create auth-content.js**

This script runs only on reddzit.com and extracts the auth token:

```javascript
// auth-content.js - Extracts auth token from Reddzit localStorage

(function() {
  'use strict';

  function extractAndSendToken() {
    const token = localStorage.getItem('reddit_access_token');
    const username = localStorage.getItem('reddit_username');

    if (token) {
      chrome.runtime.sendMessage({
        type: 'AUTH_TOKEN',
        token: token,
        username: username || null
      });
    }
  }

  // Extract on page load
  extractAndSendToken();

  // Also listen for storage changes (in case user logs in while page is open)
  window.addEventListener('storage', (e) => {
    if (e.key === 'reddit_access_token') {
      extractAndSendToken();
    }
  });

  // Check periodically in case token is set after page load
  let checkCount = 0;
  const checkInterval = setInterval(() => {
    extractAndSendToken();
    checkCount++;
    if (checkCount >= 10) {
      clearInterval(checkInterval);
    }
  }, 1000);
})();
```

**Step 2: Commit**

```bash
git add chrome-extension/auth-content.js
git commit -m "feat(extension): add auth content script for token extraction"
```

---

## Task 3: Create Content Script for Text Selection

**Files:**
- Create: `chrome-extension/content.js`
- Create: `chrome-extension/content.css`

**Step 1: Create content.css**

```css
/* Reddzit Quote Selection Button */
#reddzit-quote-btn {
  position: absolute;
  z-index: 2147483647;
  display: none;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: linear-gradient(135deg, #ff4500 0%, #ff6b3d 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(255, 69, 0, 0.4);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  pointer-events: auto;
}

#reddzit-quote-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(255, 69, 0, 0.5);
}

#reddzit-quote-btn:active {
  transform: translateY(0);
}

#reddzit-quote-btn svg {
  width: 14px;
  height: 14px;
  fill: currentColor;
}

#reddzit-quote-btn.saving {
  opacity: 0.7;
  pointer-events: none;
}

/* Toast notification */
#reddzit-toast {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 2147483647;
  padding: 12px 20px;
  background: #1a1a1a;
  color: white;
  border-radius: 8px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.3s ease, transform 0.3s ease;
}

#reddzit-toast.show {
  opacity: 1;
  transform: translateY(0);
}

#reddzit-toast.success {
  background: #10b981;
}

#reddzit-toast.error {
  background: #ef4444;
}
```

**Step 2: Create content.js**

```javascript
// content.js - Detects text selection and shows save button

(function() {
  'use strict';

  // Don't run on Reddzit itself
  if (window.location.hostname === 'reddzit.com' ||
      window.location.hostname === 'localhost' && window.location.port === '5173') {
    return;
  }

  let button = null;
  let toast = null;
  let currentSelection = '';

  // Create the floating button
  function createButton() {
    if (button) return button;

    button = document.createElement('button');
    button.id = 'reddzit-quote-btn';
    button.innerHTML = `
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z"/>
      </svg>
      Save Quote
    `;
    button.addEventListener('click', handleSaveClick);
    document.body.appendChild(button);
    return button;
  }

  // Create toast notification
  function createToast() {
    if (toast) return toast;

    toast = document.createElement('div');
    toast.id = 'reddzit-toast';
    document.body.appendChild(toast);
    return toast;
  }

  // Show toast message
  function showToast(message, type = 'success') {
    const t = createToast();
    t.textContent = message;
    t.className = 'show ' + type;

    setTimeout(() => {
      t.className = '';
    }, 3000);
  }

  // Position the button near selection
  function positionButton(rect) {
    const btn = createButton();
    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;

    // Position above selection, centered
    let top = rect.top + scrollY - 45;
    let left = rect.left + scrollX + (rect.width / 2) - (btn.offsetWidth / 2);

    // If button would be off-screen top, show below selection
    if (top < scrollY + 10) {
      top = rect.bottom + scrollY + 10;
    }

    // Keep within horizontal bounds
    left = Math.max(10, Math.min(left, window.innerWidth - btn.offsetWidth - 10));

    btn.style.top = `${top}px`;
    btn.style.left = `${left}px`;
    btn.style.display = 'flex';
  }

  // Hide the button
  function hideButton() {
    if (button) {
      button.style.display = 'none';
      button.classList.remove('saving');
    }
  }

  // Handle text selection
  function handleSelection() {
    const selection = window.getSelection();
    const text = selection?.toString().trim();

    if (!text || text.length < 3) {
      hideButton();
      currentSelection = '';
      return;
    }

    currentSelection = text;

    // Get selection bounding rect
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    if (rect.width > 0 && rect.height > 0) {
      positionButton(rect);
    }
  }

  // Handle save button click
  async function handleSaveClick(e) {
    e.preventDefault();
    e.stopPropagation();

    if (!currentSelection) {
      hideButton();
      return;
    }

    const btn = createButton();
    btn.classList.add('saving');
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="animation: spin 1s linear infinite;">
        <path d="M12 2v4m0 12v4m10-10h-4M6 12H2m15.07-7.07l-2.83 2.83M9.76 14.24l-2.83 2.83m0-10.14l2.83 2.83m4.48 4.48l2.83 2.83"/>
      </svg>
      Saving...
    `;

    // Send message to background script
    chrome.runtime.sendMessage({
      type: 'SAVE_QUOTE',
      data: {
        text: currentSelection,
        pageUrl: window.location.href,
        pageTitle: document.title,
        sourceUrl: window.location.href
      }
    }, (response) => {
      hideButton();
      window.getSelection()?.removeAllRanges();

      if (response?.success) {
        showToast('Quote saved to Reddzit!', 'success');
      } else if (response?.error === 'NOT_AUTHENTICATED') {
        showToast('Please log in to Reddzit first', 'error');
      } else {
        showToast(response?.error || 'Failed to save quote', 'error');
      }
    });
  }

  // Listen for selection changes
  document.addEventListener('selectionchange', () => {
    // Debounce selection handling
    clearTimeout(handleSelection.timeout);
    handleSelection.timeout = setTimeout(handleSelection, 200);
  });

  // Hide button when clicking elsewhere
  document.addEventListener('mousedown', (e) => {
    if (button && e.target !== button && !button.contains(e.target)) {
      // Small delay to allow button click to register
      setTimeout(() => {
        const selection = window.getSelection()?.toString().trim();
        if (!selection) {
          hideButton();
        }
      }, 100);
    }
  });

  // Add keyframe animation for spinner
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
})();
```

**Step 3: Commit**

```bash
git add chrome-extension/content.js chrome-extension/content.css
git commit -m "feat(extension): add content script for text selection and save button"
```

---

## Task 4: Update Background Service Worker

**Files:**
- Modify: `chrome-extension/background.js`

**Step 1: Replace background.js**

```javascript
// background.js - Service worker for Reddzit Chrome Extension

const API_BASE = 'https://reddzit.com';
const API_BASE_DEV = 'http://localhost:3001';

// Determine if we're in development
function getApiBase() {
  // Use dev API if we have a dev token stored
  return new Promise((resolve) => {
    chrome.storage.local.get(['useDev'], (result) => {
      resolve(result.useDev ? API_BASE_DEV : API_BASE);
    });
  });
}

// Get stored auth token
async function getAuthToken() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['authToken'], (result) => {
      resolve(result.authToken || null);
    });
  });
}

// Store auth token
async function setAuthToken(token, username) {
  return new Promise((resolve) => {
    chrome.storage.local.set({
      authToken: token,
      username: username
    }, resolve);
  });
}

// Clear auth token
async function clearAuthToken() {
  return new Promise((resolve) => {
    chrome.storage.local.remove(['authToken', 'username'], resolve);
  });
}

// Save quote to API
async function saveQuote(data) {
  const token = await getAuthToken();
  if (!token) {
    return { success: false, error: 'NOT_AUTHENTICATED' };
  }

  const apiBase = await getApiBase();

  try {
    const response = await fetch(`${apiBase}/api/quotes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        text: data.text,
        sourceUrl: data.sourceUrl,
        pageUrl: data.pageUrl,
        pageTitle: data.pageTitle,
        isExternal: true,
        // These are empty for external quotes
        subreddit: '',
        postTitle: data.pageTitle || '',
        author: ''
      })
    });

    if (response.status === 401) {
      // Token expired or invalid
      await clearAuthToken();
      return { success: false, error: 'NOT_AUTHENTICATED' };
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false, error: errorData.error || 'Failed to save quote' };
    }

    const result = await response.json();
    return { success: true, quote: result.quote };
  } catch (error) {
    console.error('Save quote error:', error);
    return { success: false, error: 'Network error. Please try again.' };
  }
}

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'AUTH_TOKEN') {
    // Token received from Reddzit page
    setAuthToken(message.token, message.username).then(() => {
      console.log('Auth token stored for user:', message.username);
    });
    return false;
  }

  if (message.type === 'SAVE_QUOTE') {
    // Save quote request from content script
    saveQuote(message.data).then(sendResponse);
    return true; // Keep channel open for async response
  }

  if (message.type === 'GET_AUTH_STATUS') {
    // Check if user is authenticated
    Promise.all([
      getAuthToken(),
      new Promise(resolve => chrome.storage.local.get(['username'], resolve))
    ]).then(([token, data]) => {
      sendResponse({
        authenticated: !!token,
        username: data.username || null
      });
    });
    return true;
  }

  if (message.type === 'LOGOUT') {
    clearAuthToken().then(() => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.type === 'SET_DEV_MODE') {
    chrome.storage.local.set({ useDev: message.enabled }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
});

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Reddzit extension installed');
  } else if (details.reason === 'update') {
    console.log('Reddzit extension updated to version', chrome.runtime.getManifest().version);
  }
});
```

**Step 2: Commit**

```bash
git add chrome-extension/background.js
git commit -m "feat(extension): update background script with quote saving and auth"
```

---

## Task 5: Update Popup UI for Authentication

**Files:**
- Modify: `chrome-extension/popup.html`
- Modify: `chrome-extension/popup.js`
- Modify: `chrome-extension/popup.css`

**Step 1: Replace popup.html**

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Reddzit</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="container">
    <header>
      <div class="logo">
        <img src="icons/icon32.png" alt="Reddzit" width="24" height="24">
        <span>Reddzit</span>
      </div>
    </header>

    <!-- Not authenticated state -->
    <div id="auth-required" class="section" style="display: none;">
      <div class="hero">
        <div class="hero-icon">📝</div>
        <h2>Save Quotes from Anywhere</h2>
        <p>Highlight text on any page and save it to your Reddzit library.</p>
      </div>
      <button id="connect-btn" class="primary-btn">
        Connect with Reddzit
      </button>
      <p class="hint">You'll be redirected to log in with Reddit</p>
    </div>

    <!-- Authenticated state -->
    <div id="authenticated" class="section" style="display: none;">
      <div class="user-info">
        <div class="avatar">👤</div>
        <div class="user-details">
          <div class="username" id="username">Loading...</div>
          <div class="status">Connected</div>
        </div>
      </div>

      <div class="instructions">
        <h3>How to save quotes:</h3>
        <ol>
          <li>Highlight any text on a webpage</li>
          <li>Click the "Save Quote" button that appears</li>
          <li>View your quotes on Reddzit</li>
        </ol>
      </div>

      <div class="actions">
        <button id="open-quotes-btn" class="primary-btn">
          View Your Quotes
        </button>
        <button id="logout-btn" class="secondary-btn">
          Disconnect
        </button>
      </div>
    </div>

    <!-- Loading state -->
    <div id="loading" class="section">
      <div class="spinner"></div>
      <p>Loading...</p>
    </div>

    <footer>
      <label class="dev-toggle" id="dev-toggle-container" style="display: none;">
        <input type="checkbox" id="dev-mode">
        <span>Dev mode</span>
      </label>
    </footer>
  </div>
  <script src="popup.js"></script>
</body>
</html>
```

**Step 2: Replace popup.css**

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  width: 320px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  color: #1a1a1a;
  background: #fff;
}

.container {
  display: flex;
  flex-direction: column;
  min-height: 200px;
}

/* Header */
header {
  background: linear-gradient(135deg, #ff4500 0%, #ff6b3d 100%);
  padding: 16px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  color: white;
  font-size: 18px;
  font-weight: 700;
}

.logo img {
  border-radius: 4px;
}

/* Sections */
.section {
  padding: 20px;
}

#loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: #666;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #eee;
  border-top-color: #ff4500;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 12px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Hero section */
.hero {
  text-align: center;
  margin-bottom: 20px;
}

.hero-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.hero h2 {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 8px;
  color: #1a1a1a;
}

.hero p {
  font-size: 14px;
  color: #666;
  line-height: 1.4;
}

/* Buttons */
.primary-btn {
  width: 100%;
  padding: 12px 16px;
  background: linear-gradient(135deg, #ff4500 0%, #ff6b3d 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.primary-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(255, 69, 0, 0.3);
}

.primary-btn:active {
  transform: translateY(0);
}

.secondary-btn {
  width: 100%;
  padding: 10px 16px;
  background: transparent;
  color: #666;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.secondary-btn:hover {
  background: #f5f5f5;
  border-color: #ccc;
}

.hint {
  text-align: center;
  font-size: 12px;
  color: #999;
  margin-top: 12px;
}

/* User info */
.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #f9f9f9;
  border-radius: 12px;
  margin-bottom: 20px;
}

.avatar {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #ff4500 0%, #ff6b3d 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.user-details {
  flex: 1;
}

.username {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
}

.status {
  font-size: 12px;
  color: #10b981;
  display: flex;
  align-items: center;
  gap: 4px;
}

.status::before {
  content: '';
  width: 6px;
  height: 6px;
  background: #10b981;
  border-radius: 50%;
}

/* Instructions */
.instructions {
  margin-bottom: 20px;
}

.instructions h3 {
  font-size: 13px;
  font-weight: 600;
  color: #666;
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.instructions ol {
  padding-left: 20px;
  font-size: 14px;
  color: #444;
  line-height: 1.8;
}

.instructions li {
  margin-bottom: 4px;
}

/* Actions */
.actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* Footer */
footer {
  padding: 12px 16px;
  border-top: 1px solid #eee;
  background: #fafafa;
}

.dev-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #999;
  cursor: pointer;
}

.dev-toggle input {
  cursor: pointer;
}
```

**Step 3: Replace popup.js**

```javascript
// popup.js - Popup UI for Reddzit extension

const REDDZIT_URL = 'https://reddzit.com';
const REDDZIT_DEV_URL = 'http://localhost:5173';

document.addEventListener('DOMContentLoaded', async () => {
  const loadingEl = document.getElementById('loading');
  const authRequiredEl = document.getElementById('auth-required');
  const authenticatedEl = document.getElementById('authenticated');
  const usernameEl = document.getElementById('username');
  const connectBtn = document.getElementById('connect-btn');
  const openQuotesBtn = document.getElementById('open-quotes-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const devModeCheckbox = document.getElementById('dev-mode');
  const devToggleContainer = document.getElementById('dev-toggle-container');

  // Check dev mode
  chrome.storage.local.get(['useDev'], (result) => {
    if (result.useDev) {
      devModeCheckbox.checked = true;
    }
    // Show dev toggle with keyboard shortcut
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        devToggleContainer.style.display = 'flex';
      }
    });
  });

  devModeCheckbox.addEventListener('change', () => {
    chrome.runtime.sendMessage({
      type: 'SET_DEV_MODE',
      enabled: devModeCheckbox.checked
    });
  });

  // Get current URL for redirect
  function getReddzitUrl() {
    return devModeCheckbox.checked ? REDDZIT_DEV_URL : REDDZIT_URL;
  }

  // Check authentication status
  chrome.runtime.sendMessage({ type: 'GET_AUTH_STATUS' }, (response) => {
    loadingEl.style.display = 'none';

    if (response?.authenticated) {
      authenticatedEl.style.display = 'block';
      usernameEl.textContent = response.username ? `u/${response.username}` : 'Connected';
    } else {
      authRequiredEl.style.display = 'block';
    }
  });

  // Connect button - opens Reddzit
  connectBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: getReddzitUrl() });
    window.close();
  });

  // Open quotes button
  openQuotesBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: `${getReddzitUrl()}/quotes` });
    window.close();
  });

  // Logout button
  logoutBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'LOGOUT' }, () => {
      authenticatedEl.style.display = 'none';
      authRequiredEl.style.display = 'block';
    });
  });
});
```

**Step 4: Commit**

```bash
git add chrome-extension/popup.html chrome-extension/popup.js chrome-extension/popup.css
git commit -m "feat(extension): update popup UI with auth status and instructions"
```

---

## Task 6: Update Reddzit App to Store Username in localStorage

**Files:**
- Modify: `src/context/RedditContext.tsx`

**Step 1: Find the RedditContext file and add username storage**

In the `RedditContext.tsx`, after successfully getting the user from Reddit OAuth, store the username in localStorage alongside the token. Look for where `reddit_access_token` is stored and add:

```typescript
localStorage.setItem('reddit_username', user.name);
```

And in the logout function, also remove it:

```typescript
localStorage.removeItem('reddit_username');
```

**Step 2: Verify the token key**

Check what key is used for storing the access token in localStorage (likely `reddit_access_token` or similar). The auth-content.js script needs to match this key.

**Step 3: Commit**

```bash
git add src/context/RedditContext.tsx
git commit -m "feat: store reddit username in localStorage for extension"
```

---

## Task 7: Test the Extension End-to-End

**Files:** None (manual testing)

**Step 1: Load the extension in Chrome**

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (top right toggle)
3. Click "Load unpacked" and select the `chrome-extension` folder
4. Note any errors in the console

**Step 2: Test authentication flow**

1. Click the Reddzit extension icon - should show "Connect with Reddzit"
2. Click "Connect with Reddzit" - opens Reddzit
3. Log in with Reddit if not already logged in
4. Click extension icon again - should show "Connected" with username

**Step 3: Test quote saving**

1. Go to any webpage (e.g., Wikipedia, news article)
2. Highlight some text (at least 3 characters)
3. "Save Quote" button should appear above selection
4. Click the button
5. Should see "Quote saved to Reddzit!" toast
6. Click extension icon > "View Your Quotes" to verify

**Step 4: Test error states**

1. Log out from extension
2. Try to save a quote - should see "Please log in to Reddzit first"
3. Test on chrome:// pages - button should not appear

**Step 5: Commit final working state**

```bash
git add -A
git commit -m "feat(extension): complete quote highlight feature implementation"
```

---

## Summary

The Chrome extension now provides:

1. **Text Selection Detection** - Content script monitors for text selection on all webpages
2. **Floating Save Button** - Appears above selected text with smooth animations
3. **Background API Integration** - Service worker handles API calls with auth
4. **Automatic Auth** - Token extracted when user visits Reddzit while extension is installed
5. **Popup UI** - Shows connection status and instructions
6. **Toast Notifications** - Visual feedback for save success/failure

The feature integrates with the existing Quote API using the `isExternal: true` flag for non-Reddit quotes.
