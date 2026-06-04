// Listen for messages from the popup
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === "getProblemDetails") {
    const problemDetails = extractProblemDetails();
    sendResponse({ problemDetails: problemDetails });
  } else if (request.action === "getCurrentCode") {
    const code = extractCurrentCode();
    sendResponse({ code: code });
  } else if (request.action === "insertCode") {
    const success = insertCodeToEditor(request.code);
    sendResponse({ success: success });
  } else if (request.action === "getTestCases") {
    const testCases = extractTestCases();
    sendResponse({ testCases: testCases });
  } else if (request.action === "getSubmissionResults") {
    const results = extractSubmissionResults();
    sendResponse({ results: results });
  } else if (request.action === "showNotification") {
    showNotification(request.message, request.type || "info");
    sendResponse({ success: true });
  }

  // Return true to indicate we will send a response asynchronously
  return true;
});

// Inject the in-page assistant when the page loads.
document.addEventListener("DOMContentLoaded", injectAssistantShell);
injectAssistantShell();

let leetcodeAiState = {
  lastResponse: "",
  lastModel: "",
};

/**
 * Injects a fixed assistant launcher and side panel on LeetCode problem pages.
 */
function injectAssistantShell() {
  // Only inject on LeetCode problem pages
  if (!window.location.href.includes("leetcode.com/problems/")) {
    return;
  }

  // Check if the UI already exists to avoid duplicates
  if (document.getElementById("leetcode-ai-assistant-button")) {
    return;
  }

  const styles = document.createElement("style");
  styles.id = "leetcode-ai-assistant-styles";
  styles.textContent = `
    :root {
      --lcai-bg: #f8fafc;
      --lcai-surface: #ffffff;
      --lcai-text: #172033;
      --lcai-muted: #64748b;
      --lcai-border: #dbe4ee;
      --lcai-primary: #2563eb;
      --lcai-primary-strong: #1d4ed8;
      --lcai-accent: #0f766e;
      --lcai-danger: #dc2626;
      --lcai-shadow: 0 18px 50px rgba(15, 23, 42, 0.18);
    }

    #leetcode-ai-assistant-button {
      position: fixed;
      top: 146px;
      right: 22px;
      width: 46px;
      height: 46px;
      border-radius: 12px;
      background: linear-gradient(135deg, #2563eb, #0f766e);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 10px 30px rgba(37, 99, 235, 0.28);
      z-index: 10000;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      border: 1px solid rgba(255, 255, 255, 0.45);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    #leetcode-ai-assistant-button:hover {
      transform: translateY(-1px);
      box-shadow: 0 14px 34px rgba(37, 99, 235, 0.34);
    }

    #leetcode-ai-assistant-button.leetcode-ai-open {
      background: #172033;
    }

    .leetcode-ai-button-mark {
      font-size: 20px;
      font-weight: 800;
      line-height: 1;
      letter-spacing: 0;
    }

    #leetcode-ai-assistant-panel {
      position: fixed;
      top: 140px;
      right: 82px;
      width: min(420px, calc(100vw - 28px));
      max-height: calc(100vh - 112px);
      background: var(--lcai-surface);
      border: 1px solid var(--lcai-border);
      border-radius: 8px;
      box-shadow: var(--lcai-shadow);
      z-index: 10000;
      color: var(--lcai-text);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      overflow: hidden;
      transform: translateY(-8px);
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s ease, transform 0.2s ease;
    }

    #leetcode-ai-assistant-panel.leetcode-ai-open {
      opacity: 1;
      transform: translateY(0);
      pointer-events: auto;
    }

    .leetcode-ai-panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 14px 16px;
      background: #f8fafc;
      border-bottom: 1px solid var(--lcai-border);
    }

    .leetcode-ai-title {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
    }

    .leetcode-ai-logo {
      width: 30px;
      height: 30px;
      border-radius: 8px;
      display: grid;
      place-items: center;
      color: #ffffff;
      background: linear-gradient(135deg, #2563eb, #0f766e);
      font-weight: 800;
    }

    .leetcode-ai-title strong {
      display: block;
      font-size: 14px;
      line-height: 18px;
      color: var(--lcai-text);
    }

    .leetcode-ai-title span {
      display: block;
      font-size: 12px;
      line-height: 16px;
      color: var(--lcai-muted);
    }

    .leetcode-ai-icon-button {
      width: 32px;
      height: 32px;
      border: 1px solid transparent;
      border-radius: 8px;
      background: transparent;
      color: var(--lcai-muted);
      display: grid;
      place-items: center;
      cursor: pointer;
      font-size: 18px;
    }

    .leetcode-ai-icon-button:hover {
      background: #eaf0f7;
      color: var(--lcai-text);
    }

    .leetcode-ai-panel-body {
      padding: 14px 16px 16px;
      overflow: auto;
      max-height: calc(100vh - 176px);
      background: var(--lcai-bg);
    }

    .leetcode-ai-settings {
      display: grid;
      grid-template-columns: 1fr;
      gap: 10px;
      margin-bottom: 14px;
    }

    .leetcode-ai-field {
      display: grid;
      gap: 6px;
    }

    .leetcode-ai-field label {
      color: var(--lcai-muted);
      font-size: 12px;
      font-weight: 700;
    }

    .leetcode-ai-input-row {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 8px;
    }

    .leetcode-ai-field select,
    .leetcode-ai-field input {
      min-height: 38px;
      border: 1px solid var(--lcai-border);
      border-radius: 8px;
      background: #ffffff;
      color: var(--lcai-text);
      padding: 8px 10px;
      font-size: 13px;
      outline: none;
    }

    .leetcode-ai-field select:focus,
    .leetcode-ai-field input:focus {
      border-color: var(--lcai-primary);
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
    }

    .leetcode-ai-save {
      min-height: 38px;
      border: 0;
      border-radius: 8px;
      background: var(--lcai-text);
      color: #ffffff;
      padding: 0 12px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 700;
    }

    .leetcode-ai-actions {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin-bottom: 12px;
    }

    .leetcode-ai-action {
      position: relative;
      min-height: 38px;
      border: 1px solid var(--lcai-border);
      border-radius: 8px;
      background: #ffffff;
      color: var(--lcai-text);
      padding: 8px 6px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 700;
    }

    .leetcode-ai-action:hover {
      border-color: rgba(37, 99, 235, 0.45);
      color: var(--lcai-primary-strong);
      background: #eef5ff;
    }

    .leetcode-ai-action.active {
      border-color: transparent;
      background: var(--lcai-primary);
      color: #ffffff;
    }

    .leetcode-ai-action::after {
      content: attr(data-tooltip);
      position: absolute;
      left: 50%;
      bottom: calc(100% + 8px);
      width: 210px;
      transform: translateX(-50%) translateY(4px);
      padding: 8px 10px;
      border-radius: 8px;
      background: #172033;
      color: #ffffff;
      font-size: 12px;
      line-height: 1.35;
      font-weight: 600;
      opacity: 0;
      pointer-events: none;
      visibility: hidden;
      transition: opacity 0.16s ease 3s, transform 0.16s ease 3s, visibility 0s linear 3s;
      z-index: 1;
    }

    .leetcode-ai-action:hover::after {
      opacity: 1;
      visibility: visible;
      transform: translateX(-50%) translateY(0);
    }

    .leetcode-ai-response {
      min-height: 190px;
      max-height: 380px;
      overflow: auto;
      border: 1px solid var(--lcai-border);
      border-radius: 8px;
      background: #ffffff;
      padding: 14px;
      color: var(--lcai-text);
      font-size: 13px;
      line-height: 1.55;
    }

    .leetcode-ai-response.empty {
      display: grid;
      place-items: center;
      color: var(--lcai-muted);
      text-align: center;
    }

    .leetcode-ai-response pre {
      position: relative;
      overflow: auto;
      background: #0f172a;
      color: #e2e8f0;
      padding: 12px;
      border-radius: 8px;
      font-size: 12px;
      line-height: 1.5;
    }

    .leetcode-ai-response code {
      font-family: "Cascadia Code", Consolas, monospace;
    }

    .leetcode-ai-meta {
      margin: 8px 0 0;
      min-height: 16px;
      color: var(--lcai-muted);
      font-size: 12px;
    }

    .leetcode-ai-footer-actions {
      display: flex;
      gap: 8px;
      margin-top: 12px;
    }

    .leetcode-ai-secondary {
      flex: 1;
      min-height: 36px;
      border: 1px solid var(--lcai-border);
      border-radius: 8px;
      background: #ffffff;
      color: var(--lcai-text);
      cursor: pointer;
      font-size: 13px;
      font-weight: 700;
    }

    .leetcode-ai-secondary:hover {
      background: #eef5ff;
      border-color: rgba(37, 99, 235, 0.45);
    }

    .leetcode-ai-hidden {
      display: none !important;
    }

    @media (max-width: 768px) {
      #leetcode-ai-assistant-button {
        top: 132px;
        right: 14px;
      }

      #leetcode-ai-assistant-panel {
        top: 186px;
        right: 14px;
      }

      .leetcode-ai-actions {
        grid-template-columns: repeat(2, 1fr);
      }
    }
  `;

  const launcher = document.createElement("button");
  launcher.id = "leetcode-ai-assistant-button";
  launcher.type = "button";
  launcher.title = "Toggle LeetCode AI Assistant";
  launcher.innerHTML = `<span class="leetcode-ai-button-mark">AI</span>`;

  const panel = document.createElement("aside");
  panel.id = "leetcode-ai-assistant-panel";
  panel.setAttribute("aria-label", "LeetCode AI Assistant");
  panel.innerHTML = `
    <div class="leetcode-ai-panel-header">
      <div class="leetcode-ai-title">
        <div class="leetcode-ai-logo">AI</div>
        <div>
          <strong>LeetCode Assistant</strong>
          <span>Pick an action and keep coding</span>
        </div>
      </div>
      <button class="leetcode-ai-icon-button" id="leetcode-ai-close" type="button" title="Close">x</button>
    </div>
    <div class="leetcode-ai-panel-body">
      <div class="leetcode-ai-settings">
        <div class="leetcode-ai-field">
          <label for="leetcode-ai-provider">Model Provider</label>
          <select id="leetcode-ai-provider">
            <option value="gemini">Google Gemini</option>
            <option value="openai">OpenAI</option>
          </select>
        </div>
        <div class="leetcode-ai-field">
          <label for="leetcode-ai-api-key">API Key</label>
          <div class="leetcode-ai-input-row">
            <input id="leetcode-ai-api-key" type="password" placeholder="Paste API key" />
            <button class="leetcode-ai-save" id="leetcode-ai-save" type="button">Save</button>
          </div>
        </div>
      </div>
      <div class="leetcode-ai-actions">
        <button class="leetcode-ai-action" type="button" data-ai-action="hint" data-tooltip="Gives a small clue without revealing the full solution.">Hint</button>
        <button class="leetcode-ai-action" type="button" data-ai-action="approach" data-tooltip="Explains the algorithm idea, steps, and complexity.">Approach</button>
        <button class="leetcode-ai-action" type="button" data-ai-action="solution" data-tooltip="Generates a complete code solution for the selected language.">Solution</button>
        <button class="leetcode-ai-action" type="button" data-ai-action="optimize" data-tooltip="Improves your current code for speed, memory, and clarity.">Optimize</button>
        <button class="leetcode-ai-action" type="button" data-ai-action="debug" data-tooltip="Finds mistakes in your current code and suggests a fix.">Debug</button>
        <button class="leetcode-ai-action" type="button" data-ai-action="explain" data-tooltip="Breaks down the problem statement in simple words.">Explain</button>
      </div>
      <div id="leetcode-ai-response" class="leetcode-ai-response empty">
        Choose an action to generate help for this problem.
      </div>
      <div id="leetcode-ai-meta" class="leetcode-ai-meta"></div>
      <div class="leetcode-ai-footer-actions">
        <button class="leetcode-ai-secondary" id="leetcode-ai-copy" type="button">Copy</button>
        <button class="leetcode-ai-secondary" id="leetcode-ai-insert" type="button">Insert Code</button>
      </div>
    </div>
  `;

  document.body.appendChild(styles);
  document.body.appendChild(launcher);
  document.body.appendChild(panel);

  launcher.addEventListener("click", toggleAssistantPanel);
  panel.querySelector("#leetcode-ai-close").addEventListener("click", closeAssistantPanel);
  panel.querySelector("#leetcode-ai-save").addEventListener("click", saveAssistantSettings);
  panel.querySelector("#leetcode-ai-copy").addEventListener("click", copyAssistantResponse);
  panel.querySelector("#leetcode-ai-insert").addEventListener("click", insertAssistantCode);
  panel.querySelectorAll("[data-ai-action]").forEach((button) => {
    button.addEventListener("click", () => runAssistantAction(button.dataset.aiAction));
  });

  loadAssistantSettings();
}

