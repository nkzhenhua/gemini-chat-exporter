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
    const format = request.format || 'md';
    exportChat(format)
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

  // ========== Batch Delete Actions ==========
  if (request.action === 'enterBatchDeleteMode') {
    try {
      const result = enterBatchDeleteMode();
      sendResponse(result);
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
    return false;
  }

  if (request.action === 'exitBatchDeleteMode') {
    cleanupBatchDeleteMode();
    sendResponse({ success: true });
    return false;
  }

  if (request.action === 'getBatchDeleteStatus') {
    sendResponse({
      active: batchDeleteState.active,
      selectedCount: getSelectedCount()
    });
    return false;
  }

  if (request.action === 'batchSelectAll') {
    const selectAll = request.selectAll;
    const checkboxes = document.querySelectorAll('.gce-batch-checkbox');
    checkboxes.forEach(cb => { cb.checked = selectAll; });
    const count = selectAll ? checkboxes.length : 0;
    updateBatchToolbar(count);
    sendResponse({ success: true, selectedCount: count });
    return false;
  }

  if (request.action === 'batchDeleteSelected') {
    batchDeleteSelected()
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // async
  }
});

// ========================================================================
// BATCH DELETE FEATURE
// ========================================================================

const batchDeleteState = {
  active: false,
  deleting: false
};

// --- Named constants (avoids magic numbers) ---
const MIN_CONVERSATION_TITLE_LENGTH = 2;
const MAX_CONVERSATION_TITLE_LENGTH = 200;

// Delay constants for DOM interaction timing (ms)
const HOVER_DELAY_MS = 300;
const MENU_OPEN_DELAY_MS = 500;
const DIALOG_OPEN_DELAY_MS = 500;
const DELETE_ANIMATION_DELAY_MS = 800;
const BETWEEN_DELETIONS_DELAY_MS = 800;
const ESCAPE_CLOSE_DELAY_MS = 200;

function reportBatchStatus(data) {
  try {
    chrome.runtime.sendMessage({
      type: 'batchDeleteStatus',
      ...data
    }, () => {
      if (chrome.runtime.lastError) { /* popup may be closed */ }
    });
  } catch (e) {
    console.log('Batch status report failed:', e);
  }
}

// ===== Find sidebar conversation items =====
function findSidebarConversations() {
  let items = [];

  // Find the "Chats" heading in the sidebar to only get conversations below it
  // The sidebar has sections: New chat, My stuff, Gems, (recent), "Chats", (conversations)
  const sidebar = document.querySelector('nav, [role="navigation"], aside, [class*="sidebar"]');
  if (!sidebar) {
    console.warn('[BatchDelete] Could not find sidebar');
    return [];
  }

  // Strategy: Find the "Chats" text node and only get links that come AFTER it
  let chatsHeadingFound = false;
  let chatsHeadingElement = null;

  // Look for "Chats" heading text in the sidebar
  const allTextElements = sidebar.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, div');
  for (const el of allTextElements) {
    const text = el.textContent.trim();
    // Match "Chats" heading (direct text content, not deeply nested text)
    if (text === 'Chats' && el.children.length === 0) {
      chatsHeadingElement = el;
      chatsHeadingFound = true;
      console.log(`[BatchDelete] Found "Chats" heading: <${el.tagName.toLowerCase()}>`);
      break;
    }
  }

  if (!chatsHeadingFound) {
    console.warn('[BatchDelete] Could not find "Chats" heading in sidebar');
    // Fallback: try to find conversations by URL pattern, but exclude known non-chat links
    const allLinks = sidebar.querySelectorAll('a[href]');
    items = Array.from(allLinks).filter(a => {
      const href = a.getAttribute('href') || '';
      const text = a.textContent.trim();
      // Exclude known non-conversation items
      if (text.includes('New chat') || text.includes('My stuff') || text.includes('Gems')) return false;
      if (href.includes('settings') || href.includes('help') || href.includes('faq')) return false;
      if (text.length < MIN_CONVERSATION_TITLE_LENGTH || text.length > MAX_CONVERSATION_TITLE_LENGTH) return false;
      return true;
    });
    console.log(`[BatchDelete] Fallback: found ${items.length} conversations`);
    return items;
  }

  // Get all links in the sidebar
  const allLinks = Array.from(sidebar.querySelectorAll('a[href]'));
  
  // Filter to only links that appear AFTER the "Chats" heading in DOM order
  // We use compareDocumentPosition to check ordering
  items = allLinks.filter(a => {
    // Must come after the Chats heading
    const position = chatsHeadingElement.compareDocumentPosition(a);
    const isAfter = !!(position & Node.DOCUMENT_POSITION_FOLLOWING);
    if (!isAfter) return false;

    // Exclude only the "Settings & help" sidebar link, not conversations with "help" in title
    const text = a.textContent.trim();
    const href = a.getAttribute('href') || '';
    if (text === 'Settings & help' || text === 'Settings') return false;
    if (href.includes('settings') || href.includes('/faq')) return false;
    if (text.length < MIN_CONVERSATION_TITLE_LENGTH || text.length > MAX_CONVERSATION_TITLE_LENGTH) return false;

    return true;
  });

  console.log(`[BatchDelete] Found ${items.length} conversations under "Chats" heading`);
  return items;
}

