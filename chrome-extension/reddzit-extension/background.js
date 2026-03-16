// background.js - Service worker for Reddzit Chrome Extension

const API_BASE = 'https://read-api.reddzit.com';
const API_BASE_DEV = 'http://localhost:3000';
const TOKEN_EXPIRY_MS = 3500 * 1000; // Refresh ~100s before the 1-hour expiry

// Determine if we're in development
function getApiBase() {
  // Use dev API if we have a dev token stored
  return new Promise((resolve) => {
    chrome.storage.local.get(['useDev'], (result) => {
      resolve(result.useDev ? API_BASE_DEV : API_BASE);
    });
  });
}

// Get all stored auth data
async function getAuthData() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['authToken', 'refreshToken', 'tokenReceivedAt', 'username'], (result) => {
      resolve(result);
    });
  });
}

// Store auth data
async function setAuthData({ token, username, refreshToken, lastReceived }) {
  const data = {};
  if (token) data.authToken = token;
  if (username) data.username = username;
  if (refreshToken) data.refreshToken = refreshToken;
  data.tokenReceivedAt = lastReceived || Date.now();
  return new Promise((resolve) => {
    chrome.storage.local.set(data, resolve);
  });
}

// Clear auth data
async function clearAuthData() {
  return new Promise((resolve) => {
    chrome.storage.local.remove(['authToken', 'refreshToken', 'tokenReceivedAt', 'username'], resolve);
  });
}

// Check if the access token needs refreshing
function tokenNeedsRefresh(tokenReceivedAt) {
  if (!tokenReceivedAt) return true;
  return Date.now() - tokenReceivedAt > TOKEN_EXPIRY_MS;
}

