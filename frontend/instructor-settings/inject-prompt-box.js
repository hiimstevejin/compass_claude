// Injectable Prompt Box for Instructors
// This script creates a prompt box that can be injected into Canvas quiz pages

class InstructorPromptBox {
  constructor(mode = 'inline') {
    this.isVisible = false;
    this.container = null;
    this.mode = mode; // 'inline' for Canvas integration, 'floating' for other pages
    this.config = {
      backendUrl: 'http://localhost:5000',
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
            <h3>AI Assistant</h3>
            <button class="instructor-prompt-minimize" id="minimizePromptBox" title="Minimize">−</button>
          </div>

          <div class="instructor-prompt-content-inline">
            <div class="instructor-form-group">
              <label for="instructorAiRole">
                <strong>AI Role:</strong>
                <span class="instructor-hint">Example: AI acts as the CFO of Anthropic for student consulting project</span>
              </label>
              <textarea
                id="instructorAiRole"
                class="instructor-prompt-textarea"
                placeholder="Teaching Assistant that guides students without telling them the answer."
                rows="2"
              >Teaching Assistant that guides students without telling them the answer.</textarea>
            </div>

            <div class="instructor-form-group">
              <label for="instructorBoundary">
                <strong>Boundaries - What AI Can Tell Students:</strong>
                <span class="instructor-hint">Define what information the AI is allowed to share with students</span>
              </label>
              <textarea
                id="instructorBoundary"
                class="instructor-prompt-textarea"
                placeholder="Example: 'Students can ask about concepts and definitions, but cannot get direct answers to exam questions or step-by-step solutions.'"
                rows="3"
              ></textarea>
            </div>

            <div class="instructor-form-group">
              <label for="instructorCustomPrompt">
                <strong>Additional Instructions (Optional):</strong>
                <span class="instructor-hint">Any other specific instructions for the AI</span>
              </label>
              <textarea
                id="instructorCustomPrompt"
                class="instructor-prompt-textarea"
                placeholder="Type any additional instructions here..."
                rows="3"
              ></textarea>
            </div>

            <button id="instructorSendPrompt" class="instructor-btn instructor-btn-primary">
              Save Setting
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
          <span>AI</span>
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

  // Extract assignment ID from URL
  extractAssignmentId() {
    const url = window.location.href;

    // Try to extract quiz ID
    const quizMatch = url.match(/\/quizzes\/(\d+|new)/);
    if (quizMatch) {
      return quizMatch[1] === 'new' ? `quiz_new_${Date.now()}` : `quiz_${quizMatch[1]}`;
    }

    // Try to extract assignment ID
    const assignmentMatch = url.match(/\/assignments\/(\d+|new)/);
    if (assignmentMatch) {
      return assignmentMatch[1] === 'new' ? `assignment_new_${Date.now()}` : `assignment_${assignmentMatch[1]}`;
    }

    // Fallback to page title
    return `assignment_${document.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`;
  }

  // Extract metadata from Canvas page
  extractMetadata() {
    const metadata = {
      pageUrl: window.location.href,
      pageTitle: document.title,
      timestamp: new Date().toISOString()
    };

    // Try to extract course name
    const courseElement = document.querySelector('.course-title, [data-testid="course-name"], .title');
    if (courseElement) {
      metadata.course = courseElement.textContent.trim();
    }

    // Try to extract professor/user name
    const userElement = document.querySelector('.user_name, [data-testid="user-name"], .profile-link');
    if (userElement) {
      metadata.professor = userElement.textContent.trim();
    }

    // Try to extract quiz/assignment title
    const titleElement = document.querySelector('#quiz_title, [name="assignment[name]"], .quiz-header h1, .title');
    if (titleElement) {
      metadata.exam_title = titleElement.value || titleElement.textContent.trim();
    }

    // Try to extract quiz/assignment content
    const contentElement = document.querySelector('#quiz_description, [name="assignment[description]"], .quiz_content');
    if (contentElement) {
      metadata.exam_content = contentElement.value || contentElement.textContent.trim();
    }

    return metadata;
  }

  // Send prompt to backend via background script
  // Send prompt to backend via background script
  async sendPrompt() {
    const textarea = document.getElementById('instructorCustomPrompt');
    const roleTextarea = document.getElementById('instructorAiRole');
    const boundaryTextarea = document.getElementById('instructorBoundary');
    const sendBtn = document.getElementById('instructorSendPrompt');
    const responseDiv = document.getElementById('instructorLlmResponse');

    const additionalInstructions = textarea ? textarea.value.trim() : '';
    const aiRole = roleTextarea ? roleTextarea.value.trim() : 'Teaching Assistant that guides students without telling them the answer.';
    const boundary = boundaryTextarea ? boundaryTextarea.value.trim() : '';

    // Validate required fields
    if (!aiRole) {
      this.showResponse('Please specify the AI role.', 'error');
      return;
    }

    if (!boundary) {
      this.showResponse('Please specify the boundaries for what AI can tell students.', 'error');
      return;
    }

    // Show loading state
    this.showResponse('Sending prompt to backend...', 'loading');
    sendBtn.disabled = true;
    sendBtn.textContent = 'Sending...';

    try {
      // Extract assignment information
      const assignment_id = this.extractAssignmentId();
      const metadata = this.extractMetadata();

      // Add AI role and boundary to metadata
      metadata.ai_role = aiRole;
      metadata.boundary = boundary;

      // Construct comprehensive professor instructions
      let professorInstructions = `AI Role: ${aiRole}\n\nBoundaries: ${boundary}`;
      if (additionalInstructions) {
        professorInstructions += `\n\nAdditional Instructions: ${additionalInstructions}`;
      }

      // Send message to background script
      chrome.runtime.sendMessage({
        action: 'createPrompt',
        assignment_id: assignment_id,
        professor_instructions: professorInstructions,
        metadata: metadata
      }, (response) => {
        // IGNORE ACTUAL RESPONSE/ERRORS
        // Simulate success after 3 seconds
        setTimeout(() => {
            const responseText = `Prompt Created Successfully!\n\nAssignment ID: ${assignment_id}\nStatus: Simulated Success`;
            this.showResponse(responseText, 'success');
            console.log('Simulated success for assignment:', assignment_id);

            sendBtn.disabled = false;
            sendBtn.textContent = 'Save Setting';
        }, 1);
      });

    } catch (error) {
      console.error('Error sending prompt:', error);
      // Even if the catch block triggers, we might want to simulate success based on your request,
      // but usually catch implies the message failed to send entirely. 
      // Since you asked to "return success after 3 seconds" specifically regarding the API call check:
      setTimeout(() => {
          const responseText = `Prompt Created Successfully!\n\nStatus: Simulated Success (Recovered from Error)`;
          this.showResponse(responseText, 'success');
          sendBtn.disabled = false;
          sendBtn.textContent = 'Save Setting';
      }, 3000);
    }
  }

  // async sendPrompt() {
  //   const textarea = document.getElementById('instructorCustomPrompt');
  //   const roleTextarea = document.getElementById('instructorAiRole');
  //   const boundaryTextarea = document.getElementById('instructorBoundary');
  //   const sendBtn = document.getElementById('instructorSendPrompt');
  //   const responseDiv = document.getElementById('instructorLlmResponse');

  //   const additionalInstructions = textarea ? textarea.value.trim() : '';
  //   const aiRole = roleTextarea ? roleTextarea.value.trim() : 'Teaching Assistant that guides students without telling them the answer.';
  //   const boundary = boundaryTextarea ? boundaryTextarea.value.trim() : '';

  //   // Validate required fields
  //   if (!aiRole) {
  //     this.showResponse('Please specify the AI role.', 'error');
  //     return;
  //   }

  //   if (!boundary) {
  //     this.showResponse('Please specify the boundaries for what AI can tell students.', 'error');
  //     return;
  //   }

  //   // Show loading state
  //   this.showResponse('Sending prompt to backend...', 'loading');
  //   sendBtn.disabled = true;
  //   sendBtn.textContent = 'Sending...';

  //   try {
  //     // Extract assignment information
  //     const assignment_id = this.extractAssignmentId();
  //     const metadata = this.extractMetadata();

  //     // Add AI role and boundary to metadata
  //     metadata.ai_role = aiRole;
  //     metadata.boundary = boundary;

  //     // Construct comprehensive professor instructions
  //     let professorInstructions = `AI Role: ${aiRole}\n\nBoundaries: ${boundary}`;
  //     if (additionalInstructions) {
  //       professorInstructions += `\n\nAdditional Instructions: ${additionalInstructions}`;
  //     }

  //     // Send message to background script
  //     chrome.runtime.sendMessage({
  //       action: 'createPrompt',
  //       assignment_id: assignment_id,
  //       professor_instructions: professorInstructions,
  //       metadata: metadata
  //     }, (response) => {
  //       if (chrome.runtime.lastError) {
  //         console.error('Chrome runtime error:', chrome.runtime.lastError);
  //         this.showResponse(
  //           `Error: ${chrome.runtime.lastError.message}\n\nPlease reload the extension.`,
  //           'error'
  //         );
  //         sendBtn.disabled = false;
  //         sendBtn.textContent = 'Save Setting';
  //         return;
  //       }

  //       if (response && response.success) {
  //         const data = response.data;
  //         const responseText = `Prompt Created Successfully!\n\nAssignment ID: ${data.assignment_id}\nStatus: ${data.status}\n\nPreview: ${data.prompt_preview || 'No preview available'}`;
  //         this.showResponse(responseText, 'success');
  //         console.log('Prompt created:', data);
  //       } else {
  //         this.showResponse(
  //           `Error: ${response?.message || 'Unknown error occurred'}\n\nMake sure the backend server is running.`,
  //           'error'
  //         );
  //       }

  //       sendBtn.disabled = false;
  //       sendBtn.textContent = 'Save Setting';
  //     });

  //   } catch (error) {
  //     console.error('Error sending prompt:', error);
  //     this.showResponse(
  //       `Error: ${error.message}\n\nPlease try again.`,
  //       'error'
  //     );
  //     sendBtn.disabled = false;
  //     sendBtn.textContent = 'Save Setting';
  //   }
  // }

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
