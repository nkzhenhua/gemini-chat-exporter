// Global flag for cancellation
let exportCancelled = false;

// Progress reporting function
function reportProgress(phase, detail, percent, messageCount) {
  try {
    chrome.runtime.sendMessage({
      type: 'exportProgress',
      phase: phase,
      detail: detail,
      percent: percent,
      messageCount: messageCount
    }, () => {
      // Ignore errors if popup is closed
      if (chrome.runtime.lastError) {
        // Silently ignore - popup might be closed
      }
    });
  } catch (error) {
    // Silently fail - don't block the export
    console.log('Progress report failed (popup may be closed):', error);
  }
  
  // Also update on-page overlay
  updateOnPageProgress(phase, detail, percent, messageCount);
}

// Create on-page progress overlay
function createProgressOverlay() {
  // Remove existing overlay if any
  const existing = document.getElementById('gemini-export-overlay');
  if (existing) {
    existing.remove();
  }
  
  const overlay = document.createElement('div');
  overlay.id = 'gemini-export-overlay';
  overlay.innerHTML = `
    <div style="
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 320px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 12px;
      padding: 16px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      z-index: 999999;
      font-family: 'Segoe UI', sans-serif;
      color: white;
    ">
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
        <div style="font-size: 24px;">⚠️</div>
        <div style="flex: 1;">
          <div style="font-weight: 600; font-size: 14px;">Exporting Chat</div>
          <div style="font-size: 11px; opacity: 0.9;">Don't close or refresh this tab</div>
        </div>
        <button id="gemini-export-cancel" style="
          background: rgba(255, 255, 255, 0.25);
          border: 1px solid rgba(255, 255, 255, 0.4);
          color: white;
          padding: 6px 12px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
          transition: all 0.2s;
        ">Cancel</button>
      </div>
      
      <div style="
        width: 100%;
        height: 6px;
        background: rgba(0, 0, 0, 0.2);
        border-radius: 3px;
        overflow: hidden;
        margin-bottom: 8px;
      ">
        <div id="gemini-export-bar" style="
          height: 100%;
          background: linear-gradient(90deg, #4CAF50, #8BC34A);
          border-radius: 3px;
          transition: width 0.3s ease;
          width: 0%;
          box-shadow: 0 0 8px rgba(76, 175, 80, 0.5);
        "></div>
      </div>
      
      <div id="gemini-export-phase" style="font-size: 13px; font-weight: 600; margin-bottom: 4px;">
        Initializing...
      </div>
      <div id="gemini-export-detail" style="font-size: 12px; opacity: 0.9; margin-bottom: 4px;">
      </div>
      <div id="gemini-export-count" style="font-size: 12px; opacity: 0.85;">
      </div>
    </div>
  `;
  
  document.body.appendChild(overlay);
  
  // Add cancel button handler
  const cancelBtn = document.getElementById('gemini-export-cancel');
  cancelBtn.addEventListener('click', () => {
    exportCancelled = true;
    overlay.innerHTML = `
      <div style="
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 320px;
        background: linear-gradient(135deg, #FF9800, #FF5722);
        border-radius: 12px;
        padding: 16px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        z-index: 999999;
        font-family: 'Segoe UI', sans-serif;
        color: white;
      ">
        <div style="display: flex; align-items: flex-start; gap: 12px;">
          <div style="font-size: 28px;">🚫</div>
          <div style="flex: 1;">
            <div style="font-weight: 600; font-size: 15px; margin-bottom: 6px;">Export Cancelled</div>
            <div style="font-size: 12px;">Export was stopped by user</div>
          </div>
          <button onclick="this.closest('div').parentElement.remove()" style="
            background: rgba(255, 255, 255, 0.2);
            border: none;
            color: white;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            cursor: pointer;
            font-size: 18px;
          ">×</button>
        </div>
      </div>
    `;
    // Auto-hide after 5 seconds
    setTimeout(() => {
      const overlay = document.getElementById('gemini-export-overlay');
      if (overlay) {
        overlay.style.transition = 'opacity 0.5s ease';
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 500);
      }
    }, 5000);
  });
  
  return overlay;
}