function toggleAssistantPanel() {
  const panel = document.getElementById("leetcode-ai-assistant-panel");
  const launcher = document.getElementById("leetcode-ai-assistant-button");
  const isOpen = panel.classList.toggle("leetcode-ai-open");
  launcher.classList.toggle("leetcode-ai-open", isOpen);
}

function closeAssistantPanel() {
  document.getElementById("leetcode-ai-assistant-panel")?.classList.remove("leetcode-ai-open");
  document.getElementById("leetcode-ai-assistant-button")?.classList.remove("leetcode-ai-open");
}

function loadAssistantSettings() {
  chrome.storage.sync.get(["aiProvider", "apiKey"], function (settings) {
    const provider = document.getElementById("leetcode-ai-provider");
    const apiKey = document.getElementById("leetcode-ai-api-key");

    if (provider && settings.aiProvider) provider.value = settings.aiProvider;
    if (apiKey && settings.apiKey) apiKey.value = settings.apiKey;
  });
}

function getAssistantSettings() {
  return {
    aiProvider: document.getElementById("leetcode-ai-provider")?.value || "gemini",
    apiKey: document.getElementById("leetcode-ai-api-key")?.value || "",
  };
}

function saveAssistantSettings() {
  const settings = getAssistantSettings();
  chrome.storage.sync.set(settings, function () {
    showNotification("Settings saved.", "success");
  });
}

