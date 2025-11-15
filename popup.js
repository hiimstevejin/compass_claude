// Get DOM elements
const instructorBtn = document.getElementById('instructorBtn');
const quizBtn = document.getElementById('quizBtn');
const output = document.getElementById('output');

// Instructor Settings button handler
instructorBtn.addEventListener('click', () => {
  console.log('Opening Instructor Settings...');
  window.location.href = 'instructor-settings/instructor-settings.html';
});

// Quiz Question button handler
quizBtn.addEventListener('click', () => {
  console.log('Opening Quiz Questions...');
  window.location.href = 'quiz-question/quiz-question.html';
});

// Load extension info on popup open
chrome.storage.sync.get(['instructorSettings', 'quizProgress'], (result) => {
  if (result.instructorSettings) {
    console.log('Instructor settings loaded:', result.instructorSettings);
  }
  if (result.quizProgress) {
    console.log('Quiz progress loaded:', result.quizProgress);
  }
});

// Listen for messages from background or content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updatePopup') {
    output.classList.add('active');
    output.textContent = request.message;
  }
});
