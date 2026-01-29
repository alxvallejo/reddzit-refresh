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
