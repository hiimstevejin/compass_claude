// Instructor Settings JavaScript

// Default prompts
const DEFAULT_SETTINGS = {
  quizGenerationPrompt: 'Generate comprehensive quiz questions that test understanding of the core concepts. Ensure questions are clear, unambiguous, and appropriate for the selected difficulty level.',
  evaluationPrompt: 'Evaluate student answers fairly and provide constructive feedback. Consider partial credit for answers that demonstrate understanding even if not perfectly worded.',
  difficultyLevel: 'medium',
  enableHints: false,
  enableFeedback: true
};

// DOM elements
const backBtn = document.getElementById('backBtn');
const quizGenerationPrompt = document.getElementById('quizGenerationPrompt');
const evaluationPrompt = document.getElementById('evaluationPrompt');
const difficultyLevel = document.getElementById('difficultyLevel');
const enableHints = document.getElementById('enableHints');
const enableFeedback = document.getElementById('enableFeedback');
const saveBtn = document.getElementById('saveBtn');
const resetBtn = document.getElementById('resetBtn');
const statusMessage = document.getElementById('statusMessage');
const genCharCount = document.getElementById('genCharCount');
const evalCharCount = document.getElementById('evalCharCount');

// Load saved settings on page load
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
  // Back button
  backBtn.addEventListener('click', () => {
    window.location.href = '../popup.html';
  });

  // Character counters
  quizGenerationPrompt.addEventListener('input', () => {
    genCharCount.textContent = `${quizGenerationPrompt.value.length} characters`;
  });

  evaluationPrompt.addEventListener('input', () => {
    evalCharCount.textContent = `${evaluationPrompt.value.length} characters`;
  });

  // Save button
  saveBtn.addEventListener('click', saveSettings);

  // Reset button
  resetBtn.addEventListener('click', resetToDefault);
}

// Load settings from storage
function loadSettings() {
  chrome.storage.sync.get(['instructorSettings'], (result) => {
    const settings = result.instructorSettings || DEFAULT_SETTINGS;

    quizGenerationPrompt.value = settings.quizGenerationPrompt;
    evaluationPrompt.value = settings.evaluationPrompt;
    difficultyLevel.value = settings.difficultyLevel;
    enableHints.checked = settings.enableHints;
    enableFeedback.checked = settings.enableFeedback;

    // Update character counts
    genCharCount.textContent = `${quizGenerationPrompt.value.length} characters`;
    evalCharCount.textContent = `${evaluationPrompt.value.length} characters`;

    console.log('Settings loaded:', settings);
  });
}

// Save settings to storage
function saveSettings() {
  const settings = {
    quizGenerationPrompt: quizGenerationPrompt.value.trim(),
    evaluationPrompt: evaluationPrompt.value.trim(),
    difficultyLevel: difficultyLevel.value,
    enableHints: enableHints.checked,
    enableFeedback: enableFeedback.checked,
    lastUpdated: new Date().toISOString()
  };

  // Validate
  if (!settings.quizGenerationPrompt || !settings.evaluationPrompt) {
    showStatus('Please fill in all prompt fields', 'error');
    return;
  }

  // Save to Chrome storage
  chrome.storage.sync.set({ instructorSettings: settings }, () => {
    console.log('Settings saved:', settings);
    showStatus('Settings saved successfully!', 'success');

    // Notify background script
    chrome.runtime.sendMessage({
      action: 'instructorSettingsUpdated',
      settings: settings
    });
  });
}

// Reset to default settings
function resetToDefault() {
  if (confirm('Are you sure you want to reset to default settings?')) {
    quizGenerationPrompt.value = DEFAULT_SETTINGS.quizGenerationPrompt;
    evaluationPrompt.value = DEFAULT_SETTINGS.evaluationPrompt;
    difficultyLevel.value = DEFAULT_SETTINGS.difficultyLevel;
    enableHints.checked = DEFAULT_SETTINGS.enableHints;
    enableFeedback.checked = DEFAULT_SETTINGS.enableFeedback;

    // Update character counts
    genCharCount.textContent = `${quizGenerationPrompt.value.length} characters`;
    evalCharCount.textContent = `${evaluationPrompt.value.length} characters`;

    showStatus('Reset to default settings', 'success');
  }
}

// Show status message
function showStatus(message, type) {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`;

  setTimeout(() => {
    statusMessage.className = 'status-message';
  }, 3000);
}

// Listen for messages from background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'reloadSettings') {
    loadSettings();
  }
});
