# Testing Guide - Gemini Chat Exporter

## Current Version: v1.1.1

All major features implemented and tested:
- ✅ Rich Markdown export with formatting
- ✅ Real-time progress tracking
- ✅ On-page progress overlay
- ✅ Cancel functionality
- ✅ Two-phase scroll strategy
- ✅ Auto-recovery from errors
- ✅ Batch delete conversations

---

## Quick Test (5 minutes)

### Basic Functionality
1. Reload extension at `chrome://extensions/`
2. Go to gemini.google.com
3. Open any conversation (10-20 messages recommended)
4. Press F12 to open Console
5. Click extension icon → "Download Chat"
6. Watch progress overlay (bottom-right)
7. Wait for completion
8. Check downloaded `.md` file

**Expected Result**:
- ✅ Progress bar shows 0% → 100%
- ✅ Phase changes (1/2 → 2/2)
- ✅ Green success message with stats
- ✅ File downloads with conversation title
- ✅ Markdown has lists, headings, bold text

---

## Comprehensive Test Scenarios

### Test 1: Short Conversation (< 20 messages)

**Steps**:
1. Export a 5-10 message conversation
2. Observe progress in overlay

**Expected**:
- Duration: ~5-10 seconds
- File size: < 10KB
- All messages present
- Proper formatting

**Console Output**:
```
Starting chat export...
Conversation title: [title]
Phase 1: Scrolling through conversation...
Phase 2: Collecting messages in order...
Collected 10 messages in total
Downloading as: [title].md
```

### Test 2: Medium Conversation (20-100 messages)

**Steps**:
1. Export a ~50 message conversation
2. Can close popup during export
3. Watch on-page overlay

**Expected**:
- Duration: ~20-40 seconds
- Progress updates smoothly
- Message count increases
- File includes all messages

### Test 3: Long Conversation (100+ messages)

**Steps**:
1. Export 100+ message conversation
2. Monitor console for scroll attempts
3. Verify final message count

**Expected**:
- Duration: ~60-120 seconds
- Multiple scroll attempts logged
- All messages captured
- Proper chronological order

**Console Monitoring**:
```
[Load] Scroll position: 15000/48188
[Collect] Position: 25000, Found 50 new. Total: 125
```

### Test 4: Rich Formatting

**Setup**: Find a conversation with:
- Bullet lists
- Numbered lists
- Headings
- Code blocks
- Bold/italic text

**Steps**:
1. Export the conversation
2. Open `.md` file in VS Code or Obsidian
3. Check formatting renders correctly

**Expected Markdown**:
```markdown
## Section Title

Some text here.

- Bullet point 1
- Bullet point 2
  - Nested item
  - Another nested item

1. First numbered item
2. Second numbered item

**Bold text** and *italic text*

Inline `code` example

```python
def example():
    return "Code block"
```
```

### Test 5: Cancel Functionality

**Test 5a: Cancel During Phase 1**
1. Start export on long conversation
2. Wait ~5 seconds (should be in Phase 1)
3. Click "Cancel" button
4. Verify orange cancellation message
5. Check no file was downloaded

**Test 5b: Cancel During Phase 2**
1. Start export
2. Wait until "Phase 2/2" appears
3. Click "Cancel"
4. Same verification as 5a

**Expected**:
- Immediate response (< 500ms)
- Orange "Export Cancelled" message
- Auto-hide after 5 seconds
- No partial file download

### Test 6: Progress Display with Closed Popup

**Steps**:
1. Click export
2. Immediately close popup window
3. Watch on-page overlay
4. Wait for completion

**Expected**:
- Progress continues without popup
- Overlay shows all updates
- Success message appears on page
- File downloads normally

### Test 7: Error Recovery

**Test 7a: Connection Error**
1. Open new conversation (no content script)
2. Click export immediately
3. Should see auto-refresh message

**Test 7b: Invalid Page**
1. Go to non-Gemini page
2. Icon should be grayscale
3. Tooltip: "Available on Gemini pages"

### Test 8: Unicode and Special Characters

**Steps**:
1. Export conversation with:
   - Chinese characters
   - Emoji 😊
   - Special symbols (★, ©, ™)
   - Math symbols (∑, ∫, ≈)

**Expected**:
- All characters preserved
- Filename sanitized but readable
- Content displays correctly

### Test 9: Edge Cases

**Test 9a: Very Short Title**
- Conversation title: "Hi"
- Expected filename: `hi.md` or fallback to timestamp

**Test 9b: Special Chars in Title**
- Title: "How to: Learn JS? (2024)"
- Expected: `how-to-learn-js-2024.md`

**Test 9c: Empty Conversation**
- New conversation with no messages
- Should export with 0 messages

**Test 9d: Code-Heavy Conversation**
- Many code blocks
- Should preserve all code with language tags

---

## Performance Benchmarks