// ===== Enter batch delete mode =====
function enterBatchDeleteMode() {
  if (batchDeleteState.active) {
    return { success: true, alreadyActive: true };
  }

  const conversations = findSidebarConversations();
  if (conversations.length === 0) {
    return { success: false, error: 'No conversations found in sidebar. Make sure the sidebar is open.' };
  }

  batchDeleteState.active = true;

  // Inject checkboxes into each conversation item
  conversations.forEach((conv, index) => {
    // Skip if already has checkbox
    if (conv.querySelector('.gce-batch-checkbox')) return;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'gce-batch-checkbox';
    checkbox.dataset.index = index;
    checkbox.style.cssText = `
      width: 18px;
      height: 18px;
      min-width: 18px;
      cursor: pointer;
      accent-color: #667eea;
      margin-right: 8px;
      flex-shrink: 0;
      position: relative;
      z-index: 10;
    `;

    // Stop mousedown from reaching the <a> tag (prevents navigation)
    checkbox.addEventListener('mousedown', (e) => {
      e.stopPropagation();
    });

    // Stop click from bubbling to <a> tag, but do NOT preventDefault
    // so the checkbox toggles naturally
    checkbox.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    // Update count when checkbox state changes
    checkbox.addEventListener('change', () => {
      const count = getSelectedCount();
      updateBatchToolbar(count);
      reportBatchStatus({ selectedCount: count });
    });

    // Make the conversation a flex container so checkbox sits nicely
    conv.style.display = 'flex';
    conv.style.alignItems = 'center';
    conv.insertBefore(checkbox, conv.firstChild);
  });

  // Create floating toolbar
  createBatchToolbar();

  // Inject styles
  injectBatchDeleteStyles();

  console.log(`[BatchDelete] Mode activated. ${conversations.length} conversations found.`);
  return { success: true, conversationCount: conversations.length };
}

// ===== Create floating toolbar =====
function createBatchToolbar() {
  // Remove existing
  const existing = document.getElementById('gce-batch-toolbar');
  if (existing) existing.remove();

  const toolbar = document.createElement('div');
  toolbar.id = 'gce-batch-toolbar';
  toolbar.innerHTML = `
    <div class="gce-toolbar-inner">
      <div class="gce-toolbar-left">
        <span class="gce-toolbar-count">0 selected</span>
      </div>
      <div class="gce-toolbar-right">
        <button class="gce-toolbar-btn gce-select-all-btn">Select All</button>
        <button class="gce-toolbar-btn gce-delete-btn" disabled>🗑️ Delete</button>
        <button class="gce-toolbar-btn gce-cancel-btn">✕ Exit</button>
      </div>
    </div>
  `;

  document.body.appendChild(toolbar);

  // Event handlers
  toolbar.querySelector('.gce-select-all-btn').addEventListener('click', () => {
    const btn = toolbar.querySelector('.gce-select-all-btn');
    const isSelectAll = btn.textContent === 'Select All';
    const checkboxes = document.querySelectorAll('.gce-batch-checkbox');
    checkboxes.forEach(cb => { cb.checked = isSelectAll; });
    btn.textContent = isSelectAll ? 'Deselect All' : 'Select All';
    const count = getSelectedCount();
    updateBatchToolbar(count);
    reportBatchStatus({ selectedCount: count });
  });

  toolbar.querySelector('.gce-delete-btn').addEventListener('click', () => {
    batchDeleteSelected();
  });

  toolbar.querySelector('.gce-cancel-btn').addEventListener('click', () => {
    cleanupBatchDeleteMode();
    reportBatchStatus({ exited: true });
  });
}

function updateBatchToolbar(count) {
  const toolbar = document.getElementById('gce-batch-toolbar');
  if (!toolbar) return;

  const countEl = toolbar.querySelector('.gce-toolbar-count');
  const deleteBtn = toolbar.querySelector('.gce-delete-btn');

  if (countEl) countEl.textContent = `${count} selected`;
  if (deleteBtn) {
    deleteBtn.textContent = `🗑️ Delete ${count > 0 ? count : ''}`;
    deleteBtn.disabled = count === 0;
  }
}

// ===== Get selected count =====
function getSelectedCount() {
  return document.querySelectorAll('.gce-batch-checkbox:checked').length;
}

