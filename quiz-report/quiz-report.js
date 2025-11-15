// Quiz Report Generator for Professors
// This script injects a report generation interface on Canvas quiz statistics pages

class QuizReportGenerator {
  constructor() {
    this.assignmentId = null;
    this.reportContainer = null;
    this.chatHistory = [];
    this.reportData = null;
  }

  // Detect if we're on a Canvas quiz statistics page
  static isQuizStatisticsPage() {
    const url = window.location.href;
    const hostname = window.location.hostname;

    // Check if it's a Canvas domain
    const isCanvas = hostname.includes('instructure.com') || hostname.includes('canvas');

    if (!isCanvas) {
      return false;
    }

    // Check if it's a statistics page
    const isStatisticsPage = url.includes('/quizzes/') && url.includes('/statistics');

    return isStatisticsPage;
  }

  // Extract assignment ID from URL
  extractAssignmentId() {
    const url = window.location.href;
    const quizMatch = url.match(/\/quizzes\/(\d+)/);

    if (quizMatch) {
      return `quiz_${quizMatch[1]}`;
    }

    return null;
  }

  // Create the report UI HTML
  createReportUI() {
    const container = document.createElement('div');
    container.id = 'quiz-report-generator';
    container.className = 'quiz-report-container';

    container.innerHTML = `
      <div class="quiz-report-card">
        <div class="quiz-report-header">
          <h2>Quiz Analytics Report</h2>
          <button id="generateReportBtn" class="report-btn report-btn-primary">
            Generate Report
          </button>
        </div>

        <div id="reportLoadingState" class="report-loading" style="display: none;">
          <div class="loading-spinner"></div>
          <p>Generating report with AI...</p>
        </div>

        <div id="reportOverview" class="report-overview" style="display: none;">
          <h3>Report Overview</h3>
          <div id="reportContent" class="report-content"></div>
        </div>

        <div id="reportChatSection" class="report-chat-section" style="display: none;">
          <h3>Ask Questions About This Report</h3>
          <div id="chatMessages" class="chat-messages"></div>
          <div class="chat-input-container">
            <textarea
              id="chatInput"
              class="chat-input"
              placeholder="Ask a question about the report..."
              rows="2"
            ></textarea>
            <button id="sendChatBtn" class="report-btn report-btn-secondary">
              Send
            </button>
          </div>
        </div>
      </div>
    `;

    return container;
  }

  // Find insertion point on Canvas statistics page
  findInsertionPoint() {
    const selectors = [
      '.statistics-page',
      '#content',
      'main[role="main"]',
      '#main',
      '.quiz_statistics'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        console.log('Found insertion point:', selector);
        return element;
      }
    }

