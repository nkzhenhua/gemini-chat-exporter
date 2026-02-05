# Testing Guide - Gemini Chat Exporter

## Recent Updates (Latest)

### Issue 3: Insufficient Wait Time for Loading ✅ FIXED
**Problem**: Only waiting 1 second after scrolling wasn't enough for Gemini to load messages.

**Root Cause**: 
- 1 second wait time too short for slow networks or large message batches
- No detection of loading spinners
- Messages might still be loading when collection started

**Solution**:
- ✅ Increased wait time from 1s to 2s per scroll
- ✅ Added `waitForLoading()` function to detect loading spinners
- ✅ Waits up to 10 seconds for spinners to disappear before continuing
- ✅ More verbose console logs showing each step
- ✅ Final collection pass at 3 positions (top, middle, bottom)

---

## Previous Updates

### Issue 1: Missing User Messages ✅ FIXED
**Problem**: Only Gemini responses were being exported, user questions were missing.

**Root Cause**: Incorrect DOM selectors not matching Gemini's actual HTML structure.

**Solution**: 
- Completely rewrote `collectVisibleMessages()` with 4 different strategies
- Improved `isUserMessage()` with 6 different detection methods
- Added comprehensive debugging logs

### Issue 2: Filename Not Using Conversation Title ✅ FIXED
**Problem**: Downloaded files used timestamps instead of conversation title.

**Solution**:
- Added `getConversationTitle()` function with 4 fallback methods
- Updated `downloadMarkdown()` to sanitize title and use it as filename
- Filename format: `conversation-title.md` (or `gemini-chat-TIMESTAMP.md` as fallback)

---

## How to Test

### 1. Reload the Extension

Since we made significant changes:
1. Open `chrome://extensions/`
2. Find "Gemini Chat Exporter"
3. Click the **reload icon** (circular arrow)

### 2. Open Developer Console for Debugging

**IMPORTANT**: Open F12 console to see detailed logs!

1. Go to gemini.google.com
2. Press **F12** to open Developer Tools
3. Click on the **Console** tab
4. Open any conversation (short or long)
5. Click the extension icon
6. Click "Download Chat"

### 3. Watch the Console Logs

You should see detailed output like this:

```
Starting chat export...
Conversation title: How to learn JavaScript
Starting upward scroll and message collection...
[Collection] Using strategy: model-response-user-query, found 24 elements
[Message 1] User: How do I learn JavaScript?...
[Message 2] Gemini: JavaScript is a versatile programming language...
[Message 3] User: What are the best resources?...
[Message 4] Gemini: Here are some great resources for learning...
[Collection] This iteration: 2 user, 2 Gemini messages
Scroll attempt 1, collected 4 messages
[Collection] Using strategy: model-response-user-query, found 32 elements
[Collection] This iteration: 3 user, 5 Gemini messages
Scroll attempt 2, collected 12 messages
...
Scrolling complete. Attempted 5 times, collected 24 messages
Collected 24 messages in total
Downloading as: how-to-learn-javascript.md
```

### 4. Verify the Export

Check the downloaded file:

✅ **Filename**: Should be based on conversation title  
   Example: `how-to-learn-javascript.md`  
   Fallback: `gemini-chat-2026-02-04T22-57-19.md`

✅ **Content**: Open the file and verify:
   ```markdown
   # How to learn JavaScript
   
   Exported: 2/4/2026, 10:57:19 PM
   
   Total messages: 24
   
   ---
   
   ## User
   
   How do I learn JavaScript?
   
   ---
   
   ## Gemini
   
   JavaScript is a versatile programming language...
   
   ---
   
   ## User
   
   What are the best resources?
   
   ---
   ```

✅ **Message Count**: Should include BOTH user and Gemini messages

---

## Debugging Tips

### If still seeing issues:

1. **Check which strategy is being used**:
   Look for: `[Collection] Using strategy: XXX`
   - Best: `model-response-user-query`
   - Good: `data-message-author-role`
   - Fallback: `generic-divs`

2. **Check user vs Gemini counts**:
   Look for: `[Collection] This iteration: X user, Y Gemini messages`
   - Should see roughly equal numbers (or more Gemini if responses are longer)
   - If you see `0 user`, the detection is failing

3. **Check for detection warnings**:
   Look for: `[Detection] Unable to determine message type`
   - This means the user/Gemini detection failed
   - All ambiguous messages default to "Gemini"

4. **Copy the DOM structure**:
   If it's still not working, in console run:
   ```javascript
   // Find a user message element
   const userMsg = document.querySelector('user-query');
   console.log(userMsg);
   console.log(userMsg.outerHTML);
   
   // Find a Gemini response element  
   const geminiMsg = document.querySelector('model-response');
   console.log(geminiMsg);
   console.log(geminiMsg.outerHTML);
   ```
   
   Share this output so we can improve the selectors.

---

## Expected Behavior

### For Short Conversations (< 20 messages):
- Export should complete in 5-10 seconds
- All messages should be captured
- Filename should use conversation title

### For Long Conversations (> 50 messages):
- Export may take 30-60 seconds
- Console will show progress: "Scroll attempt X, collected Y messages"
- Should capture ALL messages (both user and Gemini)
- Filename should use conversation title or first user message

### For Very Long Conversations (> 100 messages):
- May take 1-2 minutes
- More scroll attempts will be shown
- Edge scrolling (top, bottom, middle) ensures complete coverage

---

## Known Limitations

1. **Gemini UI Changes**: If Google updates Gemini's HTML structure, selectors may need updating
2. **Very Short Titles**: Titles < 3 characters will use timestamp instead
3. **Special Characters**: Titles with special chars will be sanitized (e.g., `"How to: Learn JS?"` → `how-to-learn-js.md`)

---

## Success Criteria

✅ Downloaded file includes BOTH user questions AND Gemini responses  
✅ Filename uses conversation title (not timestamp)  
✅ Message count matches what's visible in the UI  
✅ All messages are in correct chronological order  
✅ Console logs show balanced user/Gemini counts  

---

## If It Still Doesn't Work

Please share:
1. Console logs (full output)
2. How many messages in the conversation
3. A screenshot of the Gemini chat page
4. Which strategy was used (from console)
5. User vs Gemini message counts (from console)

This will help debug any remaining issues!