// Update on-page progress
function updateOnPageProgress(phase, detail, percent, messageCount) {
  let overlay = document.getElementById('gemini-export-overlay');
  if (!overlay) {
    overlay = createProgressOverlay();
  }
  
  const bar = document.getElementById('gemini-export-bar');
  const phaseEl = document.getElementById('gemini-export-phase');
  const detailEl = document.getElementById('gemini-export-detail');
  const countEl = document.getElementById('gemini-export-count');
  
  if (bar) bar.style.width = percent + '%';
  if (phaseEl) phaseEl.textContent = phase || '';
  if (detailEl) detailEl.textContent = detail || '';
  if (countEl && messageCount !== undefined && messageCount > 0) {
    countEl.textContent = `Collected: ${messageCount} messages`;
  }
}

// Show success on page
function showOnPageSuccess(messageCount, userCount, geminiCount, filename, elapsed) {
  const overlay = document.getElementById('gemini-export-overlay');
  if (!overlay) return;
  
  overlay.innerHTML = `
    <div style="
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 320px;
      background: linear-gradient(135deg, #4CAF50, #66BB6A);
      border-radius: 12px;
      padding: 16px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      z-index: 999999;
      font-family: 'Segoe UI', sans-serif;
      color: white;
    ">
      <div style="display: flex; align-items: flex-start; gap: 12px;">
        <div style="font-size: 28px;">✅</div>
        <div style="flex: 1;">
          <div style="font-weight: 600; font-size: 15px; margin-bottom: 8px;">Export Successful!</div>
          <div style="font-size: 12px; line-height: 1.6;">
            • Messages: ${messageCount} (${userCount} user + ${geminiCount} Gemini)<br>
            • File: ${filename}<br>
            • Time: ${elapsed}s
          </div>
        </div>
        <button onclick="this.closest('div').parentElement.remove()" style="
          background: rgba(255, 255, 255, 0.2);
          border: none;
          color: white;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 18px;
        ">×</button>
      </div>
    </div>
  `;
  
  // Auto-hide after 10 seconds
  setTimeout(() => {
    const overlay = document.getElementById('gemini-export-overlay');
    if (overlay) {
      overlay.style.transition = 'opacity 0.5s ease';
      overlay.style.opacity = '0';
      setTimeout(() => overlay.remove(), 500);
    }
  }, 10000);
}

// Show error on page
function showOnPageError(errorMessage) {
  const overlay = document.getElementById('gemini-export-overlay');
  if (!overlay) return;
  
  overlay.innerHTML = `
    <div style="
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 320px;
      background: linear-gradient(135deg, #ef5350, #e57373);
      border-radius: 12px;
      padding: 16px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      z-index: 999999;
      font-family: 'Segoe UI', sans-serif;
      color: white;
    ">
      <div style="display: flex; align-items: flex-start; gap: 12px;">
        <div style="font-size: 28px;">❌</div>
        <div style="flex: 1;">
          <div style="font-weight: 600; font-size: 15px; margin-bottom: 6px;">Export Failed</div>
          <div style="font-size: 12px;">${errorMessage}</div>
        </div>
        <button onclick="this.closest('div').parentElement.remove()" style="
          background: rgba(255, 255, 255, 0.2);
          border: none;
          color: white;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 18px;
        ">×</button>
      </div>
    </div>
  `;
}

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'exportChat') {
    exportChatToMarkdown()
      .then((result) => sendResponse({ 
        success: true,
        messageCount: result.messageCount,
        userCount: result.userCount,
        geminiCount: result.geminiCount,
        filename: result.filename
      }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // 保持消息通道开放以进行异步响应
  }
});