    return document.body;
  }

  // Inject the report UI
  inject() {
    if (this.reportContainer) {
      console.log('Report UI already injected');
      return;
    }

    this.assignmentId = this.extractAssignmentId();
    if (!this.assignmentId) {
      console.error('Could not extract assignment ID');
      return;
    }

    this.reportContainer = this.createReportUI();
    const insertionPoint = this.findInsertionPoint();

    if (insertionPoint === document.body) {
      document.body.insertBefore(this.reportContainer, document.body.firstChild);
    } else {
      insertionPoint.parentNode.insertBefore(this.reportContainer, insertionPoint);
    }

    this.attachEventListeners();
    console.log('Quiz report generator injected');
  }

  // Attach event listeners
  attachEventListeners() {
    const generateBtn = document.getElementById('generateReportBtn');
    const sendChatBtn = document.getElementById('sendChatBtn');
    const chatInput = document.getElementById('chatInput');

    if (generateBtn) {
      generateBtn.addEventListener('click', () => this.generateReport());
    }

    if (sendChatBtn) {
      sendChatBtn.addEventListener('click', () => this.sendChatMessage());
    }

    if (chatInput) {
      chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendChatMessage();
        }
      });
    }
  }

  // Generate report
  async generateReport() {
    const generateBtn = document.getElementById('generateReportBtn');
    const loadingState = document.getElementById('reportLoadingState');
    const overviewSection = document.getElementById('reportOverview');
    const chatSection = document.getElementById('reportChatSection');

    // Show loading state
    loadingState.style.display = 'block';
    overviewSection.style.display = 'none';
    chatSection.style.display = 'none';
    generateBtn.disabled = true;
    generateBtn.textContent = 'Generating...';

    try {
      // Send message to background script
      chrome.runtime.sendMessage({
        action: 'generateReport',
        assignment_id: this.assignmentId
      }, (response) => {
        loadingState.style.display = 'none';

        if (chrome.runtime.lastError) {
          console.error('Chrome runtime error:', chrome.runtime.lastError);
          this.showError('Error generating report. Please reload the extension.');
          generateBtn.disabled = false;
          generateBtn.textContent = 'Generate Report';
          return;
        }

        if (response && response.success) {
          this.reportData = response.data;
          this.displayReport(response.data);
          overviewSection.style.display = 'block';
          chatSection.style.display = 'block';
          generateBtn.textContent = 'Regenerate Report';
        } else {
          this.showError(response?.message || 'Failed to generate report');
          generateBtn.textContent = 'Generate Report';
        }

        generateBtn.disabled = false;
      });
    } catch (error) {
      console.error('Error generating report:', error);
      this.showError('An error occurred while generating the report');
      loadingState.style.display = 'none';
      generateBtn.disabled = false;
      generateBtn.textContent = 'Generate Report';
    }
  }

  // Display the report
  displayReport(data) {
    const reportContent = document.getElementById('reportContent');

    if (!reportContent) return;

    // Format the report data
    const reportText = data.report || data.overview || JSON.stringify(data, null, 2);

    // Convert to HTML with basic formatting
    const formattedReport = this.formatReportText(reportText);
    reportContent.innerHTML = formattedReport;
  }

  // Format report text to HTML
  formatReportText(text) {
    // Split by newlines and create paragraphs
    const lines = text.split('\n');
    let html = '';

    for (const line of lines) {
      if (line.trim() === '') {
        continue;
      }

      // Check if line is a heading (starts with # or is all caps)
      if (line.startsWith('#')) {
        const level = line.match(/^#+/)[0].length;
        const text = line.replace(/^#+\s*/, '');
        html += `<h${Math.min(level + 2, 6)}>${text}</h${Math.min(level + 2, 6)}>`;
      } else if (line.trim().match(/^[A-Z\s]+:/) && line.length < 100) {
        html += `<h4>${line.trim()}</h4>`;
      } else if (line.trim().startsWith('-') || line.trim().startsWith('•')) {
        html += `<li>${line.trim().substring(1).trim()}</li>`;
      } else {
        html += `<p>${line}</p>`;
      }
    }

    return html;
  }

  // Send chat message
  async sendChatMessage() {
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendChatBtn');
    const message = chatInput.value.trim();

    if (!message) {
      return;
    }

    // Add user message to chat
    this.addChatMessage('user', message);
    chatInput.value = '';
    sendBtn.disabled = true;
    sendBtn.textContent = 'Sending...';

    try {
      // Send message to background script
      chrome.runtime.sendMessage({
        action: 'chatReport',
        assignment_id: this.assignmentId,
        message: message,
        chat_history: this.chatHistory
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Chrome runtime error:', chrome.runtime.lastError);
          this.addChatMessage('error', 'Error sending message. Please try again.');
          sendBtn.disabled = false;
          sendBtn.textContent = 'Send';
          return;
        }

        if (response && response.success) {
          const aiMessage = response.data.response || response.data.message || 'No response';
          this.addChatMessage('ai', aiMessage);

          // Update chat history
          this.chatHistory.push({ role: 'user', content: message });
          this.chatHistory.push({ role: 'assistant', content: aiMessage });
        } else {
          this.addChatMessage('error', response?.message || 'Failed to get response');
        }

        sendBtn.disabled = false;
        sendBtn.textContent = 'Send';
      });
    } catch (error) {
      console.error('Error sending chat message:', error);
      this.addChatMessage('error', 'An error occurred while sending your message');
      sendBtn.disabled = false;
      sendBtn.textContent = 'Send';
    }
  }

  // Add message to chat
  addChatMessage(type, text) {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message chat-message-${type}`;

    const label = type === 'user' ? 'You' : type === 'ai' ? 'AI Assistant' : 'Error';

    messageDiv.innerHTML = `
      <div class="chat-message-label">${label}</div>
      <div class="chat-message-content">${this.escapeHtml(text)}</div>
    `;

    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  // Escape HTML to prevent XSS
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML.replace(/\n/g, '<br>');
  }

  // Show error message
  showError(message) {
    const reportContent = document.getElementById('reportContent');
    if (reportContent) {
      reportContent.innerHTML = `<div class="error-message">${message}</div>`;
      document.getElementById('reportOverview').style.display = 'block';
    }
  }

  // Remove the report UI
  remove() {
    if (this.reportContainer) {
      this.reportContainer.remove();
      this.reportContainer = null;
    }
  }
}

// Auto-inject on quiz statistics pages
if (QuizReportGenerator.isQuizStatisticsPage()) {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      const reportGenerator = new QuizReportGenerator();
      reportGenerator.inject();
    });
  } else {
    const reportGenerator = new QuizReportGenerator();
    reportGenerator.inject();
  }
}

// Export for use in content script
if (typeof window !== 'undefined') {
  window.QuizReportGenerator = QuizReportGenerator;
}
