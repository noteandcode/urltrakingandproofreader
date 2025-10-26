(() => {
  // DOM Elements - Proofreader
  const inputEl = document.getElementById('proofreader_input');
  const proofBtn = document.getElementById('proof_button');
  const copyBtn = document.getElementById('copy_button');
  const resEl = document.getElementById('result');
  const progEl = document.getElementById('progress');
  const showMistakesCheckbox = document.getElementById('show_mistakes');

  // DOM Elements - URL Manager
  const urlInput = document.getElementById('url_input');
  const addUrlBtn = document.getElementById('add_url_button');
  const urlList = document.getElementById('url_list');
  const urlMessage = document.getElementById('url_message');
  const clearUrlsBtn = document.getElementById('clear_urls_button');

  // DOM Elements - Logs
  const logContainer = document.getElementById('log_container');
  const downloadCsvBtn = document.getElementById('download_csv_button');
  const downloadJsonBtn = document.getElementById('download_json_button');
  const clearLogBtn = document.getElementById('clear_log_button');
  const logMessage = document.getElementById('log_message');

  // Tab switching
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');

  tabButtons.forEach(button => {
    button.onclick = () => {
      const tabName = button.dataset.tab;
      
      tabButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      
      tabContents.forEach(content => content.classList.remove('active'));
      document.getElementById(`${tabName}-tab`).classList.add('active');
      
      if (tabName === 'urls') {
        displayUrls();
      } else if (tabName === 'logs') {
        displayLogs();
      }
    };
  });

  let proofreader = null;

  // Storage keys
  const URLS_KEY = 'tracked_urls';
  const LOG_KEY = 'url_insertion_log';

  // ===== STORAGE FUNCTIONS =====
  function getTrackedUrls(callback) {
    chrome.storage.local.get([URLS_KEY], (result) => {
      callback(result[URLS_KEY] || []);
    });
  }

  function saveTrackedUrls(urls, callback) {
    chrome.storage.local.set({ [URLS_KEY]: urls }, () => {
      if (callback) callback();
    });
  }

  function getInsertionLog(callback) {
    chrome.storage.local.get([LOG_KEY], (result) => {
      callback(result[LOG_KEY] || []);
    });
  }

  function saveInsertionLog(log, callback) {
    chrome.storage.local.set({ [LOG_KEY]: log }, () => {
      if (callback) callback();
    });
  }

  // ===== URL MANAGER FUNCTIONS =====
  function displayUrls() {
    getTrackedUrls((urls) => {
      if (urls.length === 0) {
        urlList.innerHTML = '<div class="empty-state">No URLs being tracked yet</div>';
        return;
      }
      
      urlList.innerHTML = '';
      urls.forEach((url, index) => {
        const urlItem = document.createElement('div');
        urlItem.className = 'url-item';
        
        const urlText = document.createElement('span');
        urlText.textContent = url;
        urlText.style.flex = '1';
        urlText.style.overflow = 'hidden';
        urlText.style.textOverflow = 'ellipsis';
        urlText.style.whiteSpace = 'nowrap';
        urlText.title = url;
        
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete';
        deleteBtn.onclick = () => deleteUrl(index);
        
        urlItem.appendChild(urlText);
        urlItem.appendChild(deleteBtn);
        urlList.appendChild(urlItem);
      });
    });
  }

  function addUrl() {
    const url = urlInput.value.trim();
    
    if (!url) {
      showMessage(urlMessage, 'Please enter a URL', 'error');
      return;
    }
    
    // Basic URL validation
    try {
      new URL(url);
    } catch (e) {
      showMessage(urlMessage, 'Please enter a valid URL', 'error');
      return;
    }
    
    getTrackedUrls((urls) => {
      if (urls.includes(url)) {
        showMessage(urlMessage, 'URL already being tracked', 'error');
        return;
      }
      
      urls.push(url);
      saveTrackedUrls(urls, () => {
        urlInput.value = '';
        displayUrls();
        showMessage(urlMessage, 'URL added to tracking list!', 'success');
      });
    });
  }

  function deleteUrl(index) {
    getTrackedUrls((urls) => {
      urls.splice(index, 1);
      saveTrackedUrls(urls, () => {
        displayUrls();
        showMessage(urlMessage, 'URL removed from tracking', 'success');
      });
    });
  }

  function clearAllUrls() {
    if (confirm('Are you sure you want to stop tracking all URLs?')) {
      saveTrackedUrls([], () => {
        displayUrls();
        showMessage(urlMessage, 'All URLs cleared', 'success');
      });
    }
  }

  // ===== LOG FUNCTIONS =====
  function displayLogs() {
    getInsertionLog((log) => {
      if (log.length === 0) {
        logContainer.innerHTML = '<div class="empty-state">No URL insertions logged yet</div>';
        return;
      }
      
      logContainer.innerHTML = '';
      // Display in reverse order (newest first)
      log.slice().reverse().forEach(entry => {
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        
        const timestamp = new Date(entry.timestamp).toLocaleString();
        
        const timestampDiv = document.createElement('div');
        timestampDiv.className = 'log-timestamp';
        timestampDiv.textContent = `⏰ ${timestamp}`;
        logEntry.appendChild(timestampDiv);
        
        // Inserted URL - clickable
        const insertedUrlDiv = document.createElement('div');
        insertedUrlDiv.className = 'log-url';
        insertedUrlDiv.innerHTML = '🔗 Inserted URL: ';
        const insertedLink = document.createElement('a');
        insertedLink.href = entry.insertedUrl;
        insertedLink.textContent = entry.insertedUrl;
        insertedLink.target = '_blank';
        insertedLink.style.color = '#2196F3';
        insertedLink.style.textDecoration = 'underline';
        insertedUrlDiv.appendChild(insertedLink);
        logEntry.appendChild(insertedUrlDiv);
        
        // Page URL - clickable
        const pageUrlDiv = document.createElement('div');
        pageUrlDiv.className = 'log-page';
        pageUrlDiv.innerHTML = '📄 On page: ';
        const pageLink = document.createElement('a');
        pageLink.href = entry.pageUrl;
        pageLink.textContent = entry.pageUrl;
        pageLink.target = '_blank';
        pageLink.style.color = '#FF9800';
        pageLink.style.textDecoration = 'underline';
        pageUrlDiv.appendChild(pageLink);
        logEntry.appendChild(pageUrlDiv);
        
        // Text content
        if (entry.textContent) {
          const textDiv = document.createElement('div');
          textDiv.className = 'log-text';
          textDiv.textContent = `📝 Text context: ${entry.textContent}`;
          logEntry.appendChild(textDiv);
        }
        
        logContainer.appendChild(logEntry);
      });
    });
  }

  function downloadLogAsCSV() {
    getInsertionLog((log) => {
      if (log.length === 0) {
        showMessage(logMessage, 'No logs to download', 'error');
        return;
      }
      
      // Create CSV content with BOM for proper Excel encoding
      let csv = '\uFEFF'; // UTF-8 BOM for Excel
      csv += 'Date & Time,Tracked URL,Page URL,Text Content\n';
      
      log.forEach(entry => {
        const dateObj = new Date(entry.timestamp);
        
        // Format date and time together as YYYY-MM-DD HH:MM:SS
        const dateTime = dateObj.toLocaleString('sv-SE', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }).replace(',', '');
        
        const insertedUrl = entry.insertedUrl || '';
        const pageUrl = entry.pageUrl || '';
        const textContent = (entry.textContent || '').replace(/\n/g, ' ').replace(/\r/g, ' ').trim();
        
        // Escape CSV values properly for Excel
        const escapeCsv = (val) => {
          val = String(val);
          // Replace any existing quotes with double quotes
          val = val.replace(/"/g, '""');
          // Always wrap in quotes to ensure proper column separation
          return `"${val}"`;
        };
        
        csv += `${escapeCsv(dateTime)},${escapeCsv(insertedUrl)},${escapeCsv(pageUrl)},${escapeCsv(textContent)}\n`;
      });
      
      downloadFile(csv, 'url_insertion_log.csv', 'text/csv;charset=utf-8;');
      showMessage(logMessage, 'CSV downloaded successfully!', 'success');
    });
  }

  function downloadLogAsJSON() {
    getInsertionLog((log) => {
      if (log.length === 0) {
        showMessage(logMessage, 'No logs to download', 'error');
        return;
      }
      
      const json = JSON.stringify(log, null, 2);
      downloadFile(json, 'url_insertion_log.json', 'application/json');
      showMessage(logMessage, 'JSON downloaded successfully!', 'success');
    });
  }

  function clearLog() {
    if (confirm('Are you sure you want to clear all URL insertion logs?')) {
      getInsertionLog((log) => {
        const logCount = log.length;
        saveInsertionLog([], () => {
          displayLogs();
          showMessage(logMessage, `Cleared ${logCount} log entries`, 'success');
        });
      });
    }
  }

  function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function showMessage(element, message, type) {
    element.textContent = message;
    element.className = type === 'success' ? 'success' : 'error';
    element.style.marginTop = '10px';
    setTimeout(() => {
      element.textContent = '';
    }, 3000);
  }

  // ===== EVENT LISTENERS - URL Manager =====
  addUrlBtn.onclick = addUrl;
  clearUrlsBtn.onclick = clearAllUrls;
  
  urlInput.onkeypress = (e) => {
    if (e.key === 'Enter') {
      addUrl();
    }
  };

  // ===== EVENT LISTENERS - Logs =====
  downloadCsvBtn.onclick = downloadLogAsCSV;
  downloadJsonBtn.onclick = downloadLogAsJSON;
  clearLogBtn.onclick = clearLog;

  // Refresh log display when popup opens
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes[LOG_KEY]) {
      const logsTab = document.getElementById('logs-tab');
      if (logsTab && logsTab.classList.contains('active')) {
        displayLogs();
      }
    }
  });

  // ===== PROOFREADER FUNCTIONS =====
  async function ensureProofreader() {
    if (proofreader) return proofreader;
    
    if (!window.Proofreader ||
        typeof window.Proofreader.availability !== 'function' ||
        typeof window.Proofreader.create !== 'function') {
      progEl.textContent = 'Proofreader API not found. Make sure you are using Chrome Canary 122+ with all required flags.';
      throw new Error('Proofreader API unavailable');
    }
    
    progEl.textContent = 'Checking model availability...';
    const availability = await window.Proofreader.availability();
    
    const options = {
      sharedContext: 'I am a spelling and grammar checker.',
      monitor(m) {
        m.addEventListener('downloadprogress', (e) => {
          const num = (e.loaded * 100).toFixed(2);
          progEl.textContent = `Downloading model: ${num}%`;
        });
      }
    };
    
    if (availability === 'downloadable') {
      progEl.textContent = 'Model needs to be downloaded. Starting...';
      proofreader = await window.Proofreader.create(options);
      progEl.textContent = 'Model download complete!';
      return proofreader;
    } else if (availability === 'available') {
      proofreader = await window.Proofreader.create(options);
      progEl.textContent = 'Model ready.';
      return proofreader;
    } else {
      progEl.textContent = 'Model not available. Enable Chrome flags and install correct Chrome version.';
      throw new Error('Model not available');
    }
  }

  proofBtn.onclick = async () => {
    const text = inputEl.value.trim();
    resEl.innerHTML = '';
    copyBtn.disabled = true;
    
    if (!text) {
      progEl.textContent = 'Please enter text.';
      return;
    }
    
    try {
      progEl.textContent = 'Initializing proofreader...';
      const pr = await ensureProofreader();
      progEl.textContent = 'Checking text...';
      
      const proofreadResult = await pr.proofread(text, {
        context: 'This is text that needs spelling and grammar correction.',
        outputLanguage: 'en'
      });
      
      resEl.dataset.originalText = text;
      resEl.dataset.correctedText = proofreadResult.corrected || text;
      resEl.dataset.corrections = JSON.stringify(proofreadResult.corrections || []);
      
      renderResults();
      
      progEl.textContent = 'Proofreading complete.';
      copyBtn.disabled = false;
    } catch (e) {
      progEl.textContent = 'Error: ' + (e && e.message ? e.message : e);
      copyBtn.disabled = true;
    }
  };

  copyBtn.onclick = async () => {
    const currentText = inputEl.value.trim();
    
    if (!currentText) {
      progEl.textContent = 'No text to copy. Please enter text first.';
      return;
    }
    
    try {
      progEl.textContent = 'Checking current text...';
      const pr = await ensureProofreader();
      
      const proofreadResult = await pr.proofread(currentText, {
        context: 'This is text that needs spelling and grammar correction.',
        outputLanguage: 'en'
      });
      
      const correctedText = proofreadResult.corrected || currentText;
      
      await navigator.clipboard.writeText(correctedText);
      
      progEl.textContent = '';
      progEl.innerHTML = '<span class="success">✓ Copied corrected text to clipboard!</span>';
      
      setTimeout(() => {
        progEl.innerHTML = '';
      }, 2000);
    } catch (e) {
      progEl.textContent = 'Failed to copy: ' + (e && e.message ? e.message : e);
    }
  };

  showMistakesCheckbox.onchange = () => {
    if (resEl.dataset.correctedText) {
      renderResults();
    }
  };

  function renderResults() {
    resEl.innerHTML = '';
    
    const originalText = resEl.dataset.originalText;
    const corrections = JSON.parse(resEl.dataset.corrections || '[]');
    const showMistakes = showMistakesCheckbox.checked;
    
    if (corrections.length === 0) {
      const ok = document.createElement('div');
      ok.innerHTML = '<b>✓ No errors detected!</b>';
      ok.style.color = '#2d9d2d';
      resEl.appendChild(ok);
      return;
    }
    
    // There are errors
    if (showMistakes) {
      let editBox = document.createElement('div');
      let inputRenderIndex = 0;
      
      for (const correction of corrections) {
        if (correction.startIndex > inputRenderIndex) {
          const unchanged = document.createElement('span');
          unchanged.textContent = originalText.substring(inputRenderIndex, correction.startIndex);
          editBox.appendChild(unchanged);
        }
        
        const error = document.createElement('span');
        error.textContent = originalText.substring(correction.startIndex, correction.endIndex);
        error.classList.add('error');
        error.title = 'Error detected';
        editBox.appendChild(error);
        
        inputRenderIndex = correction.endIndex;
      }
      
      if (inputRenderIndex < originalText.length) {
        const unchanged = document.createElement('span');
        unchanged.textContent = originalText.substring(inputRenderIndex);
        editBox.appendChild(unchanged);
      }
      
      const header = document.createElement('div');
      header.innerHTML = `<b>Text with ${corrections.length} error(s) highlighted:</b>`;
      resEl.appendChild(header);
      resEl.appendChild(editBox);
    } else {
      const header = document.createElement('div');
      header.innerHTML = `<b>${corrections.length} error(s) detected. Enable "Show spelling mistakes" to view highlights.</b>`;
      header.style.color = '#d32f2f';
      resEl.appendChild(header);
      
      const originalDiv = document.createElement('div');
      originalDiv.textContent = originalText;
      resEl.appendChild(originalDiv);
    }
  }

  inputEl.oninput = () => {
    if (resEl.dataset.correctedText) {
      copyBtn.disabled = false;
    }
  };

  // Initialize displays
  displayUrls();
  displayLogs();
})();