function setAssistantLoading(message) {
  const response = document.getElementById("leetcode-ai-response");
  const meta = document.getElementById("leetcode-ai-meta");
  response.classList.add("empty");
  response.textContent = message;
  if (meta) meta.textContent = "";
}

function setAssistantResponse(content, model) {
  leetcodeAiState.lastResponse = content || "";
  leetcodeAiState.lastModel = model || "";

  const response = document.getElementById("leetcode-ai-response");
  const meta = document.getElementById("leetcode-ai-meta");
  response.classList.remove("empty");
  response.innerHTML = formatAssistantMarkdown(content || "No response received.");
  if (meta) meta.textContent = model ? `Generated by ${model}` : "";
}

function setAssistantError(message) {
  const response = document.getElementById("leetcode-ai-response");
  const meta = document.getElementById("leetcode-ai-meta");
  response.classList.remove("empty");
  response.innerHTML = `<strong style="color: var(--lcai-danger);">Error</strong><p>${escapeHtml(message)}</p>`;
  if (meta) meta.textContent = "";
}

function formatAssistantMarkdown(content) {
  let escaped = escapeHtml(content);

  escaped = escaped.replace(/```(\w+)?\n([\s\S]*?)```/g, function (_match, _language, code) {
    return `<pre><code>${code.trim()}</code></pre>`;
  });
  escaped = escaped.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  escaped = escaped.replace(/\n{2,}/g, "</p><p>");
  escaped = escaped.replace(/\n/g, "<br>");

  return `<p>${escaped}</p>`;
}

