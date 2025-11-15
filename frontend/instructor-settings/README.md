# Instructor Settings - Canvas-Integrated Prompt Box

This folder contains the instructor settings interface and Canvas-integrated prompt box functionality that allows instructors to interact with the backend LLM directly from Canvas quiz build pages.

## Files Overview

### Settings Interface
- **instructor-settings.html** - Main settings page UI
- **instructor-settings.css** - Styling for settings page
- **instructor-settings.js** - Settings page logic and controls

### Injectable Components
- **inject-prompt-box.js** - Smart prompt box class with two modes:
  - **Inline mode** - Integrates directly into Canvas quiz pages
  - **Floating mode** - Floating box for non-Canvas pages
- **inject-prompt-box.css** - Styling for both inline and floating modes
- **instructor-content.js** - Content script that detects Canvas and manages injection

## Features

### 1. Settings Page Features
The instructor settings page (`instructor-settings.html`) provides:
- **Quiz Generation Prompt** - Set system prompts for quiz generation
- **Evaluation Prompt** - Set system prompts for answer evaluation
- **Difficulty Level** - Choose from Easy, Medium, Hard, or Expert
- **Enable Hints** - Toggle hints for students
- **Enable Feedback** - Toggle AI feedback on answers
- **Enable Floating Prompt Box** - Toggle the injectable prompt box on web pages
- **Test Backend LLM** - Test prompt section to send custom prompts directly from settings

### 2. Canvas-Integrated Prompt Box (Inline Mode)
**When on Canvas quiz build pages**, the prompt box is automatically injected inline at the top of the page as a beautiful card that blends with the Canvas interface:
- **AI Quiz Assistant** header with gradient background
- Large text area for entering prompts
- Helpful placeholder text and examples
- "Generate with AI" button
- Response display area
- Minimize button to collapse when not needed
- **No floating elements** - fully integrated into the page flow

### 3. Floating Prompt Box (Other Pages)
**When on non-Canvas pages**, a floating prompt box is available:
- Enter custom prompts to send to the backend LLM
- View responses directly on the page
- Drag the prompt box to reposition it
- Toggle visibility with the floating button (📝)

## How to Use

### Accessing Instructor Settings
1. Click the extension icon in Chrome
2. Click "Instructor Settings" button
3. Configure your preferences

### Using on Canvas Quiz Build Pages (Primary Use Case)
1. Enable "Enable floating prompt box on web pages" in settings
2. Click "Save Settings"
3. **Navigate to a Canvas quiz page** (e.g., `https://yourschool.instructure.com/courses/123/quizzes/456/edit`)
4. The **AI Quiz Assistant** card will automatically appear at the top of the page
5. Type your prompt (e.g., "Create 5 multiple choice questions about the American Revolution")
6. Click "✨ Generate with AI"
7. View the AI-generated content in the response area below
8. Use the minimize button (−) to collapse the card when not needed

**Canvas Page Detection:**
The extension automatically detects Canvas quiz pages by looking for:
- Instructure Canvas domains (`*.instructure.com`)
- URLs containing `/quizzes/`, `/quiz`, or `/assignments/*/edit`
- Canvas-specific page elements

### Using on Other Web Pages
1. On non-Canvas pages, look for the floating button (📝) in the bottom-right corner
2. Click the button to open the prompt box
3. Type your prompt and click "Send to Backend LLM"
4. View the response in the box below

### Controls
**Inline Mode (Canvas):**
- **Minimize/Expand** - Click the − or + button to toggle visibility
- Always integrated at the top of the content area

**Floating Mode (Other Pages):**
- **Open/Close** - Click the floating 📝 button to toggle the prompt box
- **Drag** - Click and drag the header to reposition the prompt box
- **Close Button** - Click the × button in the header to close

## Backend Integration

The prompt box sends HTTP POST requests to:
- **URL**: `http://localhost:3000/api/quiz/process-prompt`
- **Method**: POST
- **Headers**: `Content-Type: application/json`
- **Body**:
  ```json
  {
    "prompt": "Your custom prompt here",
    "timestamp": "2025-11-15T...",
    "pageUrl": "https://example.com",
    "pageTitle": "Example Page"
  }
  ```

