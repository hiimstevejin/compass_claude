// Quiz Question JavaScript

// Sample quiz data (in production, this would come from storage or API)
const SAMPLE_QUESTIONS = [
  {
    id: 1,
    text: 'What is the primary difference between let and const in JavaScript?',
    difficulty: 'Medium'
  },
  {
    id: 2,
    text: 'Explain the concept of closure in JavaScript with an example.',
    difficulty: 'Hard'
  },
  {
    id: 3,
    text: 'What is the purpose of the virtual DOM in React?',
    difficulty: 'Medium'
  }
];

let currentQuestionIndex = 0;
let userAnswers = [];

// DOM elements
const backBtn = document.getElementById('backBtn');
const questionNum = document.getElementById('questionNum');
const difficultyBadge = document.getElementById('difficultyBadge');
const questionText = document.getElementById('questionText');
const userPrompt = document.getElementById('userPrompt');
const promptCharCount = document.getElementById('promptCharCount');
const sendPromptBtn = document.getElementById('sendPromptBtn');
const clearPromptBtn = document.getElementById('clearPromptBtn');
const aiResponse = document.getElementById('aiResponse');
const answerText = document.getElementById('answerText');
const answerCharCount = document.getElementById('answerCharCount');
const submitAnswerBtn = document.getElementById('submitAnswerBtn');
const skipBtn = document.getElementById('skipBtn');
const feedbackSection = document.getElementById('feedbackSection');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadQuestion(currentQuestionIndex);
  setupEventListeners();
  loadInstructorSettings();
});

// Setup event listeners
function setupEventListeners() {
  // Back button
  backBtn.addEventListener('click', () => {
    window.location.href = '../popup.html';
  });

  // Character counters
  userPrompt.addEventListener('input', () => {
    promptCharCount.textContent = `${userPrompt.value.length} characters`;
  });

  answerText.addEventListener('input', () => {
    answerCharCount.textContent = `${answerText.value.length} characters`;
  });

  // Prompt buttons
  sendPromptBtn.addEventListener('click', sendPromptToAI);
  clearPromptBtn.addEventListener('click', () => {
    userPrompt.value = '';
    promptCharCount.textContent = '0 characters';
    aiResponse.classList.remove('active');
  });

  // Answer buttons
  submitAnswerBtn.addEventListener('click', submitAnswer);
  skipBtn.addEventListener('click', skipQuestion);

  // Navigation
  prevBtn.addEventListener('click', previousQuestion);
  nextBtn.addEventListener('click', nextQuestion);
}

// Load instructor settings
function loadInstructorSettings() {
  chrome.storage.sync.get(['instructorSettings'], (result) => {
    if (result.instructorSettings) {
      console.log('Loaded instructor settings:', result.instructorSettings);
      // Settings will be used when communicating with AI
    }
  });
}

// Load question
function loadQuestion(index) {
  if (index < 0 || index >= SAMPLE_QUESTIONS.length) return;

  const question = SAMPLE_QUESTIONS[index];
  currentQuestionIndex = index;

  questionNum.textContent = index + 1;
  difficultyBadge.textContent = question.difficulty;
  questionText.textContent = question.text;

  // Clear previous answer and feedback
  answerText.value = userAnswers[index]?.answer || '';
  answerCharCount.textContent = `${answerText.value.length} characters`;
  feedbackSection.classList.remove('active');
  aiResponse.classList.remove('active');

  // Update navigation buttons
  prevBtn.disabled = index === 0;
  nextBtn.disabled = index === SAMPLE_QUESTIONS.length - 1;
}