function copyAssistantResponse() {
  if (!leetcodeAiState.lastResponse) {
    showNotification("Nothing to copy yet.", "warning");
    return;
  }

  navigator.clipboard.writeText(leetcodeAiState.lastResponse).then(
    () => showNotification("Response copied.", "success"),
    () => showNotification("Could not copy response.", "error")
  );
}

function insertAssistantCode() {
  const code = extractFirstCodeBlock(leetcodeAiState.lastResponse);
  if (!code) {
    showNotification("No code block found in the response.", "warning");
    return;
  }

  const success = insertCodeToEditor(code);
  showNotification(
    success ? "Code inserted successfully." : "Could not insert code.",
    success ? "success" : "error"
  );
}

function extractFirstCodeBlock(content) {
  const codeMatch = String(content || "").match(/```(?:[\w+-]*)\n([\s\S]*?)```/);
  return codeMatch?.[1]?.trim() || "";
}

function runAssistantAction(action) {
  setActiveAssistantAction(action);

  const settings = getAssistantSettings();
  if (!settings.apiKey) {
    setAssistantError("Please paste your API key and click Save first.");
    return;
  }

  chrome.storage.sync.set(settings);
  setAssistantLoading(`${getActionLabel(action)}...`);

  const problemDetails = extractProblemDetails();
  const code = extractCurrentCode();
  const testCases = extractTestCases();
  const submissionResults = extractSubmissionResults();

  const baseSettings = { ...settings, assistanceType: action };
  let payload;

  if (action === "optimize") {
    if (!code) {
      setAssistantError("Could not read code from the editor.");
      return;
    }
    payload = { action: "optimizeCode", code, problemDetails, settings: baseSettings };
  } else if (action === "debug") {
    if (!code) {
      setAssistantError("Could not read code from the editor.");
      return;
    }
    payload = { action: "debugCode", code, testCases, problemDetails, settings: baseSettings };
  } else {
    payload = {
      action: "getAIHelp",
      problemDetails,
      settings: baseSettings,
    };
  }

  chrome.runtime.sendMessage(payload, function (aiResponse) {
    if (chrome.runtime.lastError) {
      setAssistantError(chrome.runtime.lastError.message);
      return;
    }

    if (aiResponse?.content) {
      setAssistantResponse(aiResponse.content, aiResponse.model);
      return;
    }

    setAssistantError(aiResponse?.error || "Error getting AI response.");
  });
}

function setActiveAssistantAction(action) {
  document.querySelectorAll("#leetcode-ai-assistant-panel [data-ai-action]").forEach((button) => {
    button.classList.toggle("active", button.dataset.aiAction === action);
  });
}

function getActionLabel(action) {
  const labels = {
    hint: "Preparing a hint",
    approach: "Building an approach",
    solution: "Writing a solution",
    optimize: "Optimizing your code",
    debug: "Debugging your code",
    explain: "Explaining the problem",
  };

  return labels[action] || "Thinking";
}

