document.addEventListener('DOMContentLoaded', function() {
  const exportBtn = document.getElementById('exportBtn');
  const statusDiv = document.getElementById('status');
  const statusText = document.getElementById('statusText');
  const errorDiv = document.getElementById('error');

  // Try to get and display the conversation title when popup opens
  chrome.tabs.query({ active: true, currentWindow: true }, async function(tabs) {
    const currentTab = tabs[0];
    
    if (!currentTab.url || !currentTab.url.includes('gemini.google.com')) {
      showError('Please use this extension on a Gemini chat page');
      exportBtn.disabled = true;
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
        const title = results[0].result;
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
  });

  exportBtn.addEventListener('click', async function() {
    try {
      hideError();
      showStatus('Loading all messages...\nThis may take 1-2 minutes.\nCheck Console (F12) for progress.');
      exportBtn.disabled = true;

      // Get current active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      // Send message to content script
      chrome.tabs.sendMessage(tab.id, { action: 'exportChat' }, function(response) {
        if (chrome.runtime.lastError) {
          showError('Unable to connect to page. Please refresh and try again.');
          exportBtn.disabled = false;
          hideStatus();
          return;
        }

        if (response && response.success) {
          showStatus('Export successful!\nFile has been downloaded.');
          setTimeout(() => {
            hideStatus();
            exportBtn.disabled = false;
          }, 3000);
        } else {
          showError(response?.error || 'Export failed. Please try again.');
          exportBtn.disabled = false;
          hideStatus();
        }
      });
    } catch (error) {
      showError('Error: ' + error.message);
      exportBtn.disabled = false;
      hideStatus();
    }
  });

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
});