// Send prompt to AI
async function sendPromptToAI() {
  const prompt = userPrompt.value.trim();

  if (!prompt) {
    showAIResponse('Please enter a prompt first.', false);
    return;
  }

  // Show loading state
  const btnText = sendPromptBtn.querySelector('.btn-text');
  const btnLoader = sendPromptBtn.querySelector('.btn-loader');
  btnText.style.display = 'none';
  btnLoader.style.display = 'inline';
  sendPromptBtn.disabled = true;

  try {
    // Get instructor settings
    const settings = await getInstructorSettings();

    // Send message to background script to handle AI interaction
    chrome.runtime.sendMessage({
      action: 'processQuizPrompt',
      prompt: prompt,
      questionId: SAMPLE_QUESTIONS[currentQuestionIndex].id,
      questionText: SAMPLE_QUESTIONS[currentQuestionIndex].text,
      settings: settings
    }, (response) => {
      if (response && response.success) {
        showAIResponse(response.message, true);
      } else {
        showAIResponse('Error getting AI response. This is a demo - integrate with your AI service.', false);
      }

      // Reset button state
      btnText.style.display = 'inline';
      btnLoader.style.display = 'none';
      sendPromptBtn.disabled = false;
    });

  } catch (error) {
    console.error('Error sending prompt:', error);
    showAIResponse('Error communicating with AI service.', false);

    // Reset button state
    btnText.style.display = 'inline';
    btnLoader.style.display = 'none';
    sendPromptBtn.disabled = false;
  }
}

// Show AI response
function showAIResponse(message, isSuccess) {
  aiResponse.innerHTML = `
    <h3>${isSuccess ? 'AI Response' : 'Note'}</h3>
    <p>${message}</p>
  `;
  aiResponse.classList.add('active');
}

// Get instructor settings
function getInstructorSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['instructorSettings'], (result) => {
      resolve(result.instructorSettings || {});
    });
  });
}

// Submit answer
async function submitAnswer() {
  const answer = answerText.value.trim();

  if (!answer) {
    showFeedback('Please provide an answer before submitting.', false);
    return;
  }

  // Save answer
  userAnswers[currentQuestionIndex] = {
    questionId: SAMPLE_QUESTIONS[currentQuestionIndex].id,
    answer: answer,
    timestamp: new Date().toISOString()
  };

  // Get instructor settings for evaluation
  const settings = await getInstructorSettings();

  // Send to background for evaluation
  chrome.runtime.sendMessage({
    action: 'evaluateAnswer',
    questionText: SAMPLE_QUESTIONS[currentQuestionIndex].text,
    answer: answer,
    settings: settings
  }, (response) => {
    if (response && response.success) {
      showFeedback(response.feedback, true);
    } else {
      showFeedback('Answer submitted! (Integrate with AI for automatic evaluation)', true);
    }
  });

  console.log('Answer submitted:', userAnswers[currentQuestionIndex]);
}

// Show feedback
function showFeedback(message, isSuccess) {
  feedbackSection.innerHTML = `
    <h3>${isSuccess ? 'Feedback' : 'Error'}</h3>
    <p>${message}</p>
  `;
  feedbackSection.className = `feedback-section ${isSuccess ? '' : 'error'} active`;
}

// Skip question
function skipQuestion() {
  if (confirm('Are you sure you want to skip this question?')) {
    userAnswers[currentQuestionIndex] = {
      questionId: SAMPLE_QUESTIONS[currentQuestionIndex].id,
      answer: '',
      skipped: true,
      timestamp: new Date().toISOString()
    };

    if (currentQuestionIndex < SAMPLE_QUESTIONS.length - 1) {
      nextQuestion();
    } else {
      showFeedback('Question skipped. This is the last question.', true);
    }
  }
}

// Navigation
function previousQuestion() {
  if (currentQuestionIndex > 0) {
    loadQuestion(currentQuestionIndex - 1);
  }
}

function nextQuestion() {
  if (currentQuestionIndex < SAMPLE_QUESTIONS.length - 1) {
    loadQuestion(currentQuestionIndex + 1);
  }
}

// Save progress periodically
setInterval(() => {
  if (userAnswers.length > 0) {
    chrome.storage.local.set({
      quizProgress: userAnswers,
      lastUpdated: new Date().toISOString()
    }, () => {
      console.log('Progress saved');
    });
  }
}, 30000); // Save every 30 seconds
