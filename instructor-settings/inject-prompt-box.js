// Injectable Prompt Box for Instructors
// This script creates a prompt box that can be injected into Canvas quiz pages

class InstructorPromptBox {
  constructor(mode = 'inline') {
    this.isVisible = false;
    this.container = null;
    this.mode = mode; // 'inline' for Canvas integration, 'floating' for other pages
    this.config = {
      backendUrl: 'http://localhost:3000',
      endpoint: '/api/quiz/process-prompt'
    };
  }

  // Detect if we're on a Canvas quiz/assignment CREATION page (not preview or question editing)
  static isCanvasQuizPage() {
    const url = window.location.href;
    const hostname = window.location.hostname;

    // Check if it's an Instructure Canvas domain
    const isCanvas = hostname.includes('instructure.com') || hostname.includes('canvas');

    if (!isCanvas) {
      return false;
    }

    // ONLY show on quiz/assignment creation pages, NOT on:
    // - Preview pages (/quizzes/{id}/take, /quizzes/{id}/preview)
    // - Question editing pages (/quizzes/{id}/questions)
    // - Statistics or other sub-pages

    // Exclude preview, take, questions, statistics, and history pages
    if (url.includes('/take') ||
        url.includes('/preview') ||
        url.includes('/questions') ||
        url.includes('/statistics') ||
        url.includes('/history') ||
        url.includes('/moderate')) {
      return false;
    }

    // Only include new quiz/assignment creation or main edit pages
    // Match /quizzes/123/edit (with optional query params or hash, but not /edit/something)
    const isQuizEdit = url.match(/\/quizzes\/\d+\/edit(\?|#|\/?\s*$)/);
    const isAssignmentEdit = url.match(/\/assignments\/\d+\/edit(\?|#|\/?\s*$)/);
    const isNew = url.includes('/quizzes/new') || url.includes('/assignments/new');

    return isNew || isQuizEdit || isAssignmentEdit;
  }

  // Create the HTML structure for the prompt box
  createPromptBox() {
    const container = document.createElement('div');
    container.id = 'instructor-prompt-box';

    if (this.mode === 'inline') {
      container.className = 'instructor-prompt-container-inline';
      container.innerHTML = `
        <div class="instructor-prompt-inline-card">
          <div class="instructor-prompt-header-inline">
            <h3>🤖 AI Quiz Assistant - Enter Your Prompt</h3>
            <button class="instructor-prompt-minimize" id="minimizePromptBox" title="Minimize">−</button>
          </div>

          <div class="instructor-prompt-content-inline">
            <div class="instructor-form-group">
              <label for="instructorCustomPrompt">
                <strong>Describe what you want to generate:</strong>
                <span class="instructor-hint">Example: "Create 5 multiple choice questions about photosynthesis for high school biology"</span>
              </label>
              <textarea
                id="instructorCustomPrompt"
                class="instructor-prompt-textarea"
                placeholder="Type your prompt here to generate quiz content with AI..."
                rows="4"
              ></textarea>
              <span class="instructor-char-count" id="instructorCharCount">0 characters</span>
            </div>

            <button id="instructorSendPrompt" class="instructor-btn instructor-btn-primary">
              ✨ Generate with AI
            </button>

            <div id="instructorLlmResponse" class="instructor-llm-response"></div>
          </div>
        </div>
      `;
    } else {
      // Floating mode for non-Canvas pages
      container.className = 'instructor-prompt-container';
      container.innerHTML = `
        <div class="instructor-prompt-header">
          <h3>Instructor LLM Prompt</h3>
          <button class="instructor-prompt-close" id="closePromptBox">×</button>
        </div>

        <div class="instructor-prompt-content">
          <div class="instructor-form-group">
            <label for="instructorCustomPrompt">Enter your prompt:</label>
            <textarea
              id="instructorCustomPrompt"
              class="instructor-prompt-textarea"
              placeholder="Type your prompt for the backend LLM..."
              rows="6"
            ></textarea>
            <span class="instructor-char-count" id="instructorCharCount">0 characters</span>
          </div>

          <button id="instructorSendPrompt" class="instructor-btn instructor-btn-primary">
            Send to Backend LLM
          </button>

          <div id="instructorLlmResponse" class="instructor-llm-response"></div>
        </div>

        <div class="instructor-prompt-toggle" id="togglePromptBox">
          <span>📝</span>
        </div>
      `;
    }

    return container;
  }

  // Find the best insertion point on Canvas quiz page
  findCanvasInsertionPoint() {
    // Try to find Canvas-specific elements to inject before
    const selectors = [
      '.quiz-header',
      '#quiz_title',
      '.quiz_questions_wrapper',
      '.quiz_questions',
      'form[action*="quiz"]',
      '.assignment_content',
      '#quiz_options_form',
      '.quiz_details',
      '.quiz_content',
      'main[role="main"]',
      '#main',
      '#content',
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        console.log('Found Canvas insertion point:', selector);
        return element;
      }
    }

    // Fallback to body if no specific element found
    return document.body;
  }

  // Inject the prompt box into the page
  inject() {
    if (this.container) {
      console.log('Prompt box already injected');
      return;
    }

    this.container = this.createPromptBox();

    if (this.mode === 'inline') {
      // For Canvas pages, inject at the top of the content area
      const insertionPoint = this.findCanvasInsertionPoint();
      if (insertionPoint && insertionPoint !== document.body) {
        insertionPoint.parentNode.insertBefore(this.container, insertionPoint);
      } else {
        // Fallback: prepend to body
        document.body.insertBefore(this.container, document.body.firstChild);
      }
      this.isVisible = true; // Always visible in inline mode
    } else {
      // For floating mode, append to body
      document.body.appendChild(this.container);
    }

    this.attachEventListeners();
    console.log(`Instructor prompt box injected (${this.mode} mode)`);
  }

  // Attach event listeners
  attachEventListeners() {
    const toggleBtn = document.getElementById('togglePromptBox');
    const closeBtn = document.getElementById('closePromptBox');
    const minimizeBtn = document.getElementById('minimizePromptBox');
    const sendBtn = document.getElementById('instructorSendPrompt');
    const textarea = document.getElementById('instructorCustomPrompt');
    const charCount = document.getElementById('instructorCharCount');

    // Toggle visibility (floating mode)
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => this.toggle());
    }

    // Close button (floating mode)
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hide());
    }