async function exportChatToMarkdown() {
  const startTime = Date.now();
  exportCancelled = false; // Reset cancellation flag
  try {
    console.log('Starting chat export...');
    reportProgress('Starting export...', 'Initializing', 0, 0);
    
    // Get conversation title
    const title = getConversationTitle();
    console.log(`Conversation title: ${title}`);
    
    // Use improved scroll and collection strategy
    // Collect messages while scrolling to avoid loss from virtual scrolling
    const messages = await scrollAndCollectMessages();
    
    // Check if cancelled after scrolling
    if (exportCancelled) {
      throw new Error('Export cancelled by user');
    }
    
    console.log(`Collected ${messages.length} messages in total`);
    
    // Count user vs Gemini messages
    let userCount = 0;
    let geminiCount = 0;
    messages.forEach(msg => {
      if (msg.author === 'User') userCount++;
      else geminiCount++;
    });
    
    // Convert to Markdown and download
    reportProgress('Generating file...', 'Creating markdown', 95, messages.length);
    const markdown = convertToMarkdown(messages, title);
    downloadMarkdown(markdown, title);
    
    reportProgress('Complete!', 'File downloaded', 100, messages.length);
    
    // Calculate elapsed time from function start
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    
    // Show success on page
    showOnPageSuccess(messages.length, userCount, geminiCount, title + '.md', elapsed);
    
    return {
      messageCount: messages.length,
      userCount: userCount,
      geminiCount: geminiCount,
      filename: title + '.md'
    };
  } catch (error) {
    console.error('Export failed:', error);
    showOnPageError(error.message || 'Unknown error occurred');
    throw error;
  }
}

