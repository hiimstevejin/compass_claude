// Quiz Question Assistant - Injects question prompt UI into Canvas quizzes

class QuizQuestionAssistant {
  constructor() {
    this.questions = new Map();
    this.initialized = false;
    this.assignmentId = this.extractAssignmentId();
  }

  // Extract assignment/quiz ID from the page
  extractAssignmentId() {
    // Try to get from URL first (Canvas format: /courses/xxx/quizzes/123)
    const urlMatch = window.location.pathname.match(/\/quizzes\/(\d+)/);
    if (urlMatch) {
      return `quiz_${urlMatch[1]}`;
    }

    // Try to get from URL (alternative format: /assignments/456)
    const assignmentMatch = window.location.pathname.match(/\/assignments\/(\d+)/);
    if (assignmentMatch) {
      return `assignment_${assignmentMatch[1]}`;
    }

    // Try to find from page data attributes
    const quizContainer = document.querySelector('[data-quiz-id]');
    if (quizContainer) {
      return `quiz_${quizContainer.getAttribute('data-quiz-id')}`;
    }

    // Fallback: generate from URL path
    const pathParts = window.location.pathname.split('/').filter(p => p);
    if (pathParts.length > 0) {
      return pathParts[pathParts.length - 1] || 'unknown_quiz';
    }

    return 'unknown_quiz';
  }

