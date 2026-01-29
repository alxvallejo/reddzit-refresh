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
