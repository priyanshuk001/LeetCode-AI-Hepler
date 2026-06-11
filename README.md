# 🚀 LeetCode AI Assistant

[!Version](https://github.com/your-repo)
[!Manifest-V3]()
[!License: MIT](https://opensource.org/licenses/MIT)
[!AI-Powered]()

An advanced, context-aware Chrome extension designed to supercharge your competitive programming experience. LeetCode AI Assistant integrates directly into the LeetCode environment to provide real-time hints, optimized solutions, and debugging support using state-of-the-art LLMs.

## ✨ Key Features

-   **Context-Aware Analysis**: Automatically extracts problem descriptions, constraints, examples, and your current code implementation.
-   **Dual-Provider Support**: Seamlessly switch between **OpenAI (GPT-4o)** and **Google Gemini (2.5/2.0 Flash)**.
-   **Intelligent Actions**:
    -   **Hint**: Get a conceptual nudge without spoiling the solution.
    -   **Approach**: Detailed algorithmic strategies and complexity analysis.
    -   **Solution**: Full code implementation in your selected language.
    -   **Optimize**: Refactor existing code for better time/space complexity.
    -   **Debug**: Identify logic errors and edge-case failures.
    -   **Explain**: Simplified breakdown of complex problem statements.
-   **Direct Editor Integration**: One-click insertion of AI-generated code directly into the LeetCode Monaco editor.
-   **Resilient Scraping**: Multi-selector fallback logic to ensure functionality across different LeetCode UI versions.

## 🏗 Project Architecture

The extension follows a decoupled architecture using the **Chrome Extension Manifest V3** standard:

1.  **Content Script (`content.js`)**: 
    -   Injects the floating AI Assistant UI into the DOM.
    -   Performs "Page Context Discovery" by scraping the problem metadata (Title, Difficulty, Constraints).
    -   Interacts with the LeetCode editor (Monaco/CodeMirror) to read and write code.
2.  **Background Service Worker (`background.js`)**:
    -   Acts as a secure proxy for API requests to OpenAI and Google Gemini.
    -   Implements **Model Fallback Logic**: If a preferred model is unavailable, it automatically tries secondary models (e.g., `gemini-2.5-flash` → `gemini-2.0-flash`).
3.  **Popup UI (`popup.js`/`popup.html`)**:
    -   Manages persistent settings using `chrome.storage.sync`.
    -   Provides an alternative interface for users who prefer the toolbar over the in-page overlay.
4.  **Configuration Layer (`config.js`)**:
    -   Centralizes default model parameters, temperatures, and token limits.

## 📂 Folder Structure

```text
.
├── assets/                 # Extension icons and visual assets
├── background.js           # Service worker handling API orchestration and model fallbacks
├── config.js               # Default configurations for AI providers
├── content.js              # Core logic for DOM scraping and in-page UI injection
├── manifest.json           # Extension metadata and permission definitions
├── marked.min.js           # Markdown rendering library for AI responses
├── popup.html/js/css       # Extension toolbar popup interface
└── README.md               # Project documentation
```

## 🛠 Technology Stack

-   **Language**: Vanilla JavaScript (ES6+), HTML5, CSS3.
-   **APIs**: Chrome Extensions API (Scripting, Storage, Messaging).
-   **AI Integration**: OpenAI Chat Completions API, Google Generative Language API (Gemini).
-   **Formatting**: Marked.js for high-quality markdown rendering in the assistant panel.

## 🚀 Installation & Setup

### 1. Prerequisites
-   A Chromium-based browser (Chrome, Edge, Brave).
-   An API Key from OpenAI Platform or Google AI Studio.

### 2. Manual Installation
1.  Clone this repository:
    ```bash
    git clone https://github.com/your-username/LeetCode-AI-Assistant.git
    ```
2.  Open Chrome and navigate to `chrome://extensions/`.
3.  Enable **Developer Mode** (toggle in the top right).
4.  Click **Load unpacked** and select the project folder.

### 3. Configuration
1.  Open any LeetCode problem (e.g., Two Sum).
2.  Click the **AI** button on the right side of the page or the extension icon in the toolbar.
3.  Select your preferred **Provider** (OpenAI or Gemini).
4.  Paste your **API Key** and click **Save**.

## 📝 Environment Variables (Internal Storage)

While this extension doesn't use a `.env` file for security (as it's a client-side bundle), it manages the following keys via `chrome.storage.sync`:

| Key | Type | Description |
| :--- | :--- | :--- |
| `aiProvider` | `string` | `openai` or `gemini` |
| `apiKey` | `string` | Encrypted/Private key for the chosen provider |

## 🔄 Workflow

1.  **Extraction**: When an action is clicked, `content.js` gathers problem data.
2.  **Messaging**: The content script sends a message to `background.js` with the context.
3.  **Inference**: `background.js` constructs a prompt and calls the LLM API.
4.  **Rendering**: The background script returns the response; `content.js` renders it using `marked.min.js` and updates the floating panel.

## 🛠 Troubleshooting

-   **Icon not showing?**: Refresh the LeetCode page. Ensure the URL matches `leetcode.com/problems/*`.
-   **Empty Response?**: Check your API quota and verify the API key is saved correctly in the settings tab.
-   **Code Insertion Fails?**: LeetCode's Monaco editor is complex. If automatic insertion fails, use the "Copy" button and paste manually.
-   **Provider Errors**: If you get a "Model not found" error, ensure your API key has access to the models specified in `config.js` (e.g., GPT-4o).

## 🔮 Future Improvements

-   [ ] **Local LLM Support**: Integrate with Ollama for privacy-focused, local inference.
-   [ ] **History Tab**: Save previous AI suggestions per problem.
-   [ ] **Visual Debugging**: Trace variable values directly in the AI response.
-   [ ] **Multi-Language Support**: Expanded prompt engineering for niche languages like Rust or Go.

## 🤝 Contributing

Contributions are welcome! Please follow these steps:
1.  Fork the project.
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`).
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4.  Push to the Branch (`git push origin feature/AmazingFeature`).
5.  Open a Pull Request.

---
*Disclaimer: This extension is intended for educational purposes. Use AI assistance responsibly and ensure you understand the solutions generated.*