  // Initialize the assistant
  init() {
    if (this.initialized) return;

    console.log('Quiz Question Assistant initialized');
    this.initialized = true;

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.detectAndInject());
    } else {
      this.detectAndInject();
    }

    // Watch for dynamic question loading (Canvas often loads questions dynamically)
    this.observeQuizChanges();
  }

  // Detect Canvas quiz questions and inject UI
  detectAndInject() {
    // Canvas quiz questions are typically in question containers
    // Common selectors for Canvas quiz questions:
    const questionSelectors = [
      '.question',
      '[class*="question"]',
      '.quiz_question',
      '[data-automation="sdk-overlay"]' // From user's example
    ];

    // Try to find question containers
    let questionElements = [];

    for (const selector of questionSelectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        questionElements = Array.from(elements);
        break;
      }
    }

    // If no questions found with specific selectors, try to find by structure
    if (questionElements.length === 0) {
      // Look for elements with question-like structure
      questionElements = this.findQuestionsByStructure();
    }

    console.log(`Found ${questionElements.length} quiz questions`);

    // Inject UI for each question
    questionElements.forEach((questionEl, index) => {
      this.injectQuestionUI(questionEl, index);
    });
  }

  // Find questions by analyzing DOM structure
  findQuestionsByStructure() {
    const questions = [];

    // Look for common Canvas quiz patterns
    const possibleQuestions = document.querySelectorAll('[role="presentation"]');

    possibleQuestions.forEach(el => {
      // Check if this looks like a question container
      if (el.querySelector('.question_text') ||
          el.querySelector('[class*="question"]') ||
          el.textContent.length > 20) { // Has substantial text content
        questions.push(el);
      }
    });

    // If still no questions, try to find divs with specific classes
    if (questions.length === 0) {
      const divs = document.querySelectorAll('div[class*="display_question"]');
      questions.push(...divs);
    }

    return questions;
  }

  // Inject question UI next to a question element
  injectQuestionUI(questionEl, questionIndex) {
    // Check if UI already injected for this question
    if (questionEl.querySelector('.quiz-assistant-container')) {
      return;
    }

    // Extract question text
    const questionText = this.extractQuestionText(questionEl);
    const questionId = this.generateQuestionId(questionEl, questionIndex);

    // Store question info
    this.questions.set(questionId, {
      element: questionEl,
      text: questionText,
      index: questionIndex
    });

    // Create UI container
    const container = document.createElement('div');
    container.className = 'quiz-assistant-container';
    container.setAttribute('data-question-id', questionId);

    // Create UI elements
    container.innerHTML = `
      <div class="quiz-assistant-header">
        <span class="quiz-assistant-icon">💡</span>
        <span class="quiz-assistant-title">Ask a question about this problem</span>
        <button type="button" class="quiz-assistant-toggle" title="Toggle assistant">▼</button>
      </div>
      <div class="quiz-assistant-content">
        <textarea
          class="quiz-assistant-textarea"
          placeholder="Type your question here... (e.g., 'Can you explain what this question is asking?')"
          rows="3"
        ></textarea>
        <div class="quiz-assistant-actions">
          <button type="button" class="quiz-assistant-submit">Send Question</button>
          <span class="quiz-assistant-status"></span>
        </div>
        <div class="quiz-assistant-response"></div>
      </div>
    `;

    // Add event listeners
    this.attachEventListeners(container, questionId);

    // Try to inject next to question
    const injected = this.injectNextToQuestion(questionEl, container);

    if (!injected) {
      console.warn('Could not inject UI next to question, considering fallback');
    }
  }

  // Extract question text from question element
  extractQuestionText(questionEl) {
    // Try different selectors to find question text
    const textSelectors = [
      '.question_text',
      '[class*="question_text"]',
      '.question-text',
      '[class*="questionText"]',
      'p',
      'div'
    ];

    for (const selector of textSelectors) {
      const textEl = questionEl.querySelector(selector);
      if (textEl && textEl.textContent.trim().length > 10) {
        return textEl.textContent.trim();
      }
    }

    // Fallback: get all text content
    return questionEl.textContent.trim().substring(0, 500);
  }

  // Generate a unique ID for a question
  generateQuestionId(questionEl, index) {
    // Try to use Canvas's question ID if available
    const canvasId = questionEl.getAttribute('id') ||
                     questionEl.getAttribute('data-question-id') ||
                     questionEl.getAttribute('data-id');

    if (canvasId) {
      return canvasId;
    }

    // Otherwise generate from index and text
    return `question-${index}`;
  }

  // Inject container next to question element
  injectNextToQuestion(questionEl, container) {
    try {
      // Try to find a good spot to inject
      // Option 1: After question text
      const questionText = questionEl.querySelector('.question_text, [class*="question_text"]');
      if (questionText) {
        questionText.parentNode.insertBefore(container, questionText.nextSibling);
        return true;
      }

      // Option 2: At the end of question container
      if (questionEl.classList.contains('question') || questionEl.querySelector('.question')) {
        questionEl.appendChild(container);
        return true;
      }

      // Option 3: After the question element
      if (questionEl.parentNode) {
        questionEl.parentNode.insertBefore(container, questionEl.nextSibling);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error injecting UI:', error);
      return false;
    }
  }

  // Attach event listeners to UI elements
  attachEventListeners(container, questionId) {
    const textarea = container.querySelector('.quiz-assistant-textarea');
    const submitBtn = container.querySelector('.quiz-assistant-submit');
    const toggleBtn = container.querySelector('.quiz-assistant-toggle');
    const content = container.querySelector('.quiz-assistant-content');
    const statusEl = container.querySelector('.quiz-assistant-status');
    const responseEl = container.querySelector('.quiz-assistant-response');

    // Toggle button
    toggleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const isExpanded = content.style.display !== 'none';
      content.style.display = isExpanded ? 'none' : 'block';
      toggleBtn.textContent = isExpanded ? '▶' : '▼';
    });

    // Submit button
    submitBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      const prompt = textarea.value.trim();

      if (!prompt) {
        this.showStatus(statusEl, 'Please enter a question', 'error');
        return;
      }

      // Get question info
      const questionInfo = this.questions.get(questionId);
      if (!questionInfo) {
        this.showStatus(statusEl, 'Question not found', 'error');
        return;
      }

      // Show loading state
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending...';
      this.showStatus(statusEl, 'Processing...', 'loading');
      responseEl.textContent = '';

      // Send to background script
      try {
        const response = await this.sendQuestionToBackend(
          questionId,
          questionInfo.text,
          prompt,
          this.assignmentId
        );

        if (response.success) {
          this.showStatus(statusEl, 'Response received!', 'success');
          this.showResponse(responseEl, response.message);
          textarea.value = ''; // Clear textarea
        } else {
          this.showStatus(statusEl, response.message || 'Error occurred', 'error');
        }
      } catch (error) {
        console.error('Error sending question:', error);
        this.showStatus(statusEl, 'Failed to send question', 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Question';
      }
    });

    // Allow Enter key to submit (with Shift+Enter for newlines)
    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        submitBtn.click();
      }
    });
  }

  // Send question to backend via background script
  async sendQuestionToBackend(questionId, questionText, prompt, assignmentId) {
    // Log the data being sent
    console.log('📤 QUIZ ASSISTANT - Sending to background script:', {
      action: 'processQuizPrompt',
      questionId: questionId,
      questionText: questionText,
      prompt: prompt,
      assignmentId: assignmentId,
      settings: {}
    });

    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        action: 'processQuizPrompt',
        questionId: questionId,
        questionText: questionText,
        prompt: prompt,
        assignmentId: assignmentId,
        settings: {} // Can add settings later if needed
      }, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          // Check if backend failed - if so, use demo mode
          if (!response.success && response.message &&
              response.message.includes('Failed to connect to backend')) {
            console.log('Backend unavailable, using DEMO MODE');
            resolve(this.getDemoResponse(questionText, prompt));
          } else {
            resolve(response);
          }
        }
      });
    });
  }

  // Demo mode response when backend is unavailable
  getDemoResponse(questionText, prompt) {
    // Simulate a helpful AI response
    const responses = [
      `Great question! Let me help you understand this better.\n\nFor the question: "${questionText.substring(0, 100)}..."\n\nYour question was: "${prompt}"\n\n✨ DEMO MODE: This is a simulated response. When your backend server is running, you'll receive real AI-powered answers here!\n\nTo activate the real backend:\n1. Start your backend server on http://localhost:3000\n2. Make sure the /api/quiz/process-prompt endpoint is available\n3. Try asking your question again!`,

      `📚 I understand you're asking: "${prompt}"\n\n✨ DEMO MODE ACTIVE\n\nThis question asks about: "${questionText.substring(0, 80)}..."\n\nIn production mode with the backend running, I would:\n• Analyze the question context\n• Provide detailed explanations\n• Offer hints without giving away the answer\n• Help you understand the underlying concepts\n\nConnect your backend server to get real AI assistance!`,

      `🎯 Question received!\n\nYou asked: "${prompt}"\n\n✨ Currently running in DEMO MODE\n\nWhen connected to your backend, this assistant will:\n✓ Understand your specific question\n✓ Provide contextual help\n✓ Explain concepts without giving direct answers\n✓ Support your learning process\n\nStart your backend server at http://localhost:3000 to enable full functionality!`
    ];

    // Return a random demo response
    const randomResponse = responses[Math.floor(Math.random() * responses.length)];

    return {
      success: true,
      message: randomResponse
    };
  }

  // Show status message
  showStatus(statusEl, message, type) {
    statusEl.textContent = message;
    statusEl.className = `quiz-assistant-status ${type}`;

    // Auto-clear after 5 seconds
    setTimeout(() => {
      statusEl.textContent = '';
      statusEl.className = 'quiz-assistant-status';
    }, 5000);
  }

  // Show response from backend
  showResponse(responseEl, message) {
    responseEl.innerHTML = `
      <div class="quiz-assistant-response-content">
        <strong>Response:</strong>
        <p>${this.escapeHtml(message)}</p>
      </div>
    `;
    responseEl.style.display = 'block';
  }

  // Escape HTML to prevent XSS
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Observe DOM changes for dynamically loaded questions
  observeQuizChanges() {
    const observer = new MutationObserver((mutations) => {
      let shouldRecheck = false;

      mutations.forEach((mutation) => {
        if (mutation.addedNodes.length > 0) {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === 1) { // Element node
              // Check if new question was added
              if (node.classList && (
                  node.classList.contains('question') ||
                  node.querySelector('.question') ||
                  node.getAttribute('role') === 'presentation'
              )) {
                shouldRecheck = true;
              }
            }
          });
        }
      });

      if (shouldRecheck) {
        // Debounce the detection
        clearTimeout(this.recheckTimeout);
        this.recheckTimeout = setTimeout(() => {
          this.detectAndInject();
        }, 500);
      }
    });

    // Start observing
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
}

// Initialize when script loads
const quizAssistant = new QuizQuestionAssistant();

// Check if we're on a Canvas page (or any page with quizzes)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    quizAssistant.init();
  });
} else {
  quizAssistant.init();
}

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.QuizQuestionAssistant = quizAssistant;
}
