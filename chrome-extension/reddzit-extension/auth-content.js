// auth-content.js - Extracts auth token from Reddzit localStorage

(function() {
  'use strict';

  function extractAndSendToken() {
    const token = localStorage.getItem('reddit_access_token');
    const username = localStorage.getItem('reddit_username');
    const refreshToken = localStorage.getItem('redditRefreshToken');

    // Also read lastReceived from redditCreds so extension knows token age
    let lastReceived = null;
    try {
      const creds = JSON.parse(localStorage.getItem('redditCreds'));
      lastReceived = creds?.lastReceived || null;
    } catch (_) {}

    if (token) {
      chrome.runtime.sendMessage({
        type: 'AUTH_TOKEN',
        token: token,
        username: username || null,
        refreshToken: refreshToken || null,
        lastReceived: lastReceived
      });
    }
  }

  // Extract on page load
  extractAndSendToken();

  // Also listen for storage changes (in case user logs in while page is open)
  window.addEventListener('storage', (e) => {
    if (e.key === 'reddit_access_token' || e.key === 'redditRefreshToken' || e.key === 'redditCreds') {
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