### Expected Response Format
The backend should return a JSON response:
```json
{
  "response": "The LLM's response text here"
}
```

Or any JSON object that will be displayed to the user.

## Configuration

### Backend URL
The backend URL is configured in `/config.js`:
```javascript
const CONFIG = {
  BACKEND_URL: 'http://localhost:3000',
  ENDPOINTS: {
    PROCESS_PROMPT: '/api/quiz/process-prompt'
  }
}
```

### Permissions
The extension requires these permissions (configured in `manifest.json`):
- `storage` - To save instructor settings
- `activeTab` - To interact with the current tab
- `http://localhost:3000/*` - To communicate with the backend

## Disabling the Injectable Prompt Box

To disable the floating prompt box:
1. Open Instructor Settings
2. Uncheck "Enable floating prompt box on web pages"
3. Click "Save Settings"
4. The prompt box will be removed from all open pages

## Development Notes

### Adding New Features
To extend the prompt box functionality:
1. Edit `inject-prompt-box.js` to add new methods to the `InstructorPromptBox` class
2. Update `inject-prompt-box.css` for new styling
3. Modify `instructor-content.js` to handle new message types

### Message API
You can control the prompt box from other parts of the extension:

```javascript
// Show the prompt box
chrome.tabs.sendMessage(tabId, { action: 'showInstructorPromptBox' });

// Hide the prompt box
chrome.tabs.sendMessage(tabId, { action: 'hideInstructorPromptBox' });

// Toggle the prompt box
chrome.tabs.sendMessage(tabId, { action: 'toggleInstructorPromptBox' });

// Remove the prompt box
chrome.tabs.sendMessage(tabId, { action: 'removeInstructorPromptBox' });

// Initialize/reinitialize
chrome.tabs.sendMessage(tabId, { action: 'initInstructorPromptBox' });
```

## Canvas-Specific Integration

### Supported Canvas URLs
The extension detects and integrates with these Canvas page patterns:
- `https://*.instructure.com/courses/*/quizzes/*/edit`
- `https://*.instructure.com/courses/*/quizzes/new`
- `https://*.instructure.com/courses/*/assignments/*/edit`
- Any URL containing "canvas" in the hostname with quiz-related paths

### Inline Injection Strategy
On Canvas pages, the prompt box is injected before the first matching element:
1. `.quiz-header`
2. `#quiz_title`
3. `.quiz_questions_wrapper`
4. Form elements related to quizzes
5. Main content area

This ensures the prompt box appears at the top of the relevant content.

## Troubleshooting

### Prompt box not appearing on Canvas
1. Check that "Enable floating prompt box on web pages" is checked in settings
2. Reload the Canvas page after enabling
3. Verify you're on a quiz build/edit page (URL should contain `/quizzes/` or `/quiz`)
4. Check browser console for errors (press F12)
5. Try waiting a moment - the box injects after 1 second to ensure Canvas is loaded

### Prompt box appears in wrong location
1. The extension tries multiple Canvas elements for insertion
2. If misplaced, check the console to see which selector was matched
3. The box should appear above the quiz title or questions area

### Backend connection errors
1. Ensure backend server is running at `http://localhost:3000`
2. Check CORS settings on the backend
3. Verify the endpoint `/api/quiz/process-prompt` exists
4. Check browser console for specific error messages

### Styling conflicts with Canvas
If the prompt box styling conflicts with Canvas:
1. All styles use specific class prefixes (`instructor-*`)
2. Inline mode uses `z-index: 1000` (lower than floating mode)
3. Styles are scoped to avoid conflicts with Canvas styles
4. The gradient card design should stand out from Canvas elements

## Browser Compatibility

- Chrome/Chromium browsers (Manifest V3)
- Tested on Chrome 120+

## Security Considerations

- The prompt box only sends data to the configured backend URL
- All requests include the current page URL and title for context
- No sensitive data is stored in the prompt box
- Communication uses standard HTTPS (when backend supports it)
