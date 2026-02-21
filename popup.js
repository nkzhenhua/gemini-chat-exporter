const BUG_REPORT_URL = 'https://github.com/nkzhenhua/gemini-chat-exporter/issues/new?template=bug_report.md';
const FEATURE_REQUEST_URL = 'https://github.com/nkzhenhua/gemini-chat-exporter/issues/new?template=feature_request.md';

document.addEventListener('DOMContentLoaded', function() {
  // ========== Export Tab Elements ==========
  const exportBtn = document.getElementById('exportBtn');
  const statusDiv = document.getElementById('status');
  const statusText = document.getElementById('statusText');
  const errorDiv = document.getElementById('error');
  const warningBox = document.getElementById('warningBox');
  const progressBox = document.getElementById('progressBox');
  const progressBar = document.getElementById('progressBar');
  const progressPhase = document.getElementById('progressPhase');
  const progressDetail = document.getElementById('progressDetail');
  const messageCount = document.getElementById('messageCount');
  const successBox = document.getElementById('successBox');
  const successDetails = document.getElementById('successDetails');

  // ========== Batch Delete Tab Elements ==========
  const enterBatchDeleteBtn = document.getElementById('enterBatchDeleteBtn');
  const exitBatchDeleteBtn = document.getElementById('exitBatchDeleteBtn');
  const batchDeleteInactive = document.getElementById('batchDeleteInactive');
  const batchDeleteActive = document.getElementById('batchDeleteActive');
  const batchSelectedCount = document.getElementById('batchSelectedCount');
  const batchSelectAllBtn = document.getElementById('batchSelectAllBtn');
  const batchDeleteSelectedBtn = document.getElementById('batchDeleteSelectedBtn');
  const batchError = document.getElementById('batchError');

  let exportStartTime = null;
  let batchDeleteModeActive = false;

  // ========== Tab Switching ==========
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      // Update active tab button
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');

      // Show corresponding panel
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
      const targetPanel = document.getElementById(this.dataset.tab);
      if (targetPanel) targetPanel.classList.remove('hidden');
    });
  });

  // ========== Export Tab Logic (unchanged) ==========

  // Listen for progress messages from content script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'exportProgress') {
      updateProgressDisplay(message);
    }
    if (message.type === 'batchDeleteStatus') {
      updateBatchDeleteStatus(message);
    }
  });

  // Try to get and display the conversation title when popup opens
  chrome.tabs.query({ active: true, currentWindow: true }, async function(tabs) {
    const currentTab = tabs[0];
    
    if (!currentTab.url || !currentTab.url.includes('gemini.google.com')) {
      showError('Please use this extension on a Gemini chat page');
      exportBtn.disabled = true;
      enterBatchDeleteBtn.disabled = true;
      return;
    }
    
    // Try to get conversation title
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: currentTab.id },
        func: () => {
          // Look for .conversation-title element
          const titleSpan = document.querySelector('.conversation-title, [class*="conversation-title"]');
          if (titleSpan) {
            const text = titleSpan.textContent.trim();
            if (text && text.length >= 2) {
              return text.length > 30 ? text.substring(0, 30) + '...' : text;
            }
          }
          // Fallback to document.title
          if (document.title && document.title !== 'Gemini') {
            let title = document.title.replace(/\s*[-–—|:]\s*Gemini.*$/i, '').trim();
            if (title && title.length >= 2) {
              return title.length > 30 ? title.substring(0, 30) + '...' : title;
            }
          }
          return null;
        }
      });
      
      if (results && results[0] && results[0].result) {
        let title = results[0].result;
        // Truncate long titles to prevent wrapping
        const maxLength = 20;
        if (title.length > maxLength) {
          title = title.substring(0, maxLength) + '...';
        }
        // Update button text to show title
        const btnIcon = exportBtn.querySelector('svg');
        exportBtn.innerHTML = '';
        if (btnIcon) exportBtn.appendChild(btnIcon);
        const span = document.createElement('span');
        span.textContent = `Download: ${title}`;
        exportBtn.appendChild(span);
      }
    } catch (err) {
      console.log('Could not get title:', err);
    }

    // Check if batch delete mode is already active
    try {
      chrome.tabs.sendMessage(currentTab.id, { action: 'getBatchDeleteStatus' }, function(response) {
        if (chrome.runtime.lastError) return;
        if (response && response.active) {
          showBatchDeleteActive(response.selectedCount || 0);
        }
      });
    } catch (err) {
      console.log('Could not check batch delete status:', err);
    }
  });

  exportBtn.addEventListener('click', async function() {
    try {
      hideError();
      hideSuccess();
      exportStartTime = Date.now();
      
      // Show warning and progress UI
      showWarning();
      showProgress();
      exportBtn.disabled = true;

      // Get current active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      // Get selected export format
      const selectedFormat = document.querySelector('input[name="format"]:checked').value;

      // Send message to content script
      chrome.tabs.sendMessage(tab.id, { action: 'exportChat', format: selectedFormat }, function(response) {
        if (chrome.runtime.lastError) {
          // Content script not available - refresh the page and retry
          updateProgressDisplay({
            phase: 'Refreshing page...',
            detail: 'Content script not ready',
            percent: 0
          });
          chrome.tabs.reload(tab.id, {}, function() {
            // Wait for page to reload
            setTimeout(() => {
              hideWarning();
              hideProgress();
              showError('Page refreshed. Please click the button again to export.');
              exportBtn.disabled = false;
            }, 2000);
          });
          return;
        }

        if (response && response.success) {
          const elapsed = Math.round((Date.now() - exportStartTime) / 1000);
          showSuccess({
            messageCount: response.messageCount || 0,
            userCount: response.userCount || 0,
            geminiCount: response.geminiCount || 0,
            filename: response.filename || 'file',
            elapsed: elapsed
          });
          hideWarning();
          hideProgress();
          setTimeout(() => {
            exportBtn.disabled = false;
          }, 3000);
        } else {
          showError(response?.error || 'Export failed. Please try again.');
          hideWarning();
          hideProgress();
          exportBtn.disabled = false;
        }
      });
    } catch (error) {
      showError('Error: ' + error.message);
      hideWarning();
      hideProgress();
      exportBtn.disabled = false;
    }
  });

  // ========== Batch Delete Logic ==========

  enterBatchDeleteBtn.addEventListener('click', async function() {
    try {
      hideBatchError();
      enterBatchDeleteBtn.disabled = true;
      enterBatchDeleteBtn.textContent = 'Activating...';

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      chrome.tabs.sendMessage(tab.id, { action: 'enterBatchDeleteMode' }, function(response) {
        if (chrome.runtime.lastError) {
          showBatchError('Content script not ready. Please refresh the page and try again.');
          enterBatchDeleteBtn.disabled = false;
          enterBatchDeleteBtn.textContent = '🗑️ Enter Batch Delete Mode';
          return;
        }

        if (response && response.success) {
          showBatchDeleteActive(0);
        } else {
          showBatchError(response?.error || 'Failed to enter batch delete mode. Make sure the sidebar is visible.');
          enterBatchDeleteBtn.disabled = false;
          enterBatchDeleteBtn.textContent = '🗑️ Enter Batch Delete Mode';
        }
      });
    } catch (error) {
      showBatchError('Error: ' + error.message);
      enterBatchDeleteBtn.disabled = false;
      enterBatchDeleteBtn.textContent = '🗑️ Enter Batch Delete Mode';
    }
  });

  exitBatchDeleteBtn.addEventListener('click', async function() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.tabs.sendMessage(tab.id, { action: 'exitBatchDeleteMode' }, function(response) {
      if (chrome.runtime.lastError) return;
    });
    showBatchDeleteInactive();
  });

  batchSelectAllBtn.addEventListener('click', async function() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const isSelectAll = batchSelectAllBtn.textContent === 'Select All';
    chrome.tabs.sendMessage(tab.id, { action: 'batchSelectAll', selectAll: isSelectAll }, function(response) {
      if (chrome.runtime.lastError) return;
      if (response && response.success) {
        updateBatchDeleteCount(response.selectedCount || 0);
        batchSelectAllBtn.textContent = isSelectAll ? 'Deselect All' : 'Select All';
      }
    });
  });

  batchDeleteSelectedBtn.addEventListener('click', async function() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.tabs.sendMessage(tab.id, { action: 'batchDeleteSelected' }, function(response) {
      if (chrome.runtime.lastError) return;
      // Deletion is async; status updates come via batchDeleteStatus messages
    });
  });

  // ========== Batch Delete Helpers ==========

  function showBatchDeleteActive(count) {
    batchDeleteModeActive = true;
    batchDeleteInactive.classList.add('hidden');
    batchDeleteActive.classList.remove('hidden');
    updateBatchDeleteCount(count);
  }

  function showBatchDeleteInactive() {
    batchDeleteModeActive = false;
    batchDeleteActive.classList.add('hidden');
    batchDeleteInactive.classList.remove('hidden');
    enterBatchDeleteBtn.disabled = false;
    enterBatchDeleteBtn.textContent = '🗑️ Enter Batch Delete Mode';
    batchSelectAllBtn.textContent = 'Select All';
  }

  function updateBatchDeleteCount(count) {
    batchSelectedCount.textContent = `${count} selected`;
    batchDeleteSelectedBtn.textContent = `Delete ${count}`;
    batchDeleteSelectedBtn.disabled = count === 0;
  }

  function updateBatchDeleteStatus(data) {
    if (data.selectedCount !== undefined) {
      updateBatchDeleteCount(data.selectedCount);
    }
    if (data.phase === 'complete') {
      // Deletion finished - show success briefly then reset
      batchSelectedCount.textContent = `✅ ${data.deletedCount || 0} deleted`;
      setTimeout(() => {
        showBatchDeleteInactive();
      }, 3000);
    }
    if (data.phase === 'deleting') {
      batchSelectedCount.textContent = `Deleting ${data.current}/${data.total}...`;
      batchDeleteSelectedBtn.disabled = true;
      batchSelectAllBtn.disabled = true;
      exitBatchDeleteBtn.disabled = true;
    }
    if (data.phase === 'error') {
      showBatchError(data.error || 'Deletion failed');
      batchDeleteSelectedBtn.disabled = false;
      batchSelectAllBtn.disabled = false;
      exitBatchDeleteBtn.disabled = false;
    }
    if (data.exited) {
      showBatchDeleteInactive();
    }
  }

  function showBatchError(message) {
    batchError.textContent = message;
    batchError.classList.remove('hidden');
  }

  function hideBatchError() {
    batchError.classList.add('hidden');
  }

  // ========== Export Tab Helpers (unchanged) ==========

  function updateProgressDisplay(data) {
    // Update progress bar
    if (data.percent !== undefined) {
      progressBar.style.width = data.percent + '%';
    }
    
    // Update phase text
    if (data.phase) {
      progressPhase.textContent = data.phase;
    }
    
    // Update detail text
    if (data.detail) {
      progressDetail.textContent = data.detail;
    }
    
    // Update message count
    if (data.messageCount !== undefined) {
      messageCount.textContent = `Collected: ${data.messageCount} messages`;
    }
  }

  function showWarning() {
    warningBox.classList.remove('hidden');
  }

  function hideWarning() {
    warningBox.classList.add('hidden');
  }

  function showProgress() {
    progressBox.classList.remove('hidden');
    progressBar.style.width = '0%';
    progressPhase.textContent = 'Initializing...';
    progressDetail.textContent = '';
    messageCount.textContent = '';
  }

  function hideProgress() {
    progressBox.classList.add('hidden');
  }

  function showSuccess(data) {
    successBox.classList.remove('hidden');
    
    const userCount = data.userCount || 0;
    const geminiCount = data.geminiCount || 0;
    const total = data.messageCount || (userCount + geminiCount);
    
    successDetails.innerHTML = `
      <strong>Export successful!</strong>
      <div>• Messages: ${total} (${userCount} user + ${geminiCount} Gemini)</div>
      <div>• File: ${data.filename}</div>
      <div>• Time: ${data.elapsed}s</div>
    `;
  }

  function hideSuccess() {
    successBox.classList.add('hidden');
  }

  function showStatus(message) {
    statusText.textContent = message;
    statusDiv.classList.remove('hidden');
  }

  function hideStatus() {
    statusDiv.classList.add('hidden');
  }

  function showError(message) {
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
  }

  function hideError() {
    errorDiv.classList.add('hidden');
  }

  // Feedback link handlers
  const reportBugLink = document.getElementById('reportBugLink');
  if (reportBugLink) {
    reportBugLink.addEventListener('click', function(e) {
      e.preventDefault();
      chrome.tabs.create({ url: BUG_REPORT_URL });
    });
  }

  const featureRequestLink = document.getElementById('featureRequestLink');
  if (featureRequestLink) {
    featureRequestLink.addEventListener('click', function(e) {
      e.preventDefault();
      chrome.tabs.create({ url: FEATURE_REQUEST_URL });
    });
  }
});
