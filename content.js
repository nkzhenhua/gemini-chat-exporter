// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'exportChat') {
    exportChatToMarkdown()
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // 保持消息通道开放以进行异步响应
  }
});

async function exportChatToMarkdown() {
  try {
    console.log('Starting chat export...');
    
    // Get conversation title
    const title = getConversationTitle();
    console.log(`Conversation title: ${title}`);
    
    // Use improved scroll and collection strategy
    // Collect messages while scrolling to avoid loss from virtual scrolling
    const messages = await scrollAndCollectMessages();
    
    console.log(`Collected ${messages.length} messages in total`);
    
    // Convert to Markdown and download
    const markdown = convertToMarkdown(messages, title);
    downloadMarkdown(markdown, title);
  } catch (error) {
    console.error('Export failed:', error);
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
  
  // First scroll to bottom to trigger loading
  chatContainer.scrollTop = chatContainer.scrollHeight;
  await sleep(1500);
  await waitForLoading();
  
  // Scroll from bottom to top to load all content
  let currentScrollPos = chatContainer.scrollHeight;
  let attempts = 0;
  const maxAttempts = 200;
  
  while (currentScrollPos > 0 && attempts < maxAttempts) {
    currentScrollPos = Math.max(0, currentScrollPos - scrollStep);
    chatContainer.scrollTop = currentScrollPos;
    await sleep(300);
    attempts++;
    
    // Update total height in case more content loaded
    if (chatContainer.scrollHeight > totalHeight) {
      totalHeight = chatContainer.scrollHeight;
      console.log(`[Load] Height updated to ${totalHeight}`);
    }
    
    if (attempts % 20 === 0) {
      console.log(`[Load] Scroll position: ${currentScrollPos}/${totalHeight}`);
    }
  }
  
  // Wait for any final loading
  await waitForLoading();
  console.log('Phase 1 complete: All content should be loaded.');
  
  // ========== PHASE 2: Collect in order from top to bottom ==========
  console.log('Phase 2: Collecting messages in order from top to bottom...');
  
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
  
  while (currentScrollPos <= totalHeight && attempts < maxAttempts) {
    chatContainer.scrollTop = currentScrollPos;
    await sleep(250);
    
    const newCount = collectInOrder();
    if (newCount > 0) {
      console.log(`[Collect] Position: ${currentScrollPos}, Found ${newCount} new. Total: ${orderedMessages.length}`);
    }
    
    currentScrollPos += scrollStep;
    attempts++;
  }
  
  // Final collection at bottom
  chatContainer.scrollTop = chatContainer.scrollHeight;
  await sleep(300);
  collectInOrder();
  
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
