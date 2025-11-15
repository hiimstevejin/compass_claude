// Configuration file for the Chrome Extension

const CONFIG = {
  // Backend API Configuration
  BACKEND_URL: 'http://localhost:3000', // Change this to your backend server URL

  // API Endpoints
  ENDPOINTS: {
    PROCESS_PROMPT: '/api/quiz/process-prompt',
    EVALUATE_ANSWER: '/api/quiz/evaluate-answer',
    GET_QUESTIONS: '/api/quiz/questions',
    SUBMIT_ANSWER: '/api/quiz/submit-answer',
    CREATE_PROMPT: '/api/prompts',
    GENERATE_REPORT: '/api/reports/generate',
    CHAT_REPORT: '/api/reports/chat'
  },

  // Request Configuration
  REQUEST_TIMEOUT: 30000, // 30 seconds

  // API Headers
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json'
  }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