    // Minimize button (inline mode)
    if (minimizeBtn) {
      minimizeBtn.addEventListener('click', () => this.toggleMinimize());
    }

    // Send prompt button
    if (sendBtn) {
      sendBtn.addEventListener('click', () => this.sendPrompt());
    }

    // Character counter
    if (textarea) {
      textarea.addEventListener('input', () => {
        charCount.textContent = `${textarea.value.length} characters`;
      });
    }

    // Drag functionality only for floating mode
    if (this.mode === 'floating') {
      this.makeDraggable();
    }
  }

  // Make the prompt box draggable
  makeDraggable() {
    const container = this.container;
    const header = container.querySelector('.instructor-prompt-header');

    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;

    header.addEventListener('mousedown', (e) => {
      isDragging = true;
      initialX = e.clientX - container.offsetLeft;
      initialY = e.clientY - container.offsetTop;
    });

    document.addEventListener('mousemove', (e) => {
      if (isDragging) {
        e.preventDefault();
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;

        container.style.left = currentX + 'px';
        container.style.top = currentY + 'px';
        container.style.right = 'auto';
        container.style.bottom = 'auto';
      }
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
    });
  }

  // Toggle visibility (for floating mode)
  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  // Show the prompt box
  show() {
    if (this.container) {
      this.container.classList.add('visible');
      this.isVisible = true;
    }
  }

  // Hide the prompt box
  hide() {
    if (this.container) {
      this.container.classList.remove('visible');
      this.isVisible = false;
    }
  }

  // Toggle minimize state (for inline mode)
  toggleMinimize() {
    if (this.container) {
      const contentDiv = this.container.querySelector('.instructor-prompt-content-inline');
      const minimizeBtn = document.getElementById('minimizePromptBox');

      if (this.container.classList.contains('minimized')) {
        this.container.classList.remove('minimized');
        if (contentDiv) contentDiv.style.display = 'block';
        if (minimizeBtn) minimizeBtn.textContent = '−';
      } else {
        this.container.classList.add('minimized');
        if (contentDiv) contentDiv.style.display = 'none';
        if (minimizeBtn) minimizeBtn.textContent = '+';
      }
    }
  }

  // Send prompt to backend
  async sendPrompt() {
    const textarea = document.getElementById('instructorCustomPrompt');
    const sendBtn = document.getElementById('instructorSendPrompt');
    const responseDiv = document.getElementById('instructorLlmResponse');

    const prompt = textarea.value.trim();

    if (!prompt) {
      this.showResponse('Please enter a prompt to send.', 'error');
      return;
    }

    // Show loading state
    this.showResponse('Sending prompt to backend LLM...', 'loading');
    sendBtn.disabled = true;
    sendBtn.textContent = 'Sending...';

    try {
      const response = await fetch(`${this.config.backendUrl}${this.config.endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: prompt,
          timestamp: new Date().toISOString(),
          pageUrl: window.location.href,
          pageTitle: document.title
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Display the response
      const responseText = data.response || JSON.stringify(data, null, 2);
      this.showResponse(`Backend Response:\n\n${responseText}`, 'success');

      console.log('Backend response:', data);
    } catch (error) {
      console.error('Error sending prompt to backend:', error);
      this.showResponse(
        `Error: ${error.message}\n\nMake sure the backend server is running at ${this.config.backendUrl}`,
        'error'
      );
    } finally {
      sendBtn.disabled = false;
      sendBtn.textContent = 'Send to Backend LLM';
    }
  }

  // Show response in the UI
  showResponse(message, type) {
    const responseDiv = document.getElementById('instructorLlmResponse');
    if (responseDiv) {
      responseDiv.textContent = message;
      responseDiv.className = `instructor-llm-response ${type}`;
    }
  }

  // Remove the prompt box from the page
  remove() {
    if (this.container) {
      this.container.remove();
      this.container = null;
      this.isVisible = false;
    }
  }
}

// Export for use in content script
if (typeof window !== 'undefined') {
  window.InstructorPromptBox = InstructorPromptBox;
}