function escapeHtml(unsafe) {
  return String(unsafe || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Extract problem details from the LeetCode page
 */
function extractProblemDetails() {
  try {
    // Extract problem title - Updated with multiple selector attempts
    let titleElement = document.querySelector('[data-cy="question-title"]');

    // If the standard selector doesn't work, try alternate selectors
    if (!titleElement || !titleElement.textContent) {
      // Try to find the title in the new UI structure
      titleElement = document.querySelector(".text-title-large a");

      // Additional fallbacks
      if (!titleElement || !titleElement.textContent) {
        titleElement = document.querySelector(
          'div[class*="title"] a[href*="/problems/"]'
        );
      }

      if (!titleElement || !titleElement.textContent) {
        const headings = document.querySelectorAll("h1, h2, h3, h4");
        for (const heading of headings) {
          if (heading.textContent && heading.textContent.includes(".")) {
            titleElement = heading;
            break;
          }
        }
      }
    }

    const title = titleElement
      ? titleElement.textContent.trim()
      : "Unknown Problem";

    // Extract problem ID and slug
    const urlPath = window.location.pathname;
    const problemSlug = urlPath.split("/problems/")[1]?.split("/")[0] || "";
    const problemId =
      document.querySelector(".mr-4 .text-label-1")?.textContent || "";

    // Extract difficulty
    let difficultyElement =
      document.querySelector("[diff]") ||
      document.querySelector(
        ".relative.inline-flex.items-center.justify-center.text-caption.px-2.py-1.gap-1.rounded-full.bg-fill-secondary"
      );

    // Additional selectors for difficulty
    if (!difficultyElement) {
      // Try newer UI selectors
      difficultyElement = document.querySelector("[data-difficulty]");

      if (!difficultyElement) {
        // Look for text containing difficulty keywords
        const difficultyTexts = ["Easy", "Medium", "Hard"];
        const allElements = document.querySelectorAll("div, span");

        for (const element of allElements) {
          const text = element.textContent.trim();
          if (difficultyTexts.some((diff) => text === diff)) {
            difficultyElement = element;
            break;
          }
        }
      }
    }

    let difficulty = "Unknown";
    if (difficultyElement) {
      const diffText = difficultyElement.textContent.trim();
      if (diffText.includes("Easy") || diffText === "Easy") difficulty = "Easy";
      else if (diffText.includes("Medium") || diffText === "Medium")
        difficulty = "Medium";
      else if (diffText.includes("Hard") || diffText === "Hard")
        difficulty = "Hard";
      else difficulty = diffText;
    }

    // Extract problem description
    let descriptionElement =
      document.querySelector('[data-cy="question-content"]') ||
      document.querySelector(".elfjS");

    // Additional selectors for description
    if (!descriptionElement || !descriptionElement.textContent) {
      // Try newer UI selectors
      descriptionElement = document.querySelector(".description");

      if (!descriptionElement) {
        // Try to find content div near the title
        const contentContainer = document.querySelector(
          'div[class*="content"]'
        );
        if (contentContainer) {
          // Find the main content area that's likely to contain the description
          const contentDivs =
            contentContainer.querySelectorAll("div > div > div");
          for (const div of contentDivs) {
            // Look for a div with substantial text content
            if (
              div.textContent &&
              div.textContent.length > 100 &&
              !div.querySelector("textarea, input")
            ) {
              descriptionElement = div;
              break;
            }
          }
        }
      }

      // Last resort - find the largest text block after the title
      if (!descriptionElement && titleElement) {
        const allParagraphs = document.querySelectorAll("p");
        let largestTextBlock = null;
        let maxLength = 0;

        for (const p of allParagraphs) {
          if (p.textContent && p.textContent.length > maxLength) {
            largestTextBlock = p;
            maxLength = p.textContent.length;
          }
        }

        if (largestTextBlock && maxLength > 50) {
          descriptionElement = largestTextBlock;
        }
      }
    }

    const description = descriptionElement
      ? descriptionElement.textContent.trim()
      : "No description available";

    // Extract examples
    const examples = [];
    const exampleBlocks =
      document.querySelectorAll('[data-cy="question-content"] pre') ||
      document.querySelectorAll(".elfjS pre");
    exampleBlocks.forEach((block, index) => {
      examples.push({
        id: index + 1,
        content: block.textContent.trim(),
      });
    });

    // Extract constraints
    let constraintsText = "";
    if (description.includes("Constraints:")) {
      const constraintsPart = description.split("Constraints:")[1];
      constraintsText = constraintsPart.split("Follow-up:")[0].trim();
    }

    // Extract topics/tags
    const topics = [];
    const topicElements = document.querySelectorAll('a[href^="/tag/"]');
    topicElements.forEach((element) => {
      topics.push(element.textContent.trim());
    });

    // Extract function signature and starter code
    const codeEditorContent = extractCodeEditorContent();
    const selectedLanguage = detectSelectedEditorLanguage();
    const { functionSignature, starterCode, language: parsedLanguage } =
      parseCodeEditorContent(codeEditorContent);
    const language = selectedLanguage || parsedLanguage;

    // Create the final result object
    const problemDetails = {
      id: problemId,
      slug: problemSlug,
      title,
      difficulty,
      description,
      examples,
      constraints: constraintsText,
      topics,
      functionSignature,
      starterCode,
      language,
    };

    // Add debug logging
    console.log("LeetCode AI Assistant - Extracted problem details:", {
      title,
      difficulty,
      language,
      description: description.substring(0, 100) + "...", // Truncate for logging
    });

    return problemDetails;
  } catch (error) {
    console.error("Error extracting problem details:", error);
    // Log the error details for debugging
    console.error("Error stack:", error.stack);
    return null;
  }
}

/**
 * Extract the content from the code editor
 */
function extractCodeEditorContent() {
  // Try multiple selectors to find the code editor
  const editorSelectors = [
    ".monaco-editor .view-lines",
    ".CodeMirror-code",
    "[data-mode-id]",
    ".view-lines",
  ];

  for (const selector of editorSelectors) {
    const editorElement = document.querySelector(selector);
    if (editorElement) {
      return editorElement.textContent;
    }
  }

  // Fallback to getting all monaco editor content
  const monacoEditors = document.querySelectorAll(".monaco-editor");
  if (monacoEditors.length > 0) {
    return monacoEditors[0].textContent;
  }

  return "";
}

/**
 * Parse the code editor content to extract function signature and starter code
 */
function parseCodeEditorContent(content) {
  if (!content) return { functionSignature: "", starterCode: "", language: "" };

  const lines = content.split("\n").filter((line) => line.trim() !== "");
  let functionSignature = "";
  let language = "";

  // Look for function signature based on language patterns
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // JavaScript/TypeScript function
    if (line.includes("function") && line.includes("(")) {
      functionSignature = line;
      language = "javascript";
      break;
    }
    // Python def
    else if (line.startsWith("def ") && line.includes("(")) {
      functionSignature = line;
      language = "python";
      break;
    }
    // C++ class method
    else if (
      line.includes("class") &&
      lines[i + 1] &&
      lines[i + 1].includes("public:")
    ) {
      language = "cpp";
      for (let j = i + 1; j < lines.length; j++) {
        if (
          lines[j].includes("(") &&
          !lines[j].includes(";") &&
          !lines[j].includes("public:") &&
          !lines[j].includes("private:")
        ) {
          functionSignature = lines[j].trim();
          break;
        }
      }
      if (functionSignature) break;
    }
    // Java/C++ method
    else if (
      (line.includes("public") ||
        line.includes("private") ||
        line.includes("protected")) &&
      line.includes("(") &&
      !line.includes(";")
    ) {
      if (
        content.includes("public:") ||
        content.includes("#include") ||
        content.includes("std::") ||
        content.includes("vector<")
      ) {
        language = "cpp";
      } else {
        language = "java";
      }
      functionSignature = line;
      break;
    }
  }

  // If we still couldn't determine the language, try to guess based on content
  if (!language) {
    if (
      content.includes("function") &&
      (content.includes("var") ||
        content.includes("let") ||
        content.includes("const"))
    ) {
      language = "javascript";
    } else if (content.includes("def ") && content.includes("return")) {
      language = "python";
    } else if (
      content.includes("public class") ||
      content.includes("private class")
    ) {
      language = "java";
    } else if (content.includes("cout") || content.includes("vector<")) {
      language = "cpp";
    }
  }

  return {
    functionSignature,
    starterCode: lines.join("\n"),
    language,
  };
}

function detectSelectedEditorLanguage() {
  const selectors = [
    '[data-e2e-locator="console-select-language"]',
    '[data-cy="lang-select"]',
    'button[aria-haspopup="listbox"]',
    'button[aria-haspopup="menu"]',
    ".language-btn.selected",
    '[data-cy="code-tab"][aria-selected="true"]',
  ];

  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);
    for (const element of elements) {
      const language = normalizeLanguageName(element.textContent);
      if (language) return language;
    }
  }

  const possibleControls = document.querySelectorAll(
    "button, [role='button'], [aria-label], [title]"
  );

  for (const element of possibleControls) {
    const text = [
      element.textContent,
      element.getAttribute("aria-label"),
      element.getAttribute("title"),
    ]
      .filter(Boolean)
      .join(" ");
    const language = normalizeLanguageName(text);
    if (language) return language;
  }

  return "";
}

