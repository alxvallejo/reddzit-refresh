// Background service worker for Reddzit Chrome Extension

// Replace this with your deployed app URL
const REDDZIT_URL = 'https://reddzit.com';


// Optional: Handle installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Reddzit extension installed');
  }
}); 