// ===== Inject batch delete styles =====
// Loads CSS from a separate file via <link> for better maintainability (MV3 web_accessible_resources)
function injectBatchDeleteStyles() {
  if (document.getElementById('gce-batch-styles')) return;

  const link = document.createElement('link');
  link.id = 'gce-batch-styles';
  link.rel = 'stylesheet';
  link.type = 'text/css';
  link.href = chrome.runtime.getURL('batch-delete.css');
  document.head.appendChild(link);
}

// ===== Show confirmation dialog =====
function showDeleteConfirmation(count) {
  return new Promise((resolve) => {
    // Remove existing
    const existing = document.getElementById('gce-confirm-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'gce-confirm-overlay';
    overlay.innerHTML = `
      <div class="gce-confirm-dialog">
        <h3>🗑️ Delete ${count} Conversation${count > 1 ? 's' : ''}?</h3>
        <p>This will delete ${count} selected conversation${count > 1 ? 's' : ''} from your Gemini history.</p>
        <div class="gce-warning">⚠️ This cannot be undone</div>
        <div class="gce-confirm-buttons">
          <button class="gce-confirm-cancel">Cancel</button>
          <button class="gce-confirm-delete">Delete ${count}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('.gce-confirm-cancel').addEventListener('click', () => {
      overlay.remove();
      resolve(false);
    });

    overlay.querySelector('.gce-confirm-delete').addEventListener('click', () => {
      overlay.remove();
      resolve(true);
    });

    // Click outside to cancel
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
        resolve(false);
      }
    });
  });
}

// ===== Show deletion progress =====
function showDeleteProgress(current, total, convName) {
  let progress = document.getElementById('gce-delete-progress');
  if (!progress) {
    progress = document.createElement('div');
    progress.id = 'gce-delete-progress';
    progress.innerHTML = `
      <div class="gce-delete-progress-phase">Deleting conversations...</div>
      <div class="gce-delete-progress-detail"></div>
      <div class="gce-delete-progress-bar-bg">
        <div class="gce-delete-progress-bar"></div>
      </div>
    `;
    document.body.appendChild(progress);
  }

  const phase = progress.querySelector('.gce-delete-progress-phase');
  const detail = progress.querySelector('.gce-delete-progress-detail');
  const bar = progress.querySelector('.gce-delete-progress-bar');

  phase.textContent = `Deleting ${current}/${total}...`;
  detail.textContent = convName ? `"${convName}"` : '';
  bar.style.width = `${Math.round((current / total) * 100)}%`;
}

function hideDeleteProgress() {
  const progress = document.getElementById('gce-delete-progress');
  if (progress) {
    progress.querySelector('.gce-delete-progress-phase').textContent = '✅ Deletion complete';
    progress.querySelector('.gce-delete-progress-bar').style.width = '100%';
    progress.querySelector('.gce-delete-progress-bar').style.background = 'linear-gradient(90deg, #4CAF50, #8BC34A)';
    setTimeout(() => {
      if (progress.parentElement) {
        progress.style.transition = 'opacity 0.5s';
        progress.style.opacity = '0';
        setTimeout(() => progress.remove(), 500);
      }
    }, 3000);
  }
}

// ===== Simulate deleting a single conversation =====
async function simulateDeleteConversation(conversationElement) {
  // The conversationElement is an <a> tag in the sidebar.
  // We need to find the "..." menu button associated with it.
  
  // First, hover over the conversation to make the menu button visible
  conversationElement.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
  conversationElement.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
  await sleep(HOVER_DELAY_MS);

  // Look for the more options button ("...") - could be a sibling or child
  let moreBtn = null;
  const parent = conversationElement.closest('li') || conversationElement.parentElement;
  
  if (parent) {
    // Look for button with aria-label containing "more" or "options" or the three dot icon
    moreBtn = parent.querySelector('button[aria-label*="ore"], button[aria-label*="ption"], button[aria-label*="enu"], button[data-mat-icon-name*="more"], [class*="more"], [class*="option"]');
    
    if (!moreBtn) {
      // Try to find any button that's not clearly something else
      const buttons = parent.querySelectorAll('button');
      for (const btn of buttons) {
        const text = btn.textContent.trim().toLowerCase();
        const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase();
        // Skip the checkbox we injected
        if (btn.classList.contains('gce-batch-checkbox')) continue;
        // A menu button is usually small with an icon
        if (btn.offsetWidth < 50 || text.includes('more') || ariaLabel.includes('more') || text === '⋮' || text === '...') {
          moreBtn = btn;
          break;
        }
      }
    }
  }

  // Also try looking as a sibling
  if (!moreBtn) {
    const nextSibling = conversationElement.nextElementSibling;
    if (nextSibling && (nextSibling.tagName === 'BUTTON' || nextSibling.querySelector('button'))) {
      moreBtn = nextSibling.tagName === 'BUTTON' ? nextSibling : nextSibling.querySelector('button');
    }
  }

  if (!moreBtn) {
    throw new Error('Could not find menu button for conversation');
  }

  // Click the more button
  moreBtn.click();
  await sleep(MENU_OPEN_DELAY_MS);

  // Look for "Delete" option in the dropdown menu
  // The menu is usually a popup that appears in the DOM
  let deleteOption = null;
  
  // Try multiple selectors for the delete menu item
  const menuSelectors = [
    '[role="menu"] [role="menuitem"]',
    '[role="listbox"] [role="option"]',
    'mat-menu-content button',
    '.mat-menu-content button', 
    '.mat-mdc-menu-content button',
    '[class*="menu"] button',
    '[class*="dropdown"] button',
    '[class*="menu"] [class*="item"]',
  ];

  for (const selector of menuSelectors) {
    const items = document.querySelectorAll(selector);
    for (const item of items) {
      const text = item.textContent.trim().toLowerCase();
      if (text.includes('delete') || text.includes('删除')) {
        deleteOption = item;
        break;
      }
    }
    if (deleteOption) break;
  }

  // Broader fallback: find "Delete" text only within an overlay container
  // Constrained to overlay/menu containers to avoid matching unrelated delete buttons
  if (!deleteOption) {
    const overlayContainer = document.querySelector('.cdk-overlay-container, [class*="overlay-pane"]');
    if (overlayContainer) {
      const candidates = overlayContainer.querySelectorAll('button, [role="menuitem"], [role="option"], [class*="item"]');
      for (const el of candidates) {
        const text = el.textContent.trim();
        if (text === 'Delete' || text === '删除') {
          deleteOption = el;
          break;
        }
      }
    }
  }

  if (!deleteOption) {
    // Close the menu by pressing Escape
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await sleep(ESCAPE_CLOSE_DELAY_MS);
    throw new Error('Could not find Delete option in menu');
  }

  // Click Delete
  deleteOption.click();
  await sleep(DIALOG_OPEN_DELAY_MS);

  // Now look for the confirmation dialog's Delete/Confirm button
  let confirmBtn = null;
  
  const confirmSelectors = [
    'button[aria-label*="elete"]',
    'button[aria-label*="onfirm"]',
    '[role="dialog"] button',
    '[class*="dialog"] button',
    '[class*="modal"] button',
    'mat-dialog-actions button',
    '.mat-dialog-actions button',
    '.mat-mdc-dialog-actions button',
    '.cdk-overlay-container button',
  ];

  for (const selector of confirmSelectors) {
    const buttons = document.querySelectorAll(selector);
    for (const btn of buttons) {
      const text = btn.textContent.trim().toLowerCase();
      if (text.includes('delete') || text.includes('删除') || text.includes('confirm') || text.includes('确认')) {
        // Make sure this is in a dialog/overlay, not the original menu
        const isInOverlay = btn.closest('[role="dialog"], [class*="dialog"], [class*="modal"], .cdk-overlay-container, [class*="overlay"]');
        if (isInOverlay) {
          confirmBtn = btn;
          break;
        }
      }
    }
    if (confirmBtn) break;
  }

  if (!confirmBtn) {
    // Try Escape to close
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await sleep(ESCAPE_CLOSE_DELAY_MS);
    throw new Error('Could not find confirmation button');
  }

  // Click confirm
  confirmBtn.click();
  await sleep(DELETE_ANIMATION_DELAY_MS);

  return true;
}

// ===== Batch delete selected conversations =====
async function batchDeleteSelected() {
  if (batchDeleteState.deleting) {
    return { success: false, error: 'Deletion already in progress' };
  }

  const checkedBoxes = document.querySelectorAll('.gce-batch-checkbox:checked');
  const count = checkedBoxes.length;

  if (count === 0) {
    return { success: false, error: 'No conversations selected' };
  }

  // Show confirmation dialog
  const confirmed = await showDeleteConfirmation(count);
  if (!confirmed) {
    return { success: false, error: 'Cancelled by user' };
  }

  batchDeleteState.deleting = true;

  // Disable toolbar buttons during deletion
  const toolbar = document.getElementById('gce-batch-toolbar');
  if (toolbar) {
    toolbar.querySelectorAll('.gce-toolbar-btn').forEach(btn => { btn.disabled = true; });
  }

  // Inject stealth CSS to hide Gemini's native menus/dialogs during deletion
  // Programmatic .click() still works on opacity:0 elements
  const stealthStyle = document.createElement('style');
  stealthStyle.id = 'gce-stealth-delete';
  stealthStyle.textContent = `
    .cdk-overlay-container,
    [role="menu"],
    [role="dialog"],
    [class*="mat-menu"],
    [class*="mat-dialog"],
    [class*="mdc-dialog"],
    [class*="overlay-pane"] {
      opacity: 0 !important;
      pointer-events: none !important;
    }
    /* Re-enable pointer events on the actual buttons so .click() works */
    .cdk-overlay-container *,
    [role="menu"] *,
    [role="dialog"] * {
      pointer-events: auto !important;
    }
  `;
  document.head.appendChild(stealthStyle);

  let deletedCount = 0;
  let errors = [];

  // Get the conversation elements (the parent <a> of each checkbox)
  // We need to collect them first since the DOM changes after each deletion
  const conversationsToDelete = [];
  checkedBoxes.forEach(cb => {
    const conv = cb.closest('a') || cb.parentElement;
    const name = conv ? conv.textContent.replace(/[\n\r]/g, ' ').trim().substring(0, 50) : `Conversation`;
    conversationsToDelete.push({ element: conv, name, checkbox: cb });
  });

  for (let i = 0; i < conversationsToDelete.length; i++) {
    const { element, name } = conversationsToDelete[i];
    
    showDeleteProgress(i + 1, conversationsToDelete.length, name);
    reportBatchStatus({ phase: 'deleting', current: i + 1, total: conversationsToDelete.length });

    try {
      // Re-find the element since DOM may have changed after previous deletions
      let targetElement = element;
      if (!document.contains(element)) {
        // Element was removed from DOM — try to re-find by conversation name
        console.log(`[BatchDelete] Element detached, re-finding: "${name}"`);
        const currentConversations = findSidebarConversations();
        const refound = currentConversations.find(a => {
          const aText = a.textContent.replace(/[\n\r]/g, ' ').trim().substring(0, 50);
          return aText === name;
        });
        if (refound) {
          targetElement = refound;
          console.log(`[BatchDelete] Re-found element for: "${name}"`);
        } else {
          // Truly gone — likely already deleted
          console.log(`[BatchDelete] Element not found, likely already deleted: "${name}"`);
          deletedCount++;
          continue;
        }
      }

      await simulateDeleteConversation(targetElement);
      deletedCount++;
      console.log(`[BatchDelete] ✓ Deleted (${i + 1}/${conversationsToDelete.length}): "${name}"`);
      
      // Wait between deletions to avoid rate limiting
      if (i < conversationsToDelete.length - 1) {
        await sleep(BETWEEN_DELETIONS_DELAY_MS);
      }
    } catch (error) {
      console.error(`[BatchDelete] ✗ Failed to delete "${name}":`, error);
      errors.push(`"${name}": ${error.message}`);
    }
  }

  // Remove stealth CSS to restore Gemini's normal UI
  const stealth = document.getElementById('gce-stealth-delete');
  if (stealth) stealth.remove();

  batchDeleteState.deleting = false;
  hideDeleteProgress();

  // Show result
  if (errors.length > 0) {
    console.warn(`[BatchDelete] Completed with errors: ${errors.length}/${conversationsToDelete.length} failed`);
    reportBatchStatus({ 
      phase: 'error', 
      error: `Deleted ${deletedCount}/${conversationsToDelete.length}. ${errors.length} failed.` 
    });
  } else {
    console.log(`[BatchDelete] ✓ All ${deletedCount} conversations deleted successfully`);
    reportBatchStatus({ phase: 'complete', deletedCount });
  }

  // Cleanup batch delete mode
  cleanupBatchDeleteMode();

  return { 
    success: true, 
    deletedCount, 
    totalAttempted: conversationsToDelete.length,
    errors 
  };
}

// ===== Cleanup =====
function cleanupBatchDeleteMode() {
  batchDeleteState.active = false;
  batchDeleteState.deleting = false;

  // Remove all checkboxes
  document.querySelectorAll('.gce-batch-checkbox').forEach(cb => cb.remove());

  // Remove stealth CSS (safety net if deletion was interrupted)
  const stealth = document.getElementById('gce-stealth-delete');
  if (stealth) stealth.remove();

  // Remove toolbar
  const toolbar = document.getElementById('gce-batch-toolbar');
  if (toolbar) toolbar.remove();

  // Remove styles
  const styles = document.getElementById('gce-batch-styles');
  if (styles) styles.remove();

  // Remove progress overlay
  const progress = document.getElementById('gce-delete-progress');
  if (progress) progress.remove();

  // Remove confirmation overlay
  const confirm = document.getElementById('gce-confirm-overlay');
  if (confirm) confirm.remove();

  console.log('[BatchDelete] Mode deactivated.');
}

async function exportChat(format = 'md') {
  const startTime = Date.now();
  exportCancelled = false; // Reset cancellation flag
  try {
    console.log(`Starting chat export (format: ${format})...`);
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
    
    // Branch based on format
    const fileExt = format === 'html' ? '.html' : '.md';
    
    if (format === 'html') {
      reportProgress('Generating file...', 'Creating printable HTML', 95, messages.length);
      const html = convertToHTML(messages, title);
      downloadFile(html, title, 'text/html', '.html');
    } else {
      reportProgress('Generating file...', 'Creating markdown', 95, messages.length);
      const markdown = convertToMarkdown(messages, title);
      downloadFile(markdown, title, 'text/markdown;charset=utf-8', '.md');
    }
    
    reportProgress('Complete!', 'File downloaded', 100, messages.length);
    
    // Calculate elapsed time from function start
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    
    // Show success on page
    showOnPageSuccess(messages.length, userCount, geminiCount, title + fileExt, elapsed);
    
    return {
      messageCount: messages.length,
      userCount: userCount,
      geminiCount: geminiCount,
      filename: title + fileExt
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
  
  // First scroll to bottom to trigger loading - minimal wait if already there
  chatContainer.scrollTop = chatContainer.scrollHeight;
  await sleep(500); // Reduced from 1500ms
  await waitForLoading(2000); // Quick check only for initial bottom load
  
  // Scroll from bottom to top to load all content
  let currentScrollPos = chatContainer.scrollHeight;
  let attempts = 0;
  const maxAttempts = 500; 
  
  // Speed up Phase 1: Scroll in larger chunks and faster
  const fastScrollStep = viewportHeight * 1.5; 
  
  while (currentScrollPos > 0 && attempts < maxAttempts && !exportCancelled) {
    currentScrollPos = Math.max(0, currentScrollPos - fastScrollStep);
    chatContainer.scrollTop = currentScrollPos;
    await sleep(150); // Faster delay for loading phase
    attempts++;
    
    // Update total height in case more content loaded
    if (chatContainer.scrollHeight > totalHeight) {
      totalHeight = chatContainer.scrollHeight;
    }
    
    if (attempts % 5 === 0) {
      const progress = Math.round((1 - currentScrollPos / totalHeight) * 40) + 5;
      reportProgress('Phase 1/2: Loading content', `Fast-scanning history (Step ${attempts})`, progress, 0);
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
          key: key,
          domPosition: element.getBoundingClientRect().top + chatContainer.scrollTop // Record absolute position
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
  
  // Speed up Phase 2: Larger steps and faster timing
  const collectionStep = viewportHeight * 0.8; 
  
  while (currentScrollPos <= totalHeight && attempts < maxAttempts && !exportCancelled) {
    chatContainer.scrollTop = currentScrollPos;
    await sleep(200); // Slightly faster collection trigger
    
    const newCount = collectInOrder();
    if (newCount > 0) {
      console.log(`[Collect] Position: ${currentScrollPos}, Found ${newCount} new. Total: ${orderedMessages.length}`);
    }
    
    // Report progress every 5 attempts
    if (attempts % 5 === 0) {
      const progress = Math.round((currentScrollPos / totalHeight) * 40) + 50; // 50-90%
      reportProgress('Phase 2/2: Collecting messages', `Scanning...`, progress, orderedMessages.length);
    }
    
    currentScrollPos += collectionStep;
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
  
  reportProgress('Phase 2/2: Complete', 'Sorting messages...', 90, orderedMessages.length);
  
  // CRITICAL: Sort by absolute DOM position to ensure chronological order
  orderedMessages.sort((a, b) => a.domPosition - b.domPosition);
  
  console.log(`✓ Collection complete. Total messages: ${orderedMessages.length}`);
  
  return orderedMessages;
}

// Wait for any loading indicators to disappear
async function waitForLoading(maxWait = 8000) {  // Reduced from 30s to 8s
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWait) {
    // Check for common loading indicators ONLY within the plausible container area if possible
    const spinners = document.querySelectorAll('infinite-scroller [role="progressbar"], infinite-scroller .loading, infinite-scroller .spinner');
    
    if (spinners.length === 0) {
      return;
    }
    
    let hasVisibleSpinner = false;
    spinners.forEach(spinner => {
      const style = window.getComputedStyle(spinner);
      if (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0') {
        hasVisibleSpinner = true;
      }
    });
    
    if (!hasVisibleSpinner) return;
    await sleep(200);
  }
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

// Convert HTML element to Markdown with proper formatting
function htmlToMarkdown(element, depth = 0) {
  if (!element) return '';
  
  let markdown = '';
  const indent = '  '.repeat(depth); // 2 spaces per nesting level
  
  // Process all child nodes
  for (const node of element.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      // Text node - add as-is
      markdown += node.textContent;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const tag = node.tagName.toLowerCase();
      
      switch (tag) {
        // Headings
        case 'h1':
          markdown += `\n\n# ${node.textContent.trim()}\n\n`;
          break;
        case 'h2':
          markdown += `\n\n## ${node.textContent.trim()}\n\n`;
          break;
        case 'h3':
          markdown += `\n\n### ${node.textContent.trim()}\n\n`;
          break;
        case 'h4':
          markdown += `\n\n#### ${node.textContent.trim()}\n\n`;
          break;
        case 'h5':
          markdown += `\n\n##### ${node.textContent.trim()}\n\n`;
          break;
        case 'h6':
          markdown += `\n\n###### ${node.textContent.trim()}\n\n`;
          break;
        
        // Lists
        case 'ul':
        case 'ol':
          markdown += '\n' + processList(node, depth, tag === 'ol');
          break;
        
        // Paragraphs
        case 'p':
          markdown += htmlToMarkdown(node, depth) + '\n\n';
          break;
        
        // Line breaks
        case 'br':
          markdown += '\n';
          break;
        
        // Bold
        case 'strong':
        case 'b':
          markdown += `**${node.textContent.trim()}**`;
          break;
        
        // Italic
        case 'em':
        case 'i':
          markdown += `*${node.textContent.trim()}*`;
          break;
        
        // Inline code
        case 'code':
          // Check if it's inside a <pre> (block code)
          if (node.parentElement.tagName.toLowerCase() !== 'pre') {
            markdown += `\`${node.textContent}\``;
          } else {
            // Block code handled by <pre> case below
            markdown += node.textContent;
          }
          break;
        
        // Code blocks (already handled by existing logic, keep as-is)
        case 'pre':
          const codeElement = node.querySelector('code');
          const code = codeElement ? codeElement.textContent : node.textContent;
          const language = codeElement?.className.match(/language-(\w+)/)?.[1] || '';
          markdown += `\n\`\`\`${language}\n${code}\n\`\`\`\n\n`;
          break;
        
        // Divs and spans - recurse into children
        case 'div':
        case 'span':
        case 'section':
        case 'article':
          markdown += htmlToMarkdown(node, depth);
          break;
        
        // Default - recurse for unknown tags
        default:
          markdown += htmlToMarkdown(node, depth);
      }
    }
  }
  
  return markdown;
}