function normalizeLanguageName(text) {
  const value = String(text || "").toLowerCase().replace(/\s+/g, " ").trim();

  if (!value) return "";
  if (value.includes("c++") || value.includes("cpp")) return "C++";
  if (value.includes("python3") || value.includes("python")) return "Python";
  if (value.includes("typescript")) return "TypeScript";
  if (value.includes("javascript")) return "JavaScript";
  if (value.includes("java") && !value.includes("javascript")) return "Java";
  if (value.includes("c#") || value.includes("csharp")) return "C#";
  if (value.includes("golang") || value === "go" || value.includes(" go ")) return "Go";
  if (value.includes("rust")) return "Rust";
  if (value.includes("kotlin")) return "Kotlin";
  if (value.includes("swift")) return "Swift";
  if (value.includes("php")) return "PHP";
  if (value.includes("ruby")) return "Ruby";

  return "";
}

/**
 * Extract current code from the editor
 */
function extractCurrentCode() {
  try {
    // Try to get code from Monaco editor
    const editorContent = extractCodeEditorContent();
    if (editorContent) {
      return editorContent;
    }

    // Try to find the textarea or pre element that contains the code
    const textareas = document.querySelectorAll("textarea");
    for (const textarea of textareas) {
      if (textarea.value && textarea.value.length > 0) {
        return textarea.value;
      }
    }

    // Try to find code in the DOM structure specific to LeetCode
    const codeLines = document.querySelectorAll(".view-line");
    if (codeLines.length > 0) {
      return Array.from(codeLines)
        .map((line) => line.textContent)
        .join("\n");
    }

    return "";
  } catch (error) {
    console.error("Error extracting current code:", error);
    return "";
  }
}

/**
 * Extract test cases from the LeetCode page
 */
