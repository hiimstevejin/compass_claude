// Instructor Content Script - Loads and manages the injectable prompt box
// This script runs in the context of web pages to inject the instructor prompt box

console.log('Instructor content script loaded');

// Global instance of the prompt box
let promptBoxInstance = null;

// Initialize the prompt box when the page loads
function initializeInstructorPromptBox() {
  // Check if already initialized
  if (promptBoxInstance) {
    console.log('Instructor prompt box already initialized');
    return;
  }

  // Load the CSS for the prompt box
  loadInstructorStyles();

  // Create and inject the prompt box
  if (typeof InstructorPromptBox !== 'undefined') {
    // Determine mode based on page type
    const isCanvasQuiz = InstructorPromptBox.isCanvasQuizPage();
    const mode = isCanvasQuiz ? 'inline' : 'floating';

    console.log(`Initializing instructor prompt box in ${mode} mode (Canvas quiz: ${isCanvasQuiz})`);

    promptBoxInstance = new InstructorPromptBox(mode);

    // For Canvas pages, wait a bit for the page to fully load
    if (mode === 'inline') {
      // Wait for DOM to be fully ready
      setTimeout(() => {
        if (promptBoxInstance) {
          promptBoxInstance.inject();
          console.log('Instructor prompt box initialized successfully on Canvas page');
        }
      }, 1000);
    } else {
      promptBoxInstance.inject();
      console.log('Instructor prompt box initialized successfully');
    }
  } else {
    console.error('InstructorPromptBox class not found');
  }
}

// Load the CSS file dynamically
function loadInstructorStyles() {
  // Check if styles are already loaded
  if (document.getElementById('instructor-prompt-styles')) {
    return;
  }

  const link = document.createElement('link');
  link.id = 'instructor-prompt-styles';
  link.rel = 'stylesheet';
  link.type = 'text/css';
  link.href = chrome.runtime.getURL('instructor-settings/inject-prompt-box.css');
  document.head.appendChild(link);
}

// Listen for messages from popup or background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Instructor content script received message:', request);

  switch (request.action) {
    case 'showInstructorPromptBox':
      if (promptBoxInstance) {
        promptBoxInstance.show();
      } else {
        initializeInstructorPromptBox();
        setTimeout(() => {
          if (promptBoxInstance) {
            promptBoxInstance.show();
          }
        }, 100);
      }
      sendResponse({ status: 'shown' });
      break;

    case 'hideInstructorPromptBox':
      if (promptBoxInstance) {
        promptBoxInstance.hide();
      }
      sendResponse({ status: 'hidden' });
      break;

    case 'toggleInstructorPromptBox':
      if (promptBoxInstance) {
        promptBoxInstance.toggle();
      } else {
        initializeInstructorPromptBox();
      }
      sendResponse({ status: 'toggled' });
      break;

    case 'removeInstructorPromptBox':
      if (promptBoxInstance) {
        promptBoxInstance.remove();
        promptBoxInstance = null;
      }
      sendResponse({ status: 'removed' });
      break;

    case 'initInstructorPromptBox':
      initializeInstructorPromptBox();
      sendResponse({ status: 'initialized' });
      break;

    default:
      sendResponse({ status: 'unknown action' });
  }

  return true;
});

// Check if we should initialize based on page type and settings
function shouldInitialize() {
  chrome.storage.sync.get(['instructorModeEnabled'], (result) => {
    if (result.instructorModeEnabled !== false) {
      // Default to enabled if not set

      // ONLY initialize on Canvas quiz/assignment creation/edit pages
      if (typeof InstructorPromptBox !== 'undefined' && InstructorPromptBox.isCanvasQuizPage()) {
        console.log('Canvas quiz page detected, initializing prompt box');
        initializeInstructorPromptBox();
      }
      // Do NOT initialize on other pages
    }
  });
}

// Auto-initialize on page load
document.addEventListener('DOMContentLoaded', shouldInitialize);

// If DOM is already loaded
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  shouldInitialize();
}

// For Canvas SPAs (Single Page Applications), watch for URL changes
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    console.log('URL changed, checking if reinitialization needed');

    // If we moved to a Canvas quiz page and don't have an inline instance
    if (typeof InstructorPromptBox !== 'undefined' && InstructorPromptBox.isCanvasQuizPage()) {
      if (!promptBoxInstance || promptBoxInstance.mode !== 'inline') {
        // Remove old instance and create new one
        if (promptBoxInstance) {
          promptBoxInstance.remove();
          promptBoxInstance = null;
        }
        setTimeout(() => shouldInitialize(), 500);
      }
    }
  }
}).observe(document, { subtree: true, childList: true });

// Export for debugging
if (typeof window !== 'undefined') {
  window.instructorContentScript = {
    initialize: initializeInstructorPromptBox,
    getInstance: () => promptBoxInstance
  };
}
