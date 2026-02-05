// Background script to manage extension icon state based on current tab
// The icon will be grayed out (disabled) when not on a Gemini page

// Function to check if URL is a Gemini page
function isGeminiPage(url) {
  if (!url) return false;
  return url.includes('gemini.google.com') || 
         (url.includes('google.com') && url.includes('/app/gemini'));
}

// Update icon based on tab URL
function updateIcon(tabId, url) {
  const isGemini = isGeminiPage(url);
  
  if (isGemini) {
    // Use normal colored icons
    chrome.action.setIcon({
      tabId: tabId,
      path: {
        "16": "favicon-16x16.png",
        "48": "android-icon-48x48.png",
        "128": "android-icon-144x144.png"
      }
    });
    chrome.action.setTitle({
      tabId: tabId,
      title: "Gemini Chat Exporter - Click to export"
    });
    chrome.action.enable(tabId);
  } else {
    // Use pre-made grayscale icons
    chrome.action.setIcon({
      tabId: tabId,
      path: {
        "16": "favicon-16x16-grayscale.png",
        "48": "android-icon-48x48-grayscale.png",
        "128": "android-icon-144x144-grayscale.png"
      }
    });
    chrome.action.setTitle({
      tabId: tabId,
      title: "Gemini Chat Exporter - Only works on Gemini pages"
    });
    chrome.action.disable(tabId);
  }
}

// Listen for tab updates (URL changes)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url || changeInfo.status === 'complete') {
    updateIcon(tabId, tab.url);
  }
});

// Listen for tab activation (switching between tabs)
chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    updateIcon(activeInfo.tabId, tab.url);
  });
});

// Update icon when extension is first loaded
chrome.runtime.onInstalled.addListener(() => {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      updateIcon(tab.id, tab.url);
    });
  });
});
