# Gemini Chat Exporter

A Chrome extension to export Google Gemini chat conversations to beautifully formatted Markdown files with real-time progress tracking.

[![Chrome Web Store](https://img.shields.io/badge/Chrome-Web%20Store-blue)](https://chrome.google.com/webstore)
[![MIT License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

## ✨ Features

### 📝 Rich Markdown Export
- **Preserves formatting**: Lists (bullet & numbered), headings, bold, italic
- **Code blocks**: Syntax highlighting support with language tags
- **Proper structure**: Nested lists with correct indentation
- **Clean output**: Professional, readable Markdown files

### 📊 Real-Time Progress Tracking
- **Live progress bar** showing 0-100% completion
- **Phase indicators** (Phase 1: Loading → Phase 2: Collecting)
- **Message count updates** in real-time
- **On-page display** - floating overlay works even when popup is closed
- **Auto-positioning** - stays visible at bottom-right corner

### 🎮 Full User Control
- **Cancel anytime** - abort export mid-process with one click
- **Detailed statistics** on completion (message count, time taken, filename)
- **Clear feedback** for success, errors, and cancellations
- **Auto-recovery** from connection issues with page refresh

### 🔒 Privacy First
- **Zero data collection** - your conversations stay on your device
- **100% local processing** - no external servers involved
- **No tracking** - no analytics or telemetry
- **Open source** - inspect the code yourself

## 🚀 Installation

### From Chrome Web Store
*Coming soon - link will be added after publication*

### Manual Installation (Development)
1. Download or clone this repository
   ```bash
   git clone https://github.com/yourusername/gemini-exporter.git
   ```
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable **"Developer mode"** (toggle in top right)
4. Click **"Load unpacked"**
5. Select the `gemini-exporter` folder

## 📖 Usage

### Basic Export
1. Navigate to [gemini.google.com](https://gemini.google.com)
2. Open any conversation
3. Click the **Gemini Chat Exporter** icon in your browser toolbar
4. Click **"Download Chat"**
5. Watch the real-time progress
6. Get your beautifully formatted `.md` file

### Advanced Tips
- **Close popup freely** - Progress continues on the page itself
- **Cancel if needed** - Click the "Cancel" button on the progress overlay
- **Long conversations** - May take 1-2 minutes for 200+ messages
- **Export format** - Files are named using the conversation title

## 📸 Preview

### On-Page Progress Display
The extension shows a floating progress overlay on the Gemini page:
- Purple gradient background
- Real-time progress bar
- Phase and detail information
- Message count
- Cancel button

### Export Format Example

**Before (Gemini HTML):**
```
五、最终建议 不要被 LULU 的"低 PE"骗了...
```

**After (Exported Markdown):**
```markdown
## 五、最终建议

不要被 LULU 的"低 PE"骗了。在消费股里，低 PE 往往意味着"过气"。

回到你的投资组合（Amazon/Google/BABA/DIDI/JD）：

- 你已经有了足够的**"困境反转"**仓位（满滴、BABA）。
- 你不需要再加一个**"基本面正在恶化"**的美国消费股。

### 坚定的操作指令：

1. 忘记 LULU：让华尔街去博弈它的死活。
2. 买入安踏：在这个位置（13倍 PE），你买入的是一个正在上升期、拥有全球顶级资产组合...
```

## 🛠️ Technical Details

### Architecture
```
gemini-exporter/
├── manifest.json          # Extension manifest (v3)
├── background.js          # Tab detection for dynamic icon state
├── popup.html             # Extension popup UI
├── popup.js               # Popup logic & progress display
├── popup.css              # Popup styles
├── content.js             # Main export logic & markdown conversion
├── *.png                  # Extension icons (colored + grayscale)
├── PRIVACY.md             # Privacy policy
├── STORE_DESCRIPTION.md   # Chrome Web Store listing text
└── README.md              # This file
```

### How It Works

1. **Content Script Injection**: Runs on Gemini pages
2. **Phase 1 - Loading** (5-45%): Scrolls through conversation to load all messages
3. **Phase 2 - Collecting** (50-90%): Collects messages in chronological order
4. **HTML to Markdown** (90-95%): Converts DOM elements to formatted Markdown
5. **Download** (100%): Saves as `.md` file with conversation title

### Markdown Conversion

The extension intelligently converts HTML to Markdown:

| HTML Element | Markdown Output | Example |
|--------------|-----------------|---------|
| `<h1>` - `<h6>` | `#` - `######` | `## Heading` |
| `<ul><li>` | `- item` | `- List item` |
| `<ol><li>` | `1. item` | `1. Numbered item` |
| Nested `<ul>` | Indented | `  - Nested item` |
| `<strong>`, `<b>` | `**text**` | `**bold**` |
| `<em>`, `<i>` | `*text*` | `*italic*` |
| `<code>` (inline) | `` `code` `` | `` `function()` `` |
| `<pre><code>` | ` ```lang\n...``` ` | Code blocks |
| `<p>` | Double newline | Paragraphs |

### Browser Compatibility
- ✅ Chrome (v88+)
- ✅ Edge (Chromium)
- ✅ Brave
- ✅ Any Chromium-based browser

## ⚠️ Important Notes

### Performance
- **Long conversations (200+ messages)**: May take 1-2 minutes
- **Automatic scrolling**: The page scrolls during export
- **Memory usage**: ~10-20MB for typical conversations
- **Cancel anytime**: Use the Cancel button if you need to stop

### Limitations
- **Tables**: Not converted (rare in Gemini responses)
- **Images**: Cannot be embedded in Markdown
- **LaTeX**: Exported as plain text
- **Links**: Included but tracking parameters preserved

### Troubleshooting

**Extension icon is grayed out:**
- Make sure you're on `gemini.google.com`
- Refresh the page if needed

**"Content script not ready" error:**
- The extension auto-refreshes the page
- Click export again after refresh completes

**Export seems stuck:**
- Check the on-page progress overlay
- Use Cancel button if needed
- Very long conversations take longer

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Setup
```bash
# Clone repository
git clone https://github.com/yourusername/gemini-exporter.git
cd gemini-exporter

# Load in Chrome
# 1. Go to chrome://extensions/
# 2. Enable Developer mode
# 3. Click "Load unpacked"
# 4. Select this directory
```

### Testing
See [TESTING.md](TESTING.md) for detailed testing procedures.

## 📄 Documentation

- **[PRIVACY.md](PRIVACY.md)** - Privacy policy (no data collection)
- **[TECHNICAL-NOTES.md](TECHNICAL-NOTES.md)** - Technical implementation details
- **[TESTING.md](TESTING.md)** - Testing procedures and scenarios
- **[STORE_DESCRIPTION.md](STORE_DESCRIPTION.md)** - Chrome Web Store listing text
- **[PUBLICATION_READY.md](PUBLICATION_READY.md)** - Publication checklist

## 📜 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Bug Reports**: [GitHub Issues](https://github.com/yourusername/gemini-exporter/issues)
- **Feature Requests**: [GitHub Discussions](https://github.com/yourusername/gemini-exporter/discussions)
- **Privacy Policy**: [PRIVACY.md](PRIVACY.md)

## 🌟 Acknowledgments

Built for the Gemini community with ❤️

Special thanks to all contributors and users who provide feedback!

---

**Version**: 1.0.0  
**Last Updated**: February 2026  
**Status**: Ready for Chrome Web Store publication