function extractTestCases() {
  try {
    const testCases = [];

    // Try to find test cases in the testcase tab (new UI with flexlayout)
    const testcaseTab = document.getElementById("testcase_tab");
    if (testcaseTab) {
      // Find the testcase content area
      const testcaseContent = document.querySelector(".flexlayout__tabset_content");

      // If we found the tab content area, look for the test case input
      if (testcaseContent) {
        const testcaseInput = testcaseContent.querySelector("textarea, [contenteditable='true']");
        if (testcaseInput && testcaseInput.value) {
          testCases.push({
            id: "testcase_1",
            input: testcaseInput.value.trim()
          });
        } else if (testcaseInput && testcaseInput.textContent) {
          testCases.push({
            id: "testcase_1",
            input: testcaseInput.textContent.trim()
          });
        }
      }

      // If we couldn't find the test case in the content area, try other selectors
      if (testCases.length === 0) {
        // Try to find any textarea or editable div in the testcase area
        const testcaseInputs = document.querySelectorAll("textarea, [contenteditable='true']");
        for (const input of testcaseInputs) {
          const inputValue = input.value || input.textContent;
          if (inputValue && inputValue.trim()) {
            testCases.push({
              id: `testcase_${testCases.length + 1}`,
              input: inputValue.trim()
            });
          }
        }
      }
    }

    // Try to find test cases in the testcase tab (alternative UI)
    if (testCases.length === 0) {
      const testcaseTab = document.querySelector(
        '[data-e2e-locator="console-tab-testcase"]'
      );
      if (testcaseTab) {
        const testcaseInputs = document.querySelectorAll(
          '[data-e2e-locator="console-testcase-input"]'
        );
        if (testcaseInputs.length > 0) {
          const testCase = {};
          testcaseInputs.forEach((inputElement) => {
            try {
              // Find the label associated with the input
              const container = inputElement.closest(
                ".flex.h-full.w-full.flex-col.space-y-2"
              );
              const labelElement = container
                ? container.querySelector(".text-xs.font-medium")
                : null;

              if (labelElement) {
                const key = labelElement.textContent.replace("=", "").trim();
                testCase[key] = inputElement.textContent.trim();
              } else {
                console.warn(
                  "Could not find label for testcase input:",
                  inputElement
                );
              }
            } catch (labelError) {
              console.error(
                "Error processing single testcase input:",
                labelError,
                inputElement
              );
            }
          });

          if (Object.keys(testCase).length > 0) {
            testCases.push(testCase);
          }
        }
      }
    }

    // Try to find test cases in the description's examples (older UI / problem view)
    if (testCases.length === 0) {
      const exampleContainer =
        document.querySelector('[data-cy="question-content"]') ||
        document.querySelector(".elfjS");
      if (exampleContainer) {
        const examples = exampleContainer.querySelectorAll("pre"); // Examples are often in <pre> tags
        examples.forEach((exampleBlock, index) => {
          try {
            const text = exampleBlock.textContent.trim();
            const inputMatch = text.match(/Input:\s*([\s\S]*?)(?:Output:|$)/i);
            const outputMatch = text.match(
              /Output:\s*([\s\S]*?)(?:Explanation:|$)/i
            );

            if (inputMatch && inputMatch[1] && outputMatch && outputMatch[1]) {
              const inputText = inputMatch[1].trim();
              const outputText = outputMatch[1].trim();
              testCases.push({
                id: `example_${index + 1}`,
                input: inputText,
                output: outputText,
              });
            }
          } catch (exampleError) {
            console.error(
              `Error parsing example ${index + 1}:`,
              exampleError,
              exampleBlock
            );
          }
        });
      }
    }

    // Log the extracted test cases for debugging
    console.log("LeetCode AI Assistant - Extracted test cases:", testCases);

    return testCases;
  } catch (error) {
    // Log the specific error type and message
    console.error(
      `Error extracting test cases (${error.name}): ${error.message}`
    );
    console.error("Error stack:", error.stack);
    return []; // Return empty array on failure
  }
}

/**
 * Extract submission results from the LeetCode page
 */
function extractSubmissionResults() {
  try {
    // Try to find submission results in the new UI with flexlayout
    const resultTab = document.getElementById("result_tab");
    if (resultTab) {
      // Check if the result tab is selected
      const isResultTabSelected = document.querySelector(".flexlayout__tab_button--selected #result_tab");

      // If the result tab is not selected, we need to click it to see the results
      if (!isResultTabSelected && resultTab.closest(".flexlayout__tab_button")) {
        resultTab.closest(".flexlayout__tab_button").click();
      }

      // Find the result content area
      const resultContent = document.querySelector(".flexlayout__tabset_content");
      if (resultContent) {
        const resultText = resultContent.textContent.trim();

        // Check for success or error messages
        const isSuccess =
          resultText.includes("Accepted") ||
          resultText.includes("Success") ||
          resultText.includes("Output:") ||
          resultText.includes("Expected:") && resultText.includes("Output:") && !resultText.includes("Wrong Answer");

        const isError =
          resultText.includes("Error") ||
          resultText.includes("Wrong Answer") ||
          resultText.includes("Runtime Error") ||
          resultText.includes("Time Limit Exceeded");

        // Try to extract runtime and memory information
        const runtimeMatch = resultText.match(/Runtime:\s*([\d.]+\s*[a-z]+)/i);
        const memoryMatch = resultText.match(/Memory:\s*([\d.]+\s*[a-z]+)/i);

        const runtime = runtimeMatch ? runtimeMatch[1] : "";
        const memory = memoryMatch ? memoryMatch[1] : "";

        // Try to extract error details
        let errorMessage = "";
        if (isError) {
          // Look for specific error patterns
          const errorPatterns = [
            /Wrong Answer([\s\S]*?)(?=Runtime:|$)/i,
            /Runtime Error([\s\S]*?)(?=Runtime:|$)/i,
            /Time Limit Exceeded([\s\S]*?)(?=Runtime:|$)/i
          ];

          for (const pattern of errorPatterns) {
            const match = resultText.match(pattern);
            if (match && match[1]) {
              errorMessage = match[1].trim();
              break;
            }
          }

          // If no specific pattern matched, use a general approach
          if (!errorMessage) {
            // Try to extract the part between the error type and runtime info
            const errorStart = Math.max(
              resultText.indexOf("Wrong Answer"),
              resultText.indexOf("Runtime Error"),
              resultText.indexOf("Time Limit Exceeded")
            );

            if (errorStart !== -1) {
              const runtimeStart = resultText.indexOf("Runtime:");
              if (runtimeStart !== -1 && runtimeStart > errorStart) {
                errorMessage = resultText.substring(errorStart, runtimeStart).trim();
              } else {
                errorMessage = resultText.substring(errorStart).trim();
              }
            }
          }
        }

        return {
          status: isSuccess ? "success" : isError ? "error" : "unknown",
          message: resultText,
          errorDetails: errorMessage,
          runtime,
          memory,
        };
      }
    }

    // Try the alternative UI if the new UI didn't work
    const resultElement = document.querySelector(
      '[data-e2e-locator="console-result"]'
    );
    if (resultElement) {
      const result = resultElement.textContent.trim();

      // Check for success or error messages
      const isSuccess =
        result.includes("Accepted") || result.includes("Success");
      const isError =
        result.includes("Error") || result.includes("Wrong Answer");

      // Get detailed error message if available
      const errorDetails =
        document.querySelector(".text-red-60") ||
        document.querySelector(".text-red-s");
      const errorMessage = errorDetails ? errorDetails.textContent.trim() : "";

      // Get runtime and memory usage if available
      const runtimeElement = document.querySelector('div:contains("Runtime:")');
      const memoryElement = document.querySelector('div:contains("Memory:")');

      const runtime = runtimeElement ? runtimeElement.textContent.trim() : "";
      const memory = memoryElement ? memoryElement.textContent.trim() : "";

      return {
        status: isSuccess ? "success" : isError ? "error" : "unknown",
        message: result,
        errorDetails: errorMessage,
        runtime,
        memory,
      };
    }

    // Log that we couldn't find any results
    console.log("LeetCode AI Assistant - No submission results found");
    return null;
  } catch (error) {
    console.error("Error extracting submission results:", error);
    console.error("Error stack:", error.stack);
    return null;
  }
}

