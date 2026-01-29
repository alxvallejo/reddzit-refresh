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
