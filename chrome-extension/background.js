// Background service worker for Reddzit Chrome Extension

// Replace this with your deployed app URL
const REDDZIT_URL = 'https://reddzit.com';

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  // Open Reddzit in a new tab
  chrome.tabs.create({
    url: REDDZIT_URL,
    active: true
  });
});

// Optional: Handle installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Reddzit extension installed');
  }
}); 