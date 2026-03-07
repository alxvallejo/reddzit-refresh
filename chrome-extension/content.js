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
  let siteDisabled = false;

  // Check if this site is disabled before setting up listeners
  chrome.storage.local.get(['disabledSites'], (result) => {
    const disabledSites = result.disabledSites || [];
    if (disabledSites.includes(window.location.hostname)) {
      siteDisabled = true;
    }
  });

  // Listen for enable/disable toggling from popup while page is open
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.disabledSites) {
      const disabledSites = changes.disabledSites.newValue || [];
      const wasDisabled = siteDisabled;
      siteDisabled = disabledSites.includes(window.location.hostname);
      if (siteDisabled && !wasDisabled) {
        hideButton();
      }
    }
  });

  // Create the floating button
  function createButton() {
    if (button) return button;

    button = document.createElement('button');
    button.id = 'reddzit-quote-btn';
    button.innerHTML = `
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z"/>
      </svg>
      <span>Save Quote</span>
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

    // Reset button state when showing
    btn.classList.remove('saving');
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z"/>
      </svg>
      <span>Save Quote</span>
    `;

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
      // Reset button text
      button.innerHTML = `
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z"/>
        </svg>
        <span>Save Quote</span>
      `;
    }
  }

  // Handle text selection
  function handleSelection() {
    if (siteDisabled) {
      hideButton();
      return;
    }

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
      <span>Saving...</span>
    `;

    // Try to extract article publish date from page meta tags
    const sourceDate = (() => {
      const selectors = [
        'meta[property="article:published_time"]',
        'meta[name="date"]',
        'meta[name="pubdate"]',
        'meta[name="publish_date"]',
        'meta[name="DC.date.issued"]',
        'meta[itemprop="datePublished"]',
        'time[datetime]',
      ];
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        const val = el?.getAttribute('content') || el?.getAttribute('datetime');
        if (val) {
          const d = new Date(val);
          if (!isNaN(d.getTime())) return d.toISOString();
        }
      }
      // Try JSON-LD
      const scripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (const s of scripts) {
        try {
          const data = JSON.parse(s.textContent);
          const dp = data.datePublished || (data['@graph'] && data['@graph'].find(i => i.datePublished))?.datePublished;
          if (dp) {
            const d = new Date(dp);
            if (!isNaN(d.getTime())) return d.toISOString();
          }
        } catch {}
      }
      return null;
    })();

    // Send message to background script
    const payload = {
      text: currentSelection,
      pageUrl: window.location.href,
      pageTitle: document.title,
      sourceUrl: window.location.href,
      sourceDate
    };
    console.log('[Reddzit] Saving quote:', payload);

    // Fallback timeout in case response never comes back
    let responseReceived = false;
    const fallbackTimeout = setTimeout(() => {
      if (!responseReceived) {
        console.warn('[Reddzit] Response timeout - hiding button');
        hideButton();
        showToast('Request timed out. Please try again.', 'error');
      }
    }, 10000);

    chrome.runtime.sendMessage({
      type: 'SAVE_QUOTE',
      data: payload
    }, (response) => {
      responseReceived = true;
      clearTimeout(fallbackTimeout);

      if (chrome.runtime.lastError) {
        console.error('[Reddzit] sendMessage error:', chrome.runtime.lastError);
        hideButton();
        showToast('Extension error. Try reloading the page.', 'error');
        return;
      }

      console.log('[Reddzit] Save response:', response);
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
