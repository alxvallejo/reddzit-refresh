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

  // Open saved links button
  const openLinksBtn = document.getElementById('open-links-btn');
  openLinksBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: `${getReddzitUrl()}/reddit?tab=links` });
    window.close();
  });

  // Save This Page button
  const saveLinkBtn = document.getElementById('save-link-btn');
  const saveLinkStatus = document.getElementById('save-link-status');

  saveLinkBtn.addEventListener('click', () => {
    saveLinkBtn.disabled = true;
    saveLinkBtn.textContent = 'Saving...';
    saveLinkStatus.style.display = 'none';

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab?.url) {
        saveLinkBtn.disabled = false;
        saveLinkBtn.textContent = '\uD83D\uDD17 Save This Page';
        return;
      }

      chrome.runtime.sendMessage({
        type: 'SAVE_LINK',
        data: {
          url: tab.url,
          title: tab.title || 'Untitled',
          favicon: tab.favIconUrl || null
        }
      }, (response) => {
        saveLinkBtn.disabled = false;
        saveLinkBtn.textContent = '\uD83D\uDD17 Save This Page';

        if (response?.success) {
          saveLinkStatus.textContent = '\u2713 Link saved!';
          saveLinkStatus.className = 'save-link-status success';
        } else if (response?.error === 'NOT_AUTHENTICATED') {
          saveLinkStatus.textContent = 'Please log in to Reddzit first';
          saveLinkStatus.className = 'save-link-status error';
        } else {
          saveLinkStatus.textContent = response?.error || 'Failed to save';
          saveLinkStatus.className = 'save-link-status error';
        }
        saveLinkStatus.style.display = 'block';
      });
    });
  });

  // Logout button
  logoutBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'LOGOUT' }, () => {
      authenticatedEl.style.display = 'none';
      authRequiredEl.style.display = 'block';
    });
  });

  // Site toggle - disable/enable quote highlighting per hostname
  const siteToggleContainer = document.getElementById('site-toggle-container');
  const siteHostnameEl = document.getElementById('site-hostname');
  const siteEnabledCheckbox = document.getElementById('site-enabled');

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (!tab?.url) return;

    try {
      const url = new URL(tab.url);
      const hostname = url.hostname;

      // Don't show toggle for non-http pages or reddzit itself
      if (!url.protocol.startsWith('http') || hostname === 'reddzit.com') return;

      siteHostnameEl.textContent = hostname;
      siteToggleContainer.style.display = 'flex';

      // Check current status
      chrome.runtime.sendMessage({ type: 'GET_SITE_STATUS', hostname }, (response) => {
        if (response?.disabled) {
          siteEnabledCheckbox.checked = false;
        }
      });

      siteEnabledCheckbox.addEventListener('change', () => {
        chrome.runtime.sendMessage({ type: 'TOGGLE_SITE', hostname }, (response) => {
          siteEnabledCheckbox.checked = !response?.disabled;
        });
      });
    } catch (_) {}
  });
});
