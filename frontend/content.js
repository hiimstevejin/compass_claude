// Content script - runs in the context of web pages

console.log('Chrome Extension content script loaded');

// Listen for messages from background or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received in content script:', request);

  if (request.action === 'pageLoaded') {
    console.log('Page loaded:', request.url);
    sendResponse({ status: 'received' });
  }

  if (request.action === 'contextMenuClicked') {
    console.log('Context menu clicked with text:', request.text);
    highlightText(request.text);
  }

  return true;
});

// Example: Send message to background
function notifyBackground(data) {
  chrome.runtime.sendMessage({
    action: 'contentScriptNotification',
    data: data
  });
}

// Example: Highlight selected text
function highlightText(text) {
  const selection = window.getSelection();
  if (selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    const span = document.createElement('span');
    span.className = 'extension-highlight';
    span.textContent = text;
    range.deleteContents();
    range.insertNode(span);
  }
}

// Example: Add floating button to page
function addFloatingButton() {
  const button = document.createElement('button');
  button.id = 'extension-floating-btn';
  button.className = 'extension-floating-btn';
  button.textContent = 'Extension';

  button.addEventListener('click', () => {
    console.log('Floating button clicked');
    notifyBackground({ event: 'floatingButtonClicked' });
  });

  document.body.appendChild(button);
}

// Example: Observe DOM changes
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === 'childList') {
      console.log('DOM changed:', mutation);
    }
  });
});

// Start observing (uncomment if needed)
// observer.observe(document.body, { childList: true, subtree: true });

// Example: Get page info
function getPageInfo() {
  return {
    title: document.title,
    url: window.location.href,
    meta: {
      description: document.querySelector('meta[name="description"]')?.content || '',
      keywords: document.querySelector('meta[name="keywords"]')?.content || ''
    }
  };
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  console.log('Page info:', getPageInfo());
  // Uncomment to add floating button
  // addFloatingButton();
});

// If DOM is already loaded
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  console.log('Page info:', getPageInfo());
  // Uncomment to add floating button
  // addFloatingButton();
}
