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