| Messages | Expected Time | File Size |
|----------|---------------|-----------|
| 10       | 5-10 sec     | < 5 KB    |
| 50       | 20-30 sec    | 10-30 KB  |
| 100      | 40-60 sec    | 30-100 KB |
| 200+     | 60-120 sec   | 100-300 KB|

---

## Console Log Patterns

### Successful Export
```
Starting chat export...
Conversation title: Investment Advice
Phase 1: Scrolling through conversation to load all content...
[Load] Height updated to 48188
[Load] Scroll position: 24000/48188
Phase 1 complete: All content should be loaded.
Phase 2: Collecting messages in order from top to bottom...
[Collect] Position: 0, Found 50 new. Total: 50
[Collect] Position: 5000, Found 30 new. Total: 80
✓ Collection complete. Total messages: 127
Collected 127 messages in total
Downloading as: investment-advice.md
```

### Cancelled Export
```
Starting chat export...
Phase 1: Scrolling through conversation...
[Load] Scroll position: 12000/48188
Export cancelled during Phase 1
```

### Error Scenario
```
Starting chat export...
Error: Could not establish connection. Receiving end does not exist.
(Auto-recovery: page refresh initiated)
```

---

## Known Issues & Workarounds

### Issue: Progress bar stuck at 45%

**Cause**: Waiting for loading spinners to disappear  
**Solution**: Wait up to 10 seconds; if truly stuck, cancel and retry  
**Prevention**: Planned timeout improvements in v1.1

### Issue: Missing some messages

**Cause**: Virtual scrolling or very fast scrolling  
**Solution**: The two-phase approach should minimize this  
**Verification**: Check console for "Found X new" messages

### Issue: "Content script not ready"

**Cause**: Extension loaded after page loaded  
**Solution**: Auto-refresh feature handles this  
**Manual**: Refresh page and try again

---

## Regression Testing Checklist

Before releasing updates, test:

- [ ] Short conversation (10 messages)
- [ ] Long conversation (100+ messages)
- [ ] Cancel during Phase 1
- [ ] Cancel during Phase 2
- [ ] Close popup during export
- [ ] Rich formatting (lists, headings, code)
- [ ] Unicode characters (中文, emoji)
- [ ] Special chars in title
- [ ] Connection error recovery
- [ ] Grayscale icon on non-Gemini pages

### Batch Delete
- [ ] Enter/Exit batch delete mode
- [ ] Checkboxes appear only under "Chats" heading
- [ ] Individual checkbox toggle works
- [ ] Select All / Deselect All
- [ ] Delete with confirmation dialog
- [ ] Progress bar during deletion
- [ ] Exit mode cleans up all UI elements

---

## User Acceptance Criteria

✅ **Functional**:
- All messages exported (user + Gemini)
- Formatting preserved (lists, headings, bold)
- Correct chronological order
- File named with conversation title
- Batch delete removes selected conversations

✅ **UX**:
- Real-time progress visible
- Can close popup safely
- Clear success/error messages
- Cancel works reliably
- Batch delete checkboxes only under "Chats"
- No native Gemini dialogs visible during batch delete

✅ **Performance**:
- < 30 seconds for typical conversations
- Progress updates every few seconds
- No browser freezing
- Batch delete processes sequentially without rate-limit errors

✅ **Reliability**:
- No data loss
- Handles errors gracefully
- Works with very long conversations
- Batch delete reports partial failures

---

## Automated Testing (Future)

Currently manual testing only. Potential automation:
- **Unit tests**: Markdown conversion functions
- **Integration tests**: Mock DOM and test collection
- **E2E tests**: Puppeteer with test Gemini account

---

## Bug Report Template

When reporting issues:

```markdown
**Environment**:
- Browser: Chrome/Edge/Brave [version]
- Extension version: 1.0.0
- OS: Windows/Mac/Linux

**Conversation Details**:
- Approximate message count: 
- Conversation topic:
- Special elements: code/lists/tables/images

**Expected Behavior**:
[What should happen]

**Actual Behavior**:
[What actually happened]

**Console Logs**:
[Copy from F12 console]

**Screenshots**:
[If applicable]

**Steps to Reproduce**:
1. 
2. 
3. 
```

---

## Success Metrics

All features working as of v1.0.0:

| Feature | Status | Test Coverage |
|---------|--------|---------------|
| Markdown export | ✅ | High |
| Lists & formatting | ✅ | High |
| Progress tracking | ✅ | High |
| Cancel support | ✅ | Medium |
| Error recovery | ✅ | Medium |
| Long conversations | ✅ | High |
| Unicode support | ✅ | High |

**Overall Quality**: Production-ready ✅

---

## Next Steps After Testing

1. If all tests pass → Prepare screenshots for Store
2. If issues found → Log in GitHub Issues
3. Minor bugs → Fix in v1.0.1
4. Major bugs → Block publication

**Current Status**: Ready for Chrome Web Store submission 🚀
