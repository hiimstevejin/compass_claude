// Get DOM elements
const actionBtn = document.getElementById('actionBtn');
const settingsBtn = document.getElementById('settingsBtn');
const output = document.getElementById('output');

// Action button click handler
actionBtn.addEventListener('click', async () => {
  output.classList.add('active');
  output.textContent = 'Button clicked! Sending message to background...';

  // Send message to background script
  chrome.runtime.sendMessage({ action: 'performAction' }, (response) => {
    if (response && response.success) {
      output.textContent = response.message;
    }
  });

  // Get active tab info
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  console.log('Current tab:', tab);
});

// Settings button click handler
settingsBtn.addEventListener('click', () => {
  output.classList.add('active');
  output.textContent = 'Settings clicked!';

  // Example: Store data in chrome.storage
  chrome.storage.sync.set({
    settingsOpened: true,
    timestamp: new Date().toISOString()
  }, () => {
    console.log('Settings data saved');
  });
});

// Load saved data on popup open
chrome.storage.sync.get(['settingsOpened', 'timestamp'], (result) => {
  if (result.settingsOpened) {
    console.log('Settings were last opened at:', result.timestamp);
  }
});

// Listen for messages from background or content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updatePopup') {
    output.classList.add('active');
    output.textContent = request.message;
  }
});