/**
 * Insert code into the LeetCode editor
 */
function insertCodeToEditor(code) {
  try {
    // Try multiple approaches to insert code into the editor

    // 1. Try to find the textarea and update its value
    const textareas = document.querySelectorAll("textarea");
    for (const textarea of textareas) {
      if (textarea.value && textarea.value.length > 0) {
        // Save the original value in case we need to restore it
        const originalValue = textarea.value;

        // Update the textarea value
        textarea.value = code;

        // Dispatch input event to trigger Monaco editor update
        const event = new Event("input", { bubbles: true });
        textarea.dispatchEvent(event);

        // If successful, return true
        return true;
      }
    }

    // 2. Try to use Monaco editor's model if available
    if (window.monaco && window.monaco.editor) {
      const editors = window.monaco.editor.getEditors();
      if (editors.length > 0) {
        const model = editors[0].getModel();
        if (model) {
          const fullRange = model.getFullModelRange();
          editors[0].executeEdits("extension", [
            {
              range: fullRange,
              text: code,
            },
          ]);
          return true;
        }
      }
    }

    // 3. Try to use document.execCommand as a fallback
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(document.createTextNode(code));
      return true;
    }

    // 4. Try to find the editor element and simulate typing
    const editorElement = document.querySelector(".monaco-editor");
    if (editorElement) {
      // Focus the editor
      editorElement.click();

      // Try to select all existing text (Ctrl+A)
      const selectAllEvent = new KeyboardEvent("keydown", {
        key: "a",
        code: "KeyA",
        ctrlKey: true,
        bubbles: true,
      });
      editorElement.dispatchEvent(selectAllEvent);

      // Simulate pasting the code
      const clipboardData = new DataTransfer();
      clipboardData.setData("text/plain", code);

      const pasteEvent = new ClipboardEvent("paste", {
        clipboardData: clipboardData,
        bubbles: true,
      });
      editorElement.dispatchEvent(pasteEvent);

      return true;
    }

    return false;
  } catch (error) {
    console.error("Error inserting code:", error);
    return false;
  }
}

/**
 * Shows a toast notification on the page
 */
function showNotification(message, type = "info") {
  // Check if notification container exists, if not create it
  let notificationContainer = document.getElementById(
    "leetcode-ai-notification-container"
  );
  if (!notificationContainer) {
    notificationContainer = document.createElement("div");
    notificationContainer.id = "leetcode-ai-notification-container";
    notificationContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 10px;
    `;
    document.body.appendChild(notificationContainer);
  }

  // Create notification element
  const notification = document.createElement("div");
  notification.className = `leetcode-ai-notification leetcode-ai-notification-${type}`;
  notification.style.cssText = `
    padding: 12px 16px;
    background-color: #333;
    color: white;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    margin-bottom: 10px;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    font-size: 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    max-width: 300px;
    animation: leetcodeAiSlideIn 0.3s ease;
    border-left: 4px solid #0a84ff;
  `;

  // Set border color based on notification type
  if (type === "success") {
    notification.style.borderColor = "#28a745";
  } else if (type === "error") {
    notification.style.borderColor = "#dc3545";
  } else if (type === "warning") {
    notification.style.borderColor = "#ffc107";
  }

  // Create notification content
  notification.innerHTML = `
    <div>${message}</div>
    <div class="leetcode-ai-notification-close" style="cursor: pointer; margin-left: 12px;">✕</div>
  `;

  // Add to container
  notificationContainer.appendChild(notification);

  // Add close button functionality
  const closeButton = notification.querySelector(
    ".leetcode-ai-notification-close"
  );
  closeButton.addEventListener("click", () => {
    notification.style.animation = "leetcodeAiSlideOut 0.3s ease forwards";
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  });

  // Auto remove after 5 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.style.animation = "leetcodeAiSlideOut 0.3s ease forwards";
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }
  }, 5000);

  // Add animation styles if not already added
  if (!document.getElementById("leetcode-ai-notification-styles")) {
    const style = document.createElement("style");
    style.id = "leetcode-ai-notification-styles";
    style.textContent = `
      @keyframes leetcodeAiSlideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes leetcodeAiSlideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }
}
