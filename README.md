# LeetCode AI Assistant

A Chrome extension that provides AI-powered assistance while solving LeetCode problems. It supports OpenAI and Google Gemini models, and offers hints, approach explanations, code solutions, debugging help, and optimization suggestions.

## Features

- Toolbar extension for LeetCode problem pages
- Popup UI with model selection and API key input
- Actions: Hint, Approach, Solution, Optimize, Debug, Explain
- Uses manifest icons and runtime `chrome.action.setIcon` for toolbar updates

## Project Structure

- `manifest.json` — Chrome extension manifest
- `background.js` — service worker handling AI requests and icon setup
- `popup.html` — extension popup UI
- `popup.css` — popup styling
- `popup.js` — popup behavior and messaging
- `content.js` — page content integration for LeetCode
- `assets/` — extension icons and static assets

## Getting Started

1. Clone or copy this repository locally.
2. Open Chrome and go to `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select this project folder.
5. Pin the extension icon if needed and open it from the toolbar.

## Important Notes

- Do not commit API keys or secrets. Keep them in a local file like `api_keys.md`, which is ignored by `.gitignore`.
- If the toolbar icon does not update immediately, reload the extension and restart Chrome.

## Push to GitHub

If this repository is not yet a Git repo, run:

```powershell
cd c:\all_project\LeetCode-AI-Assistant
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin main
```

If the repo is already initialized, use:

```powershell
git status
git add .
git commit -m "Update extension files"
git push
```

Replace `<your-username>` and `<repo-name>` with your GitHub username and repository name.
