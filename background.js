// Background service worker for Chrome Extension

// Configuration (inlined to avoid importScripts issues)
const CONFIG = {
  BACKEND_URL: "http://localhost:5000",
  ENDPOINTS: {
    PROCESS_PROMPT: "/api/quiz/process-prompt",
    EVALUATE_ANSWER: "/api/quiz/evaluate-answer",
    GET_QUESTIONS: "/api/quiz/questions",
    SUBMIT_ANSWER: "/api/quiz/submit-answer",
    CREATE_PROMPT: "/api/prompts",
    GENERATE_REPORT: "/api/reports/generate",
    CHAT_REPORT: "/api/reports/chat",
    ANALYZE_ASSIGNMENT: "/api/diagnostics/analyze",
  },
  REQUEST_TIMEOUT: 30000,
  DEFAULT_HEADERS: {
    "Content-Type": "application/json",
  },
};

// Helper function to make API requests to backend
async function makeBackendRequest(endpoint, data, method = "POST") {
  const url = `${CONFIG.BACKEND_URL}${endpoint}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      CONFIG.REQUEST_TIMEOUT,
    );

    const response = await fetch(url, {
      method: method,
      headers: CONFIG.DEFAULT_HEADERS,
      body: JSON.stringify(data),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return { success: true, data: result };
  } catch (error) {
    console.error("Backend request failed:", error);
    return {
      success: false,
      error: error.message,
      message:
        "Failed to connect to backend server. Please check if the server is running.",
    };
  }
}

// Extension installation or update
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    console.log("Extension installed");
    // Set default values
    chrome.storage.sync.set({
      enabled: true,
      installDate: new Date().toISOString(),
    });
  } else if (details.reason === "update") {
    console.log(
      "Extension updated to version:",
      chrome.runtime.getManifest().version,
    );
  }
});

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Message received in background:", request);

  if (request.action === "performAction") {
    // Perform some background work
    const result = performBackgroundTask();
    sendResponse({ success: true, message: result });
  }

  if (request.action === "instructorSettingsUpdated") {
    // Handle instructor settings update
    console.log("Instructor settings updated:", request.settings);
    sendResponse({ success: true });
  }

  if (request.action === "processQuizPrompt") {
    // Handle quiz prompt - send to backend server
    console.log("Processing quiz prompt:", request);

    const payload = {
      prompt: request.prompt,
      questionId: request.questionId,
      questionText: request.questionText,
      assignmentId: request.assignmentId,
      settings: request.settings,
    };

    // Log the exact request being sent to backend
    console.log(
      "📤 BACKEND REQUEST PAYLOAD:",
      JSON.stringify(payload, null, 2),
    );
    console.log(
      "📤 REQUEST URL:",
      `${CONFIG.BACKEND_URL}${CONFIG.ENDPOINTS.PROCESS_PROMPT}`,
    );

    makeBackendRequest(CONFIG.ENDPOINTS.PROCESS_PROMPT, payload)
      .then((result) => {
        if (result.success) {
          sendResponse({
            success: true,
            data: result.data, // Pass the full response object from backend
          });
        } else {
          sendResponse({
            success: false,
            message: result.message,
          });
        }
      })
      .catch((error) => {
        console.error("Error processing prompt:", error);
        sendResponse({
          success: false,
          message: "An error occurred while processing your prompt.",
        });
      });

    return true; // Keep message channel open for async response
  }

  if (request.action === "evaluateAnswer") {
    // Handle answer evaluation - send to backend server
    console.log("Evaluating answer:", request);

    const payload = {
      questionText: request.questionText,
      answer: request.answer,
      settings: request.settings,
    };

    makeBackendRequest(CONFIG.ENDPOINTS.EVALUATE_ANSWER, payload)
      .then((result) => {
        if (result.success) {
          sendResponse({
            success: true,
            feedback: result.data.feedback || result.data.message,
          });
        } else {
          sendResponse({
            success: false,
            feedback: result.message,
          });
        }
      })
      .catch((error) => {
        console.error("Error evaluating answer:", error);
        sendResponse({
          success: false,
          feedback: "An error occurred while evaluating your answer.",
        });
      });

    return true; // Keep message channel open for async response
  }

  if (request.action === "createPrompt") {
    // Handle prompt creation - send to backend server
    console.log("Creating prompt:", request);

    const payload = {
      assignment_id: request.assignment_id,
      professor_instructions: request.professor_instructions,
      metadata: request.metadata || {},
    };

    makeBackendRequest(CONFIG.ENDPOINTS.CREATE_PROMPT, payload)
      .then((result) => {
        if (result.success) {
          sendResponse({
            success: true,
            data: result.data,
          });
        } else {
          sendResponse({
            success: false,
            message: result.message,
          });
        }
      })
      .catch((error) => {
        console.error("Error creating prompt:", error);
        sendResponse({
          success: false,
          message: "An error occurred while creating the prompt.",
        });
      });

    return true; // Keep message channel open for async response
  }

  if (request.action === "generateReport") {
    // Handle report generation - send to backend server (diagnostics)
    console.log("Generating report:", request);

    const payload = {
      assignment_id: request.assignment_id,
    };

    // Use the new diagnostics/analyze endpoint
    makeBackendRequest(CONFIG.ENDPOINTS.ANALYZE_ASSIGNMENT, payload)
      .then((result) => {
        if (result.success) {
          sendResponse({
            success: true,
            data: result.data,
          });
        } else {
          sendResponse({
            success: false,
            message: result.message,
          });
        }
      })
      .catch((error) => {
        console.error("Error generating report:", error);
        sendResponse({
          success: false,
          message: "An error occurred while generating the report.",
        });
      });

    return true; // Keep message channel open for async response
  }

  if (request.action === "chatReport") {
    // Handle report chat - send to backend server
    console.log("Chat with report:", request);

    const payload = {
      assignment_id: request.assignment_id,
      message: request.message,
      chat_history: request.chat_history || [],
    };

    makeBackendRequest(CONFIG.ENDPOINTS.CHAT_REPORT, payload)
      .then((result) => {
        if (result.success) {
          sendResponse({
            success: true,
            data: result.data,
          });
        } else {
          sendResponse({
            success: false,
            message: result.message,
          });
        }
      })
      .catch((error) => {
        console.error("Error chatting with report:", error);
        sendResponse({
          success: false,
          message: "An error occurred while processing your message.",
        });
      });

    return true; // Keep message channel open for async response
  }

  // Return true to indicate async response
  return true;
});

// Example background task
function performBackgroundTask() {
  const timestamp = new Date().toLocaleTimeString();
  console.log("Background task performed at:", timestamp);
  return `Task completed at ${timestamp}`;
}

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    console.log("Tab updated:", tab.url);

    // Example: Send message to content script
    chrome.tabs
      .sendMessage(tabId, {
        action: "pageLoaded",
        url: tab.url,
      })
      .catch((err) => {
        // Content script might not be injected yet
        console.log("Could not send message to tab:", err.message);
      });
  }
});

// Context menu code removed - not needed for quiz functionality

// Example: Set badge text
function updateBadge(text, color = "#FF0000") {
  chrome.action.setBadgeText({ text: text });
  chrome.action.setBadgeBackgroundColor({ color: color });
}

// Example usage
chrome.storage.sync.get(["enabled"], (result) => {
  if (result.enabled) {
    updateBadge("ON", "#00AA00");
  } else {
    updateBadge("OFF", "#FF0000");
  }
});