async function scrollAndCollectMessages() {
  // CRITICAL: Find the MAIN scroll container for the chat history!
  // Based on user's debug output:
  //   INFINITE-SCROLLER.chat-history: scroll=22830, client=160  ← THIS is the scroll container!
  
  let chatContainer = null;
  
  // Strategy 1: Look for infinite-scroller.chat-history (THE MAIN SCROLL CONTAINER!)
  const infiniteScroller = document.querySelector('infinite-scroller.chat-history');
  if (infiniteScroller && infiniteScroller.scrollHeight > infiniteScroller.clientHeight) {
    chatContainer = infiniteScroller;
    console.log('[Container] ✓ Found infinite-scroller.chat-history!');
    console.log(`[Container] scrollHeight: ${chatContainer.scrollHeight}, clientHeight: ${chatContainer.clientHeight}`);
  }
  
  // Strategy 2: Look for any infinite-scroller with scroll
  if (!chatContainer) {
    const allScrollers = document.querySelectorAll('infinite-scroller');
    for (const scroller of allScrollers) {
      if (scroller.scrollHeight > scroller.clientHeight + 100) {
        chatContainer = scroller;
        console.log('[Container] Found infinite-scroller with scroll');
        break;
      }
    }
  }
  
  // Strategy 3: Find any scrollable element containing messages
  if (!chatContainer) {
    const allElements = document.querySelectorAll('*');
    for (const el of allElements) {
      if (el.scrollHeight > el.clientHeight + 100) {
        if (el.querySelector('user-query, model-response, .conversation-container')) {
          chatContainer = el;
          console.log('[Container] Found scrollable element with messages');
          break;
        }
      }
    }
  }
  
  // Strategy 4: Use window scroll (document.documentElement)
  if (!chatContainer) {
    console.warn('[WARNING] Using document.documentElement for scrolling');
    chatContainer = document.documentElement;
  }
  
  // The search container is the same as the scroll container for infinite-scroller
  const searchContainer = chatContainer;
  
  console.log(`[Container] Using: ${chatContainer.tagName}.${(chatContainer.className || '').split(' ')[0]}`);
  console.log(`[Container] scrollHeight: ${chatContainer.scrollHeight}, clientHeight: ${chatContainer.clientHeight}`);
  
  // Store all collected messages (use Map to avoid duplicates)
  const messagesMap = new Map();
  
  // Global order counter - increments as we scroll from top to bottom
  let globalOrderCounter = 0;
  
  console.log('Starting scroll and collection process...');
  console.log('TIP: For very long conversations, this may take 1-2 minutes. Please wait...');
  
  // Calculate viewport height for incremental scrolling
  const viewportHeight = chatContainer.clientHeight || 500;
  let totalHeight = chatContainer.scrollHeight;
  const scrollStep = Math.max(100, viewportHeight * 0.5); // Scroll half viewport at a time
  
  console.log(`Total height: ${totalHeight}, Viewport: ${viewportHeight}, Step: ${scrollStep}`);
  
  // ========== PHASE 1: Scroll to load all content ==========
  console.log('Phase 1: Scrolling through conversation to load all content...');
  reportProgress('Phase 1/2: Loading content', 'Scrolling to bottom...', 5, 0);
  
  // First scroll to bottom to trigger loading
  chatContainer.scrollTop = chatContainer.scrollHeight;
  await sleep(1500);
  await waitForLoading();
  
  // Scroll from bottom to top to load all content
  let currentScrollPos = chatContainer.scrollHeight;
  let attempts = 0;
  const maxAttempts = 200;
  
  while (currentScrollPos > 0 && attempts < maxAttempts && !exportCancelled) {
    currentScrollPos = Math.max(0, currentScrollPos - scrollStep);
    chatContainer.scrollTop = currentScrollPos;
    await sleep(300);
    attempts++;
    
    // Update total height in case more content loaded
    if (chatContainer.scrollHeight > totalHeight) {
      totalHeight = chatContainer.scrollHeight;
      console.log(`[Load] Height updated to ${totalHeight}`);
    }
    
    if (attempts % 10 === 0) {
      const progress = Math.round((1 - currentScrollPos / totalHeight) * 40) + 5; // 5-45%
      reportProgress('Phase 1/2: Loading content', `Scrolling (${attempts}/${maxAttempts})`, progress, 0);
      console.log(`[Load] Scroll position: ${currentScrollPos}/${totalHeight}`);
    }
  }
  
  // Check if cancelled
  if (exportCancelled) {
    console.log('Export cancelled during Phase 1');
    return [];
  }
  
  // Wait for any final loading
  await waitForLoading();
  reportProgress('Phase 1/2: Complete', 'All content loaded', 45, 0);
  console.log('Phase 1 complete: All content should be loaded.');
  
  // ========== PHASE 2: Collect in order from top to bottom ==========
  console.log('Phase 2: Collecting messages in order from top to bottom...');
  reportProgress('Phase 2/2: Collecting messages', 'Starting from top...', 50, 0);
  
  // Scroll to top first
  chatContainer.scrollTop = 0;
  await sleep(500);
  
  // Use an ordered list instead of Map to maintain collection order
  const orderedMessages = [];
  const seenKeys = new Set();
  
  // Helper to collect currently visible messages and add new ones to orderedMessages
  function collectInOrder() {
    let messageElements = [];
    
    // Find user-query and model-response elements
    const modelResponses = searchContainer.querySelectorAll('model-response');
    const userQueries = searchContainer.querySelectorAll('user-query');
    
    if (modelResponses.length > 0 || userQueries.length > 0) {
      messageElements = [...Array.from(userQueries), ...Array.from(modelResponses)];
      // Sort by DOM position
      messageElements.sort((a, b) => {
        if (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) {
          return -1;
        }
        return 1;
      });
    }
    
    let newCount = 0;
    messageElements.forEach((element) => {
      try {
        const content = extractMessageContent(element);
        if (!content.trim() || content.trim().length < 5) return;
        
        const cleanContent = content.trim().replace(/\s+/g, ' ');
        const key = `${cleanContent.substring(0, 200)}_${cleanContent.length}`;
        
        if (seenKeys.has(key)) return;
        seenKeys.add(key);
        
        const isUser = isUserMessage(element);
        const author = isUser ? 'User' : 'Gemini';
        
        orderedMessages.push({
          author: author,
          content: content.trim(),
          key: key
        });
        newCount++;
      } catch (error) {
        console.warn('Error extracting message:', error);
      }
    });
    
    return newCount;
  }
  
  // Scroll from top to bottom, collecting in order
  totalHeight = chatContainer.scrollHeight;
  currentScrollPos = 0;
  attempts = 0;
  
  while (currentScrollPos <= totalHeight && attempts < maxAttempts && !exportCancelled) {
    chatContainer.scrollTop = currentScrollPos;
    await sleep(250);
    
    const newCount = collectInOrder();
    if (newCount > 0) {
      console.log(`[Collect] Position: ${currentScrollPos}, Found ${newCount} new. Total: ${orderedMessages.length}`);
    }
    
    // Report progress every 5 attempts
    if (attempts % 5 === 0) {
      const progress = Math.round((currentScrollPos / totalHeight) * 40) + 50; // 50-90%
      reportProgress('Phase 2/2: Collecting messages', `Position: ${currentScrollPos}/${totalHeight}`, progress, orderedMessages.length);
    }
    
    currentScrollPos += scrollStep;
    attempts++;
  }
  
  // Check if cancelled
  if (exportCancelled) {
    console.log('Export cancelled during Phase 2');
    return [];
  }
  
  // Final collection at bottom
  chatContainer.scrollTop = chatContainer.scrollHeight;
  await sleep(300);
  collectInOrder();
  
  reportProgress('Phase 2/2: Complete', 'All messages collected', 90, orderedMessages.length);
  console.log(`✓ Collection complete. Total messages: ${orderedMessages.length}`);
  
  return orderedMessages;
}

