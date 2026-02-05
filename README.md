# Gemini Chat Exporter

A Chrome extension to export Google Gemini chat conversations to Markdown files.

## Features

- 📥 Export entire Gemini conversations to Markdown format
- 🔄 Handles long conversations with virtual scrolling
- 📝 Preserves message order (User/Gemini)
- 🌐 Supports Chinese and other Unicode characters in filenames
- 📋 Automatically uses conversation title for filename

## Installation

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the folder containing this extension

## Usage

1. Open a Gemini chat conversation at [gemini.google.com](https://gemini.google.com)
2. Click the extension icon in your browser toolbar
3. Click the "Download" button
4. Wait for the export to complete (may take 1-2 minutes for long conversations)
5. A `.md` file will be downloaded with your conversation

## File Structure

```
gemini-chat-exporter/
├── manifest.json      # Chrome extension manifest
├── popup.html         # Extension popup UI
├── popup.js           # Popup logic
├── popup.css          # Popup styles
├── content.js         # Main export logic
└── icons/             # Extension icons
```

## How It Works

1. The extension injects a content script into Gemini pages
2. When you click export, it scrolls through the entire conversation
3. Messages are collected during scrolling to handle virtual scrolling
4. Finally, all messages are converted to Markdown and downloaded

## Notes

- For very long conversations, the export may take 1-2 minutes
- The browser window will scroll automatically during export
- Make sure to stay on the Gemini tab during export

## License

MIT License
