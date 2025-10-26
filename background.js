// Background service worker for handling URL tracking logs

const LOG_KEY = 'url_insertion_log';

console.log('Background service worker started');

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Message received in background:', message);
  
  if (message.type === 'URL_INSERTED') {
    // Get existing log
    chrome.storage.local.get([LOG_KEY], (result) => {
      const log = result[LOG_KEY] || [];
      
      console.log('Current log has', log.length, 'entries');
      
      // Create new log entry
      const entry = {
        timestamp: new Date().toISOString(),
        insertedUrl: message.insertedUrl,
        pageUrl: message.pageUrl,
        textContent: message.textContent,
        tabId: sender.tab ? sender.tab.id : null
      };
      
      // Add to log
      log.push(entry);
      
      console.log('Adding new log entry:', entry);
      
      // Save back to storage
      chrome.storage.local.set({ [LOG_KEY]: log }, () => {
        console.log('URL insertion logged successfully. Total entries:', log.length);
        
        // Update badge
        chrome.action.setBadgeText({ text: '!' });
        chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
        
        // Clear badge after 3 seconds
        setTimeout(() => {
          chrome.action.setBadgeText({ text: '' });
        }, 3000);
        
        sendResponse({ success: true, logCount: log.length });
      });
    });
    
    // Return true to indicate async response
    return true;
  }
});

console.log('URL tracking background service worker initialized');