// Wait for any loading indicators to disappear
async function waitForLoading(maxWait = 30000) {  // Increased timeout to 30 seconds
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWait) {
    // Check for common loading indicators
    const spinners = document.querySelectorAll('[role="progressbar"], .loading, .spinner, [class*="loading"], [class*="spinner"]');
    
    // If no spinners found, we're done
    if (spinners.length === 0) {
      return;
    }
    
    // Check if any spinners are visible
    let hasVisibleSpinner = false;
    spinners.forEach(spinner => {
      const style = window.getComputedStyle(spinner);
      if (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0') {
        hasVisibleSpinner = true;
      }
    });
    
    if (!hasVisibleSpinner) {
      return;
    }
    
    // Still loading, wait a bit
    await sleep(200);
  }
  
  // Timeout reached, continue anyway
  console.log('[waitForLoading] Timeout reached, continuing...');
}

function collectVisibleMessages(messagesMap, chatContainer) {
  // CRITICAL: Only search within the chat container (main area), NOT the entire page!
  // This prevents collecting from the sidebar chat list
  
  if (!chatContainer) {
    console.error('[Collection] No chat container provided!');
    return;
  }
  
  let messageElements = [];
  let strategy = '';
  
  // Strategy 1: Look for conversation turn containers (most reliable)
  // Search ONLY within chatContainer, not the entire document!
  const turnContainers = chatContainer.querySelectorAll('[data-test-id*="conversation"], [class*="conversation-turn"], [class*="turn-container"]');
  if (turnContainers.length > 0) {
    messageElements = Array.from(turnContainers);
    strategy = 'turn-containers';
  }
  
  // Strategy 2: Look for model-response and user-query elements
  if (messageElements.length === 0) {
    const modelResponses = chatContainer.querySelectorAll('model-response');
    const userQueries = chatContainer.querySelectorAll('user-query');
    if (modelResponses.length > 0 || userQueries.length > 0) {
      messageElements = [...Array.from(userQueries), ...Array.from(modelResponses)];
      // Sort by DOM position
      messageElements.sort((a, b) => {
        if (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) {
          return -1;
        }
        return 1;
      });
      strategy = 'model-response-user-query';
    }
  }
  
  // Strategy 3: Look for data attributes
  if (messageElements.length === 0) {
    messageElements = Array.from(chatContainer.querySelectorAll('[data-message-author-role]'));
    if (messageElements.length > 0) {
      strategy = 'data-message-author-role';
    }
  }
  
  // Strategy 4: Generic approach - find all divs with substantial content
  // But ONLY within chatContainer!
  if (messageElements.length === 0) {
    const allDivs = chatContainer.querySelectorAll('div');
    const candidates = Array.from(allDivs).filter(div => {
      // Must have text content
      const text = div.textContent?.trim() || '';
      if (text.length < 10) return false;
      
      // Should not be a container with many children
      if (div.children.length > 20) return false;
      
      // Exclude sidebar elements explicitly
      const classList = div.className.toLowerCase();
      if (classList.includes('sidebar') || classList.includes('chat-list') || classList.includes('nav')) {
        return false;
      }
      
      // Check if it looks like a message
      const hasText = div.querySelector('p, span, pre, code');
      return hasText !== null;
    });
    
    messageElements = candidates;
    strategy = 'generic-divs';
  }
  
  console.log(`[Collection] Using strategy: ${strategy}, found ${messageElements.length} elements`);
  
  let userCount = 0;
  let geminiCount = 0;
  
  messageElements.forEach((element) => {
    try {
      // Extract content first
      const content = extractMessageContent(element);
      if (!content.trim() || content.trim().length < 5) return;
      
      // Generate unique key based ONLY on content (not DOM index!)
      // Use first 200 chars + length as a reasonably unique key
      const cleanContent = content.trim().replace(/\s+/g, ' ');
      const key = `${cleanContent.substring(0, 200)}_${cleanContent.length}`;
      
      // Skip if already collected
      if (messagesMap.has(key)) return;
      
      // Determine message type
      const isUser = isUserMessage(element);
      const author = isUser ? 'User' : 'Gemini';
      
      if (isUser) userCount++;
      else geminiCount++;
      
      // Get element's position using compareDocumentPosition for stable ordering
      // We'll store the element reference for later sorting
      
      // Store message with element reference for DOM-based sorting
      messagesMap.set(key, {
        element: element,  // Keep reference for DOM ordering
        author: author,
        content: content.trim(),
        key: key
      });
      
      // Debug log for new messages
      console.log(`[NEW] ${author}: ${cleanContent.substring(0, 50)}...`);
    } catch (error) {
      console.warn('Error extracting message:', error);
    }
  });
  
  console.log(`[Collection] This iteration: ${userCount} user, ${geminiCount} Gemini messages. Total: ${messagesMap.size}`);
}

