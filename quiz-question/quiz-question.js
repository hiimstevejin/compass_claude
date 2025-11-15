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
    const assignmentMatch =
      window.location.pathname.match(/\/assignments\/(\d+)/);
    if (assignmentMatch) {
      return `assignment_${assignmentMatch[1]}`;
    }

    // Try to find from page data attributes
    const quizContainer = document.querySelector("[data-quiz-id]");
    if (quizContainer) {
      return `quiz_${quizContainer.getAttribute("data-quiz-id")}`;
    }

    // Fallback: generate from URL path
    const pathParts = window.location.pathname.split("/").filter((p) => p);
    if (pathParts.length > 0) {
      return pathParts[pathParts.length - 1] || "unknown_quiz";
    }

    return "unknown_quiz";
  }

  // Initialize the assistant
  init() {
    if (this.initialized) return;

    console.log("Quiz Question Assistant initialized");
    this.initialized = true;

    // Wait for DOM to be ready
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () =>
        this.detectAndInject(),
      );
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
      ".question",
      '[class*="question"]',
      ".quiz_question",
      '[data-automation="sdk-overlay"]', // From user's example
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
    const possibleQuestions = document.querySelectorAll(
      '[role="presentation"]',
    );

    possibleQuestions.forEach((el) => {
      // Check if this looks like a question container
      if (
        el.querySelector(".question_text") ||
        el.querySelector('[class*="question"]') ||
        el.textContent.length > 20
      ) {
        // Has substantial text content
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
    if (questionEl.querySelector(".quiz-assistant-container")) {
      return;
    }

    // Extract question text
    const questionText = this.extractQuestionText(questionEl);
    const questionId = this.generateQuestionId(questionEl, questionIndex);

    // Store question info
    this.questions.set(questionId, {
      element: questionEl,
      text: questionText,
      index: questionIndex,
    });

    // Create UI container
    const container = document.createElement("div");
    container.className = "quiz-assistant-container";
    container.setAttribute("data-question-id", questionId);

    // Create UI elements
    container.innerHTML = `
      <div class="quiz-assistant-header">
        <span class="quiz-assistant-icon">💡</span>
        <span class="quiz-assistant-title">Ask a question about this problem</span>
        <button type="button" class="quiz-assistant-toggle" title="Toggle assistant">▼</button>
      </div>
      <div class="quiz-assistant-content">
        <div class="quiz-assistant-response"></div>
        <textarea
          class="quiz-assistant-textarea"
          placeholder="Type your question here... (e.g., 'Can you explain what this question is asking?')"
          rows="3"
        ></textarea>
        <div class="quiz-assistant-actions">
          <button type="button" class="quiz-assistant-submit">Send Question</button>
          <span class="quiz-assistant-status"></span>
        </div>
      </div>
    `;

    // Add event listeners
    this.attachEventListeners(container, questionId);

    // Try to inject next to question
    const injected = this.injectNextToQuestion(questionEl, container);

    if (!injected) {
      console.warn(
        "Could not inject UI next to question, considering fallback",
      );
    }
  }

  // Extract question text from question element
  extractQuestionText(questionEl) {
    // Try different selectors to find question text
    const textSelectors = [
      ".question_text",
      '[class*="question_text"]',
      ".question-text",
      '[class*="questionText"]',
      "p",
      "div",
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
    const canvasId =
      questionEl.getAttribute("id") ||
      questionEl.getAttribute("data-question-id") ||
      questionEl.getAttribute("data-id");

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
      const questionText = questionEl.querySelector(
        '.question_text, [class*="question_text"]',
      );
      if (questionText) {
        questionText.parentNode.insertBefore(
          container,
          questionText.nextSibling,
        );
        return true;
      }

      // Option 2: At the end of question container
      if (
        questionEl.classList.contains("question") ||
        questionEl.querySelector(".question")
      ) {
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
      console.error("Error injecting UI:", error);
      return false;
    }
  }

  // Attach event listeners to UI elements
  attachEventListeners(container, questionId) {
    const textarea = container.querySelector(".quiz-assistant-textarea");
    const submitBtn = container.querySelector(".quiz-assistant-submit");
    const toggleBtn = container.querySelector(".quiz-assistant-toggle");
    const content = container.querySelector(".quiz-assistant-content");
    const statusEl = container.querySelector(".quiz-assistant-status");
    const responseEl = container.querySelector(".quiz-assistant-response");

    // Toggle button
    toggleBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const isExpanded = content.style.display !== "none";
      content.style.display = isExpanded ? "none" : "block";
      toggleBtn.textContent = isExpanded ? "▶" : "▼";
    });

    // Submit button
    submitBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();

      const prompt = textarea.value.trim();

      if (!prompt) {
        this.showStatus(statusEl, "Please enter a question", "error");
        return;
      }

      // Get question info
      const questionInfo = this.questions.get(questionId);
      if (!questionInfo) {
        this.showStatus(statusEl, "Question not found", "error");
        return;
      }

      // Show loading state
      submitBtn.disabled = true;
      submitBtn.textContent = "Sending...";
      this.showStatus(statusEl, "Processing...", "loading");
      responseEl.textContent = "";

      // Send to background script
      try {
        const response = await this.sendQuestionToBackend(
          questionId,
          questionInfo.text,
          prompt,
          this.assignmentId,
        );

        if (response.success) {
          this.showStatus(statusEl, "Response received!", "success");
          // Pass the full response data (which contains {response, questionId, sessionId, timestamp})
          this.showResponse(responseEl, response.data || response.message);
          // Don't clear textarea - let user see their question
        } else {
          this.showStatus(
            statusEl,
            response.message || "Error occurred",
            "error",
          );
        }
      } catch (error) {
        console.error("Error sending question:", error);
        this.showStatus(statusEl, "Failed to send question", "error");
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Send Question";
      }
    });

    // Allow Enter key to submit (with Shift+Enter for newlines)
    textarea.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        submitBtn.click();
      }
    });
  }

  // Send question to backend via background script
  async sendQuestionToBackend(questionId, questionText, prompt, assignmentId) {
    // Log the data being sent
    console.log("📤 QUIZ ASSISTANT - Sending to background script:", {
      action: "processQuizPrompt",
      questionId: questionId,
      questionText: questionText,
      prompt: prompt,
      assignmentId: assignmentId,
      settings: {},
    });

    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          action: "processQuizPrompt",
          questionId: questionId,
          questionText: questionText,
          prompt: prompt,
          assignmentId: assignmentId,
          settings: {}, // Can add settings later if needed
        },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            // Check if backend failed - if so, use demo mode
            if (
              !response.success &&
              response.message &&
              response.message.includes("Failed to connect to backend")
            ) {
              console.log("Backend unavailable, using DEMO MODE");
              resolve(this.getDemoResponse(questionText, prompt));
            } else {
              resolve(response);
            }
          }
        },
      );
    });
  }

  // Demo mode response when backend is unavailable
  getDemoResponse(questionText, prompt) {
    // Simulate backend response format with various response types
    const responses = [
      // Short response
      {
        response: `Great question! Let me help you understand this concept better.\n\nYou asked: "${prompt}"\n\nThis question is asking you to identify the correct approach. Here are some hints:\n\n1. Consider the fundamental principles involved\n2. Think about edge cases\n3. Review the constraints mentioned in the question\n\n✨ DEMO MODE: This is a simulated response. Connect your backend at http://localhost:3000 for real AI assistance!`,
        questionId: "demo-q1",
        sessionId: "demo_session_" + Date.now(),
        timestamp: new Date().toISOString(),
      },

      // Medium response - tests scrolling
      {
        response: `📚 Understanding Your Question\n\nYou asked: "${prompt}"\n\nLet me break this down for you:\n\n**Key Concepts:**\n- The question is testing your understanding of fundamental principles\n- Pay attention to the specific wording used\n- Consider both theoretical and practical aspects\n\n**Approach:**\n1. First, identify what the question is really asking\n2. Review the core concepts related to this topic\n3. Eliminate obviously incorrect options\n4. Consider edge cases and special scenarios\n5. Apply logical reasoning to narrow down your choices\n\n**Hints (without giving the answer):**\n• Think about the efficiency and performance implications\n• Consider the trade-offs between different approaches\n• Remember the fundamental principles you learned\n• Test your reasoning with simple examples\n\n**Common Mistakes to Avoid:**\n- Don't rush to an answer without reading carefully\n- Watch out for trick wording in the options\n- Make sure you understand what's being asked\n\n✨ DEMO MODE: Connect your backend server for personalized AI tutoring!`,
        questionId: "demo-q2",
        sessionId: "demo_session_" + Date.now(),
        timestamp: new Date().toISOString(),
      },

      // Long response - really tests scrolling
      {
        response: `🎯 Comprehensive Analysis\n\nYou asked: "${prompt}"\n\nLet me provide a detailed explanation to help you understand this question:\n\n**Question Analysis:**\nThe question "${questionText.substring(0, 80)}..." is designed to test your understanding of key concepts in this subject area. It requires you to apply both theoretical knowledge and practical reasoning.\n\n**Background Context:**\nBefore approaching this question, it's important to understand the fundamental principles at play. This topic builds on several key concepts:\n\n1. **Foundation Principles:**\n   - Core theory and definitions\n   - Historical context and development\n   - Why this concept matters in practice\n   - Common applications and use cases\n\n2. **Technical Details:**\n   - How the mechanism works\n   - Step-by-step process breakdown\n   - Important parameters and variables\n   - Relationships between components\n\n3. **Practical Considerations:**\n   - Real-world applications\n   - Performance implications\n   - Trade-offs and limitations\n   - Best practices and patterns\n\n**Problem-Solving Strategy:**\n\nStep 1: Read Carefully\n- Identify key terms and phrases\n- Note any constraints or conditions\n- Understand what's being asked vs. what's given\n\nStep 2: Analyze Options\n- Examine each choice systematically\n- Look for obvious errors or impossibilities\n- Consider partial correctness\n\nStep 3: Apply Logic\n- Use elimination strategy\n- Test with simple examples\n- Verify your reasoning\n\nStep 4: Double-Check\n- Re-read the question\n- Confirm your understanding\n- Make sure you answered what was asked\n\n**Learning Approach:**\nInstead of just finding the answer, try to understand WHY it's correct. This will help you with similar questions in the future. Consider:\n\n• What principle is being tested?\n• How does this relate to other concepts?\n• Where might this apply in real scenarios?\n• What variations of this question might exist?\n\n**Additional Resources:**\n- Review your course materials on this topic\n- Practice similar problems\n- Discuss with classmates or teaching assistants\n- Draw diagrams if it helps visualize\n\n**Remember:**\nThe goal isn't just to get the right answer, but to develop a deep understanding that will serve you in future challenges.\n\n✨ DEMO MODE ACTIVE: This is a simulated AI response. When you connect your backend server at http://localhost:3000, you'll receive personalized, context-aware assistance powered by real AI. The production system will:\n\n✓ Analyze your specific question in detail\n✓ Provide targeted hints based on your needs\n✓ Remember context from previous questions\n✓ Adapt explanations to your learning style\n✓ Help you learn without giving direct answers\n✓ Track your progress over time\n\nStart your backend server to unlock the full AI tutoring experience!`,
        questionId: "demo-q3",
        sessionId: "demo_session_" + Date.now(),
        timestamp: new Date().toISOString(),
      },
    ];

    // Return a random demo response in backend format
    const randomResponse =
      responses[Math.floor(Math.random() * responses.length)];

    return {
      success: true,
      data: randomResponse, // Return in same format as backend
    };
  }

  // Show status message
  showStatus(statusEl, message, type) {
    statusEl.textContent = message;
    statusEl.className = `quiz-assistant-status ${type}`;

    // Auto-clear after 5 seconds
    setTimeout(() => {
      statusEl.textContent = "";
      statusEl.className = "quiz-assistant-status";
    }, 5000);
  }

  // Show response from backend
  showResponse(responseEl, data) {
    // Extract the response text from the backend data
    let responseText = "";

    if (typeof data === "string") {
      responseText = data;
    } else if (data && data.response) {
      // Backend returns {response: "...", questionId: "...", sessionId: "...", timestamp: "..."}
      responseText = data.response;
    } else if (data && data.message) {
      responseText = data.message;
    } else {
      responseText = JSON.stringify(data);
    }

    responseEl.innerHTML = `
      <div class="quiz-assistant-response-content">
        <div class="quiz-assistant-response-header">
          <strong>Response:</strong>
          <button type="button" class="quiz-assistant-response-close" title="Clear response">✕</button>
        </div>
        <div class="quiz-assistant-response-text">${this.escapeHtml(responseText)}</div>
      </div>
    `;
    responseEl.style.display = "block";

    // Add close button functionality
    const closeBtn = responseEl.querySelector(".quiz-assistant-response-close");
    closeBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      responseEl.style.display = "none";
      responseEl.innerHTML = "";
    });
  }

  // Escape HTML to prevent XSS
  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  // Observe DOM changes for dynamically loaded questions
  observeQuizChanges() {
    const observer = new MutationObserver((mutations) => {
      let shouldRecheck = false;

      mutations.forEach((mutation) => {
        if (mutation.addedNodes.length > 0) {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1) {
              // Element node
              // Check if new question was added
              if (
                node.classList &&
                (node.classList.contains("question") ||
                  node.querySelector(".question") ||
                  node.getAttribute("role") === "presentation")
              ) {
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
      subtree: true,
    });
  }
}

// Initialize when script loads
const quizAssistant = new QuizQuestionAssistant();

// Check if we're on a Canvas page (or any page with quizzes)
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    quizAssistant.init();
  });
} else {
  quizAssistant.init();
}

// Export for use in other scripts
if (typeof window !== "undefined") {
  window.QuizQuestionAssistant = quizAssistant;
}
