// Background service worker for Chrome Extension

// Extension installation or update
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Extension installed');
    // Set default values
    chrome.storage.sync.set({
      enabled: true,
      installDate: new Date().toISOString()
    });
  } else if (details.reason === 'update') {
    console.log('Extension updated to version:', chrome.runtime.getManifest().version);
  }
});

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received in background:', request);

  if (request.action === 'performAction') {
    // Perform some background work
    const result = performBackgroundTask();
    sendResponse({ success: true, message: result });
  }

  if (request.action === 'instructorSettingsUpdated') {
    // Handle instructor settings update
    console.log('Instructor settings updated:', request.settings);
    sendResponse({ success: true });
  }

  if (request.action === 'processQuizPrompt') {
    // Handle quiz prompt - integrate with AI service here
    console.log('Processing quiz prompt:', request);

    // Placeholder response - integrate with your AI service
    const demoResponse = `Based on your question about "${request.questionText.substring(0, 50)}...", here's a hint: Consider the key concepts and how they relate to each other.`;

    sendResponse({
      success: true,
      message: demoResponse
    });
  }

  if (request.action === 'evaluateAnswer') {
    // Handle answer evaluation - integrate with AI service here
    console.log('Evaluating answer:', request);

    // Placeholder response - integrate with your AI service
    const demoFeedback = 'Good effort! Your answer demonstrates understanding of the core concepts. Consider providing more specific examples to strengthen your response.';

    sendResponse({
      success: true,
      feedback: demoFeedback
    });
  }

  // Return true to indicate async response
  return true;
});

// Example background task
function performBackgroundTask() {
  const timestamp = new Date().toLocaleTimeString();
  console.log('Background task performed at:', timestamp);
  return `Task completed at ${timestamp}`;
}

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    console.log('Tab updated:', tab.url);

    // Example: Send message to content script
    chrome.tabs.sendMessage(tabId, {
      action: 'pageLoaded',
      url: tab.url
    }).catch(err => {
      // Content script might not be injected yet
      console.log('Could not send message to tab:', err.message);
    });
  }
});

// Example: Create context menu item
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'myExtensionAction',
    title: 'My Extension Action',
    contexts: ['selection']
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'myExtensionAction') {
    console.log('Selected text:', info.selectionText);

    // Send to content script
    chrome.tabs.sendMessage(tab.id, {
      action: 'contextMenuClicked',
      text: info.selectionText
    });
  }
});

// Example: Set badge text
function updateBadge(text, color = '#FF0000') {
  chrome.action.setBadgeText({ text: text });
  chrome.action.setBadgeBackgroundColor({ color: color });
}

// Example usage
chrome.storage.sync.get(['enabled'], (result) => {
  if (result.enabled) {
    updateBadge('ON', '#00AA00');
  } else {
    updateBadge('OFF', '#FF0000');
  }
});