// Process list (ul/ol) and its items
function processList(listElement, depth, isNumbered) {
  let result = '';
  const items = listElement.querySelectorAll(':scope > li'); // Direct children only
  
  items.forEach((li, index) => {
    const indent = '  '.repeat(depth);
    const bullet = isNumbered ? `${index + 1}.` : '-';
    
    // Extract content, handling nested lists
    const clone = li.cloneNode(true);
    const nestedLists = clone.querySelectorAll('ul, ol');
    
    // Temporarily remove nested lists
    const nestedListsContent = [];
    nestedLists.forEach(list => {
      const isNestedNumbered = list.tagName.toLowerCase() === 'ol';
      nestedListsContent.push({
        content: processList(list, depth + 1, isNestedNumbered),
        placeholder: `__NESTED_LIST_${nestedListsContent.length}__`
      });
      list.replaceWith(document.createTextNode(nestedListsContent[nestedListsContent.length - 1].placeholder));
    });
    
    // Get main content
    let content = clone.textContent.trim();
    
    // Restore nested lists
    nestedListsContent.forEach((nested, i) => {
      content = content.replace(`__NESTED_LIST_${i}__`, `\n${nested.content}`);
    });
    
    result += `${indent}${bullet} ${content}\n`;
  });
  
  return result;
}