// Refresh the access token using the backend proxy
async function refreshAccessToken(refreshToken) {
  const apiBase = await getApiBase();
  const response = await fetch(`${apiBase}/api/reddit/oauth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('[Reddzit] Token refresh failed:', response.status, errorData);
    throw new Error('Token refresh failed');
  }

  const data = await response.json();
  if (data.error) {
    console.error('[Reddzit] Token refresh error:', data.error);
    throw new Error(data.error);
  }

  return data.access_token;
}

// Get a valid access token, refreshing if needed
async function getValidToken() {
  const authData = await getAuthData();

  if (!authData.authToken) {
    return null;
  }

  if (!tokenNeedsRefresh(authData.tokenReceivedAt)) {
    return authData.authToken;
  }

  // Token is expired — try to refresh
  if (!authData.refreshToken) {
    console.warn('[Reddzit] Token expired and no refresh token available');
    return null;
  }

  console.log('[Reddzit] Access token expired, refreshing...');
  try {
    const newToken = await refreshAccessToken(authData.refreshToken);
    await setAuthData({
      token: newToken,
      username: authData.username,
      refreshToken: authData.refreshToken,
      lastReceived: Date.now()
    });
    console.log('[Reddzit] Token refreshed successfully');
    return newToken;
  } catch (error) {
    console.error('[Reddzit] Failed to refresh token:', error);
    // Token refresh failed — clear auth so user re-authenticates
    await clearAuthData();
    return null;
  }
}

// Save link to API
async function saveLink(data) {
  const token = await getValidToken();
  if (!token) {
    return { success: false, error: 'NOT_AUTHENTICATED' };
  }

  const apiBase = await getApiBase();
  const url = `${apiBase}/api/links`;
  const body = {
    url: data.url,
    title: data.title || 'Untitled',
    description: data.description || null,
    favicon: data.favicon || null,
    imageUrl: data.imageUrl || null
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(body)
    });

    if (response.status === 401) {
      await clearAuthData();
      return { success: false, error: 'NOT_AUTHENTICATED' };
    }

    if (response.status === 409) {
      return { success: false, error: 'Link already saved' };
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false, error: errorData.error || 'Failed to save link' };
    }

    const result = await response.json();
    return { success: true, link: result.link };
  } catch (error) {
    console.error('[Reddzit] Network error saving link:', error);
    return { success: false, error: 'Network error. Please try again.' };
  }
}

// Save quote to API
async function saveQuote(data) {
  const token = await getValidToken();
  console.log('[Reddzit] Auth token:', token ? `${token.substring(0, 10)}...` : 'MISSING');

  if (!token) {
    return { success: false, error: 'NOT_AUTHENTICATED' };
  }

  const apiBase = await getApiBase();
  const url = `${apiBase}/api/quotes`;
  const body = {
    text: data.text,
    sourceUrl: data.sourceUrl,
    pageUrl: data.pageUrl,
    pageTitle: data.pageTitle,
    isExternal: true,
    subreddit: '',
    postTitle: data.pageTitle || '',
    author: '',
    sourceDate: data.sourceDate || null
  };

  console.log('[Reddzit] POST', url, body);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(body)
    });

    console.log('[Reddzit] Response status:', response.status);

    if (response.status === 401) {
      await clearAuthData();
      return { success: false, error: 'NOT_AUTHENTICATED' };
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[Reddzit] API error:', response.status, errorData);
      return { success: false, error: errorData.error || 'Failed to save quote' };
    }

    const result = await response.json();
    console.log('[Reddzit] Saved:', result);
    return { success: true, quote: result.quote };
  } catch (error) {
    console.error('[Reddzit] Network error:', error);
    return { success: false, error: 'Network error. Please try again.' };
  }
}

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'AUTH_TOKEN') {
    // Token received from Reddzit page
    setAuthData({
      token: message.token,
      username: message.username,
      refreshToken: message.refreshToken,
      lastReceived: message.lastReceived
    }).then(() => {
      console.log('Auth token stored for user:', message.username, 'refreshToken:', message.refreshToken ? 'yes' : 'no');
    });
    return false;
  }

  if (message.type === 'SAVE_QUOTE') {
    // Save quote request from content script
    saveQuote(message.data).then(sendResponse);
    return true; // Keep channel open for async response
  }

  if (message.type === 'SAVE_LINK') {
    // Save link request from popup
    saveLink(message.data).then(sendResponse);
    return true;
  }

  if (message.type === 'GET_AUTH_STATUS') {
    // Check if user is authenticated
    getAuthData().then((data) => {
      sendResponse({
        authenticated: !!data.authToken,
        username: data.username || null,
        hasRefreshToken: !!data.refreshToken
      });
    });
    return true;
  }

  if (message.type === 'LOGOUT') {
    clearAuthData().then(() => {
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

  if (message.type === 'GET_SITE_STATUS') {
    chrome.storage.local.get(['disabledSites'], (result) => {
      const disabledSites = result.disabledSites || [];
      sendResponse({ disabled: disabledSites.includes(message.hostname) });
    });
    return true;
  }

  if (message.type === 'TOGGLE_SITE') {
    chrome.storage.local.get(['disabledSites'], (result) => {
      let disabledSites = result.disabledSites || [];
      const hostname = message.hostname;
      const isCurrentlyDisabled = disabledSites.includes(hostname);

      if (isCurrentlyDisabled) {
        disabledSites = disabledSites.filter(h => h !== hostname);
      } else {
        disabledSites.push(hostname);
      }

      // Content scripts pick up the change via chrome.storage.onChanged
      chrome.storage.local.set({ disabledSites }, () => {
        sendResponse({ disabled: !isCurrentlyDisabled });
      });
    });
    return true;
  }
});

// Brief badge flash for feedback (shows ✓ or ✗ for 2 seconds)
function flashBadge(tabId, success) {
  const text = success ? '✓' : '✗';
  const color = success ? '#22c55e' : '#ef4444';
  chrome.action.setBadgeText({ text, tabId });
  chrome.action.setBadgeBackgroundColor({ color, tabId });
  setTimeout(() => {
    chrome.action.setBadgeText({ text: '', tabId });
  }, 2000);
}

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Reddzit extension installed');
  } else if (details.reason === 'update') {
    console.log('Reddzit extension updated to version', chrome.runtime.getManifest().version);
  }

  // Register context menu for images
  console.log('[Reddzit] contextMenus API available:', !!chrome.contextMenus);
  if (chrome.contextMenus) {
    chrome.contextMenus.removeAll(() => {
      const menuId = chrome.contextMenus.create({
        id: 'save-image-to-reddzit',
        title: 'Save Image to Reddzit',
        contexts: ['image']
      }, () => {
        if (chrome.runtime.lastError) {
          console.error('[Reddzit] Context menu error:', chrome.runtime.lastError.message);
        } else {
          console.log('[Reddzit] Context menu registered, id:', menuId);
        }
      });
    });
  } else {
    console.error('[Reddzit] contextMenus API not available — check permissions');
  }
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'save-image-to-reddzit') return;

  const result = await saveQuote({
    text: info.srcUrl,
    sourceUrl: tab.url,
    pageUrl: tab.url,
    pageTitle: tab.title || 'Untitled'
  });

  flashBadge(tab.id, result.success);

  if (!result.success) {
    console.error('[Reddzit] Save image failed:', result.error);
  }
});
