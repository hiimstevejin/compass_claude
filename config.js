// Configuration file for the Chrome Extension
// This file is loaded via importScripts in the service worker

const CONFIG = {
  // Backend API Configuration
  BACKEND_URL: 'http://localhost:3000', // Change this to your backend server URL

  // API Endpoints
  ENDPOINTS: {
    PROCESS_PROMPT: '/api/quiz/process-prompt',
    EVALUATE_ANSWER: '/api/quiz/evaluate-answer',
    GET_QUESTIONS: '/api/quiz/questions',
    SUBMIT_ANSWER: '/api/quiz/submit-answer',
    CREATE_PROMPT: '/api/prompts'
  },

  // Request Configuration
  REQUEST_TIMEOUT: 30000, // 30 seconds

  // API Headers
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json'
  }
};