function extractMessageContent(element) {
  try {
    // Create element clone to avoid modifying original DOM
    const clone = element.cloneNode(true);
    
    // Remove unwanted elements (buttons, icons, etc.)
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
    
    // Convert HTML to Markdown
    let content = htmlToMarkdown(clone);
    
    // Clean up excessive newlines (more than 2 in a row)
    content = content.replace(/\n{3,}/g, '\n\n').trim();
    
    return content;
  } catch (error) {
    // Fallback to plain text if conversion fails
    console.warn('Markdown conversion failed, using plain text', error);
    return element.textContent || element.innerText || '';
  }
}

function convertToHTML(messages, title = 'Gemini Chat') {
  const exportDate = new Date().toLocaleString('en-US');
  const totalMessages = messages.length;
  let userCount = 0;
  let geminiCount = 0;
  messages.forEach(msg => {
    if (msg.author === 'User') userCount++;
    else geminiCount++;
  });

  // Build message HTML
  let messagesHTML = '';
  messages.forEach((msg) => {
    const isUser = msg.author === 'User';
    const authorClass = isUser ? 'user' : 'gemini';
    const authorLabel = isUser ? '👤 You' : '✨ Gemini';
    
    // Escape HTML in content, then convert markdown-like formatting
    let content = escapeHTML(msg.content);
    
    // Convert code blocks: ```lang\ncode\n``` → <pre><code>
    content = content.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
      return `<pre><code class="language-${lang || 'text'}">${code}</code></pre>`;
    });
    
    // Convert inline code: `code` → <code>
    content = content.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Convert bold: **text** → <strong>
    content = content.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    
    // Convert italic: *text* → <em>
    content = content.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
    
    // Convert headers
    content = content.replace(/^#{6}\s+(.+)$/gm, '<h6>$1</h6>');
    content = content.replace(/^#{5}\s+(.+)$/gm, '<h5>$1</h5>');
    content = content.replace(/^#{4}\s+(.+)$/gm, '<h4>$1</h4>');
    content = content.replace(/^#{3}\s+(.+)$/gm, '<h3>$1</h3>');
    content = content.replace(/^#{2}\s+(.+)$/gm, '<h2>$1</h2>');
    content = content.replace(/^#{1}\s+(.+)$/gm, '<h1>$1</h1>');
    
    // Convert line breaks to <br> (but not inside <pre>)
    content = content.replace(/\n/g, '<br>\n');
    
    messagesHTML += `
      <div class="message ${authorClass}">
        <div class="author">${authorLabel}</div>
        <div class="content">${content}</div>
      </div>`;
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHTML(title)}</title>
  <style>
    /* ===== Base Reset & Typography ===== */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { font-size: 15px; }
    body {
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.7;
      color: #1a1a2e;
      background: #f0f2f5;
      padding: 0;
    }

    /* ===== Page Container ===== */
    .page {
      max-width: 820px;
      margin: 0 auto;
      background: #ffffff;
      min-height: 100vh;
      padding: 48px 56px;
    }

    /* ===== Header ===== */
    .header {
      text-align: center;
      padding-bottom: 28px;
      margin-bottom: 32px;
      border-bottom: 2px solid #e8eaed;
    }
    .header h1 {
      font-size: 1.65rem;
      font-weight: 700;
      color: #1a1a2e;
      margin-bottom: 8px;
    }
    .header .meta {
      font-size: 0.82rem;
      color: #5f6368;
      display: flex;
      justify-content: center;
      gap: 18px;
      flex-wrap: wrap;
    }
    .header .meta span { white-space: nowrap; }

    /* ===== Message Bubbles ===== */
    .message {
      margin-bottom: 20px;
      padding: 16px 20px;
      border-radius: 12px;
      page-break-inside: avoid;
    }
    .message.user {
      background: #e8f0fe;
      border-left: 4px solid #4285f4;
    }
    .message.gemini {
      background: #f8f9fa;
      border-left: 4px solid #34a853;
    }
    .author {
      font-size: 0.82rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    .message.user .author { color: #1967d2; }
    .message.gemini .author { color: #188038; }
    .content {
      font-size: 0.95rem;
      line-height: 1.75;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }
    .content h1, .content h2, .content h3,
    .content h4, .content h5, .content h6 {
      margin-top: 12px;
      margin-bottom: 6px;
      line-height: 1.3;
    }
    .content h1 { font-size: 1.35rem; }
    .content h2 { font-size: 1.2rem; }
    .content h3 { font-size: 1.1rem; }

    /* ===== Code ===== */
    code {
      font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
      font-size: 0.88em;
      background: #e8eaed;
      padding: 2px 6px;
      border-radius: 4px;
    }
    pre {
      background: #1e1e2e;
      color: #cdd6f4;
      padding: 16px 20px;
      border-radius: 8px;
      overflow-x: auto;
      margin: 12px 0;
      line-height: 1.5;
    }
    pre code {
      background: none;
      padding: 0;
      color: inherit;
      font-size: 0.85rem;
    }

    /* ===== Lists ===== */
    .content ul, .content ol { padding-left: 24px; margin: 8px 0; }
    .content li { margin-bottom: 4px; }

    /* ===== Footer ===== */
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e8eaed;
      text-align: center;
      font-size: 0.78rem;
      color: #9aa0a6;
    }

    /* ===== Print Styles ===== */
    @media print {
      html { font-size: 12px; }
      body { background: white; padding: 0; }
      .page { padding: 0; box-shadow: none; max-width: 100%; }
      .no-print { display: none !important; }
      .message { break-inside: avoid; }
      pre { white-space: pre-wrap; word-wrap: break-word; }
    }

    /* ===== Print Banner ===== */
    .print-banner {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 12px 24px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 16px rgba(0,0,0,0.25);
      z-index: 9999;
      transition: transform 0.2s;
      border: none;
      font-family: inherit;
    }
    .print-banner:hover { transform: translateY(-2px); }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <h1>${escapeHTML(title)}</h1>
      <div class="meta">
        <span>📅 ${exportDate}</span>
        <span>💬 ${totalMessages} messages</span>
        <span>👤 ${userCount} user</span>
        <span>✨ ${geminiCount} Gemini</span>
      </div>
    </div>
    ${messagesHTML}
    <div class="footer">
      Exported by Gemini Chat Exporter &middot; ${exportDate}
    </div>
  </div>
  <button class="print-banner no-print" onclick="window.print()">🖨️ Print / Save as PDF</button>
</body>
</html>`;
}

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function downloadFile(content, title, mimeType, extension) {
  // Create Blob
  const blob = new Blob([content], { type: mimeType });
  
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
  
  a.download = `${filename}${extension}`;
  
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