function getConversationTitle() {
  console.log('[Title] ===== Looking for conversation title =====');
  
  // Strategy 1: Look for the specific conversation-title element
  // <span class="conversation-title gds-title-m">平台型公司讨论</span>
  const selectors = [
    '.conversation-title',
    '[class*="conversation-title"]',
    '.gds-title-m',
    'span.gds-title-m',
    '.conversation-title-container span'
  ];
  
  for (const selector of selectors) {
    const elem = document.querySelector(selector);
    console.log(`[Title] Trying selector "${selector}":`, elem ? elem.textContent.trim() : 'NOT FOUND');
    
    if (elem) {
      const text = elem.textContent.trim();
      if (text && text.length >= 2) {
        console.log(`[Title] ✓ Found with "${selector}": "${text}"`);
        return text;
      }
    }
  }
  
  // Debug: Log all elements with "title" in class name
  const allTitleElements = document.querySelectorAll('[class*="title"]');
  console.log(`[Title] Found ${allTitleElements.length} elements with "title" in class:`);
  allTitleElements.forEach((el, i) => {
    if (i < 10) { // Limit to first 10
      console.log(`  [${i}] ${el.tagName}.${el.className}: "${el.textContent.trim().substring(0, 50)}"`);
    }
  });
  
  // Strategy 2: Use document.title as fallback
  console.log(`[Title] document.title = "${document.title}"`);
  if (document.title && document.title !== 'Gemini') {
    let title = document.title
      .replace(/\s*[-–—|:]\s*Gemini.*$/i, '')
      .replace(/^Gemini\s*[-–—|:]\s*/i, '')
      .trim();
    
    if (title && title.length >= 2 && title.toLowerCase() !== 'gemini') {
      console.log(`[Title] Using document.title: "${title}"`);
      return title;
    }
  }
  
  // Strategy 3: Fallback to first user message
  const firstUserQuery = document.querySelector('user-query');
  console.log(`[Title] user-query element:`, firstUserQuery ? 'FOUND' : 'NOT FOUND');
  if (firstUserQuery) {
    let text = firstUserQuery.textContent.trim()
      .replace(/\n+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    if (text && text.length > 3) {
      const title = text.substring(0, 60) + (text.length > 60 ? '...' : '');
      console.log(`[Title] Using first message: "${title}"`);
      return title;
    }
  }
  
  // Strategy 4: Use timestamp as last resort
  const timestamp = new Date().toISOString().slice(0, 16).replace('T', '-');
  const fallbackTitle = `gemini-chat-${timestamp}`;
  console.log(`[Title] ✗ Using fallback: "${fallbackTitle}"`);
  return fallbackTitle;
}

function convertToMarkdown(messages, title = 'Gemini Chat') {
  if (messages.length === 0) {
    console.warn('No messages found, trying to extract entire page content');
    const mainContent = document.querySelector('[role="main"]') || document.body;
    const allText = mainContent.innerText;
    return `# Gemini Chat History\n\nExported: ${new Date().toLocaleString('en-US')}\n\n---\n\n## Gemini Chat\n\n${allText}\n\n---\n\n`;
  }
  
  // Convert to Markdown format with title
  let markdown = `# ${title}\n\nExported: ${new Date().toLocaleString('en-US')}\n\nTotal messages: ${messages.length}\n\n---\n\n`;
  
  messages.forEach((msg, index) => {
    markdown += `## ${msg.author}\n\n${msg.content}\n\n---\n\n`;
  });
  
  return markdown;
}

function isUserMessage(element) {
  // Check 1: Element tag name
  const tagName = element.tagName?.toLowerCase();
  if (tagName === 'user-query') return true;
  if (tagName === 'model-response') return false;
  
  // Check 2: Data attributes
  const role = element.getAttribute('data-message-author-role') || 
               element.getAttribute('data-author') ||
               element.getAttribute('role') || '';
  if (role.toLowerCase().includes('user')) return true;
  if (role.toLowerCase().includes('model') || role.toLowerCase().includes('assistant')) return false;
  
  // Check 3: Class names
  const className = element.className || '';
  if (className.toLowerCase().includes('user-message') || 
      className.toLowerCase().includes('user-query')) return true;
  if (className.toLowerCase().includes('model-response') || 
      className.toLowerCase().includes('assistant')) return false;
  
  // Check 4: Check children for user-query or model-response tags
  const hasUserQuery = element.querySelector('user-query') !== null;
  const hasModelResponse = element.querySelector('model-response') !== null;
  if (hasUserQuery) return true;
  if (hasModelResponse) return false;
  
  // Check 5: Look for nested elements with data attributes
  const nestedUser = element.querySelector('[data-message-author-role*="user"], [data-author*="user"]');
  const nestedModel = element.querySelector('[data-message-author-role*="model"], [data-author*="model"], [data-author*="assistant"]');
  if (nestedUser) return true;
  if (nestedModel) return false;
  
  // Check 6: Look at parent elements
  const parent = element.closest('[data-message-author-role], user-query, model-response');
  if (parent) {
    if (parent.tagName?.toLowerCase() === 'user-query') return true;
    if (parent.tagName?.toLowerCase() === 'model-response') return false;
    const parentRole = parent.getAttribute('data-message-author-role') || '';
    if (parentRole.toLowerCase().includes('user')) return true;
    if (parentRole.toLowerCase().includes('model') || parentRole.toLowerCase().includes('assistant')) return false;
  }
  
  // Default: assume Gemini (safer to have false positives as Gemini than User)
  // Log this case for debugging
  console.log('[Detection] Unable to determine message type, defaulting to Gemini');
  return false;
}

function extractMessageContent(element) {
  // 创建元素副本以避免修改原始DOM
  const clone = element.cloneNode(true);
  
  // 移除不需要的元素（如按钮、图标等）
  const unwantedSelectors = [
    'button',
    '[role="button"]',
    '.action-button',
    '[class*="button"]',
    'svg:not([class*="code"])'
  ];
  
  unwantedSelectors.forEach(selector => {
    clone.querySelectorAll(selector).forEach(el => el.remove());
  });
  
  // 处理代码块
  const codeBlocks = clone.querySelectorAll('pre code, pre, [class*="code-block"]');
  codeBlocks.forEach(block => {
    const code = block.textContent;
    const language = block.className.match(/language-(\w+)/)?.[1] || '';
    block.textContent = `\n\`\`\`${language}\n${code}\n\`\`\`\n`;
  });
  
  // 获取文本内容
  let content = clone.textContent || clone.innerText || '';
  
  // 清理多余的空白
  content = content.replace(/\n{3,}/g, '\n\n').trim();
  
  return content;
}

function downloadMarkdown(content, title = 'gemini-chat') {
  // Create Blob
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  
  // Create download link
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  
  // Generate filename from title
  // Only remove characters that are invalid in filenames: \ / : * ? " < > |
  let filename = title
    .replace(/[\\/:*?"<>|]/g, '')  // Remove only invalid filename chars
    .replace(/\s+/g, '-')          // Replace spaces with hyphens
    .replace(/-+/g, '-')           // Replace multiple hyphens with single
    .replace(/^-+|-+$/g, '')       // Remove leading/trailing hyphens
    .substring(0, 100);            // Limit length
  
  // Add timestamp if filename is empty or too short
  if (!filename || filename.length < 2) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    filename = `gemini-chat-${timestamp}`;
  }
  
  a.download = `${filename}.md`;
  
  console.log(`Downloading as: ${a.download}`);
  
  // Trigger download
  document.body.appendChild(a);
  a.click();
  
  // Cleanup
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

console.log('Gemini Chat Exporter content script loaded');
