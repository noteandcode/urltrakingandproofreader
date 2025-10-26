// Inject Origin Trial Proofreader token into page
(function() {
  const meta = document.createElement("meta");
  meta.httpEquiv = "origin-trial";
  meta.content = "A/rF4Dm2O8ltWk/dmQGh4VaQ6Tpj6LtyPQ0V8CP5ljoIhijaIAnyz/npajuEd4QAHp4KiQJpZFjzEAi6oD7mtgAAAACFeyJvcmlnaW4iOiJjaHJvbWUtZXh0ZW5zaW9uOi8vbG5rbWplZmplb25mbW9wam1uZGFuYWViZGhjbGdnZmIiLCJmZWF0dXJlIjoiQUlQcm9vZnJlYWRlckFQSSIsImV4cGlyeSI6MTc3OTE0ODgwMCwiaXNUaGlyZFBhcnR5Ijp0cnVlfQ==";
  document.documentElement.prepend(meta);
})();

// URL Tracking System
(function() {
  const URLS_KEY = 'tracked_urls';
  let trackedUrlsCache = [];
  let isInitialized = false;
  
  // Initialize and load tracked URLs
  function initialize() {
    if (isInitialized) return;
    
    chrome.storage.local.get([URLS_KEY], (result) => {
      trackedUrlsCache = result[URLS_KEY] || [];
      console.log('URL Tracker initialized. Tracking', trackedUrlsCache.length, 'URLs:', trackedUrlsCache);
      isInitialized = true;
    });
    
    // Listen for changes to tracked URLs
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'local' && changes[URLS_KEY]) {
        trackedUrlsCache = changes[URLS_KEY].newValue || [];
        console.log('Tracked URLs updated:', trackedUrlsCache);
      }
    });
  }
  
  // Check if text contains any tracked URLs
  function findTrackedUrl(text) {
    if (!text) return null;
    
    for (const url of trackedUrlsCache) {
      if (text.includes(url)) {
        return url;
      }
    }
    return null;
  }
  
  // Get surrounding text context
  function getTextContext(element) {
    let text = '';
    
    if (element.value !== undefined) {
      text = element.value;
    } else if (element.textContent) {
      text = element.textContent;
    } else if (element.innerText) {
      text = element.innerText;
    }
    
    // Limit to 500 characters max
    if (text.length > 500) {
      text = text.substring(0, 500) + '...';
    }
    
    return text;
  }
  
  // Send log to extension background
  function logUrlInsertion(insertedUrl, textContent) {
    console.log('Logging URL insertion:', insertedUrl, 'on page:', window.location.href);
    
    chrome.runtime.sendMessage({
      type: 'URL_INSERTED',
      insertedUrl: insertedUrl,
      pageUrl: window.location.href,
      textContent: textContent
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Could not log URL insertion:', chrome.runtime.lastError.message);
      } else {
        console.log('URL insertion logged successfully');
      }
    });
  }
  
  // Track which URLs have been logged in which elements to avoid duplicates
  const loggedURLs = new Map();
  
  function shouldLog(url, elementIdentifier) {
    const key = `${url}_${elementIdentifier}`;
    const lastLogged = loggedURLs.get(key);
    const now = Date.now();
    
    // Don't log same URL in same element within 5 seconds
    if (lastLogged && (now - lastLogged) < 5000) {
      return false;
    }
    
    loggedURLs.set(key, now);
    return true;
  }
  
  function getElementIdentifier(element) {
    return element.id || element.name || element.className || element.tagName || 'unknown';
  }
  
  // Monitor paste events
  document.addEventListener('paste', (event) => {
    setTimeout(() => {
      try {
        const pastedText = (event.clipboardData || window.clipboardData).getData('text');
        console.log('Paste detected, text:', pastedText);
        
        const trackedUrl = findTrackedUrl(pastedText);
        
        if (trackedUrl) {
          const textContent = getTextContext(event.target);
          const elementId = getElementIdentifier(event.target);
          
          if (shouldLog(trackedUrl, elementId)) {
            console.log('Tracked URL found in paste:', trackedUrl);
            logUrlInsertion(trackedUrl, textContent);
          }
        }
      } catch (e) {
        console.error('Error monitoring paste:', e);
      }
    }, 100);
  });
  
  // Monitor input events (typing) - works for most sites
  let inputTimer;
  document.addEventListener('input', (event) => {
    clearTimeout(inputTimer);
    inputTimer = setTimeout(() => {
      try {
        const textContent = getTextContext(event.target);
        const trackedUrl = findTrackedUrl(textContent);
        
        if (trackedUrl) {
          const elementId = getElementIdentifier(event.target);
          
          if (shouldLog(trackedUrl, elementId)) {
            console.log('Tracked URL found in input:', trackedUrl);
            logUrlInsertion(trackedUrl, textContent);
          }
        }
      } catch (e) {
        console.error('Error monitoring input:', e);
      }
    }, 1000);
  });
  
  // Monitor keyup events - for additional coverage on social media sites
  let keyupTimer;
  document.addEventListener('keyup', (event) => {
    clearTimeout(keyupTimer);
    keyupTimer = setTimeout(() => {
      try {
        const textContent = getTextContext(event.target);
        const trackedUrl = findTrackedUrl(textContent);
        
        if (trackedUrl) {
          const elementId = getElementIdentifier(event.target);
          
          if (shouldLog(trackedUrl, elementId)) {
            console.log('Tracked URL found in keyup:', trackedUrl);
            logUrlInsertion(trackedUrl, textContent);
          }
        }
      } catch (e) {
        console.error('Error monitoring keyup:', e);
      }
    }, 1000);
  });
  
  // Monitor contenteditable elements
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'characterData' || mutation.type === 'childList') {
        const target = mutation.target.nodeType === Node.TEXT_NODE 
          ? mutation.target.parentElement 
          : mutation.target;
        
        if (target && (target.isContentEditable || target.getAttribute('contenteditable') === 'true')) {
          const textContent = getTextContext(target);
          const trackedUrl = findTrackedUrl(textContent);
          
          if (trackedUrl) {
            const elementId = getElementIdentifier(target);
            
            if (shouldLog(trackedUrl, elementId)) {
              console.log('Tracked URL found in contenteditable:', trackedUrl);
              logUrlInsertion(trackedUrl, textContent);
            }
          }
        }
      }
    });
  });
  
  // Start observing after initialization
  setTimeout(() => {
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
    console.log('MutationObserver started');
  }, 1000);
  
  // Initialize the tracking system
  initialize();
  
  console.log('URL Tracking System loaded and active');
})();