(function () {
  // Prevent double-initialization
  if (document.getElementById('extension-panel')) {
    togglePanel();
    return;
  }

  var ns = window.FFExtract;
  var currentJobData = null;
  var currentConfidence = 0;

  // --- Extraction (delegates to FFExtract pipeline) ---
  function updateJobData() {
    if (!ns || !ns.pipeline) {
      currentJobData = null;
      currentConfidence = 0;
      return;
    }
    try {
      var result = ns.pipeline.extract();
      if (result.data) {
        currentJobData = result.data;
        currentConfidence = result.confidence;
        console.log('[FFExtract] Extracted:', result.method,
          'confidence:', result.confidence,
          'time:', result.extractionTimeMs + 'ms',
          'sources:', JSON.stringify(result.fieldSources));
      } else {
        currentJobData = null;
        currentConfidence = 0;
      }
    } catch (e) {
      console.error('[FFExtract] Pipeline error:', e);
      currentJobData = null;
      currentConfidence = 0;
    }
  }

  // --- SPA Navigation Observer ---
  var lastUrl = location.href;
  new MutationObserver(function () {
    var url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      // Clear stale data immediately
      currentJobData = null;
      currentConfidence = 0;
      setTimeout(updateJobData, 1000);
    }
  }).observe(document, { subtree: true, childList: true });

  // --- Initial extraction with retries ---
  var attempts = 0;
  var intervalId = setInterval(function () {
    attempts++;
    updateJobData();
    if (currentJobData || attempts > 10) {
      clearInterval(intervalId);
    }
  }, 500);

  // --- DOM observer for late-loading content ---
  var debounceTimer = null;
  var domObserver = new MutationObserver(function () {
    // Debounce to avoid excessive re-extraction on rapid DOM changes
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function () {
      debounceTimer = null;
      if (!ns || !ns.pipeline) return;
      try {
        var result = ns.pipeline.extract();
        if (result.data && result.confidence > currentConfidence) {
          currentJobData = result.data;
          currentConfidence = result.confidence;
        }
      } catch (e) {
        // Ignore extraction errors in observer
      }
    }, 300);
  });
  if (document.body) {
    domObserver.observe(document.body, { subtree: true, childList: true });
  }

  // --- Public getter (for iframe access) ---
  window.getCurrentJobData = function () {
    return currentJobData;
  };

  // --- Message Handler ---
  chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.action === 'togglePanel') {
      togglePanel();
      sendResponse({ success: true });

    } else if (request.action === 'getJobData') {
      // Re-extract if we don't have data or confidence is low
      if (!currentJobData && ns && ns.pipeline) {
        try {
          var result = ns.pipeline.extract();
          if (result.data) {
            currentJobData = result.data;
            currentConfidence = result.confidence;
          }
        } catch (e) {
          console.error('[FFExtract] On-demand extraction error:', e);
        }
      }
      // Response shape preserved; confidence is a backward-compatible addition
      sendResponse({
        jobData: currentJobData,
        confidence: currentConfidence
      });

    } else if (request.action === 'scanJobFields') {
      if (ns && ns.pipeline) {
        var scan = ns.pipeline.quickScan();
        sendResponse({ company: scan.company, position: scan.position });
      } else {
        sendResponse({ company: null, position: null });
      }

    } else if (request.action === 'extractPageHtml') {
      try {
        var content = '';
        if (ns && ns.pipeline) {
          content = ns.pipeline.extractForAI();
        } else {
          content = (document.body.innerText || document.body.textContent || '');
          var maxLen = 6000;
          if (content.length > maxLen) {
            content = content.substring(0, maxLen) + '\n[...truncated]';
          }
        }

        sendResponse({
          ok: true,
          payload: {
            content: content,
            source: location.hostname,
            websiteUrl: location.href
          }
        });
      } catch (e) {
        console.error('[FFExtract] extractPageHtml error:', e);
        sendResponse({ ok: false, error: String(e) });
      }
    }
  });

  // --- Panel UI Creation ---
  var panel = document.createElement('div');
  panel.id = 'extension-panel';
  panel.style.cssText = [
    'position: fixed',
    'top: 0',
    'right: 0',
    'width: 350px',
    'height: 100vh',
    'background: white',
    'z-index: 9999',
    'box-shadow: -2px 0 10px rgba(0,0,0,0.2)',
    'overflow-y: auto',
    'display: none',
    'border-left: 1px solid #ddd'
  ].join(';');

  var iframe = document.createElement('iframe');
  iframe.src = chrome.runtime.getURL('panel.html');
  iframe.style.cssText = 'width:100%;height:100%;border:none';

  var closeButton = document.createElement('button');
  closeButton.innerHTML = '\u00d7';
  closeButton.style.cssText = [
    'position: absolute',
    'top: 10px',
    'right: 10px',
    'width: 30px',
    'height: 30px',
    'border-radius: 50%',
    'background: #dc3545',
    'color: white',
    'border: none',
    'font-size: 18px',
    'cursor: pointer',
    'z-index: 10000',
    'display: flex',
    'align-items: center',
    'justify-content: center',
    'padding: 0',
    'line-height: 1'
  ].join(';');
  closeButton.addEventListener('click', function () {
    panel.style.display = 'none';
  });

  panel.appendChild(closeButton);
  panel.appendChild(iframe);
  document.body.appendChild(panel);

  // No overlay - allow full website interaction
  var style = document.createElement('style');
  style.textContent = '';
  document.head.appendChild(style);

  // --- Toggle Panel ---
  function togglePanel() {
    var p = document.getElementById('extension-panel');
    if (!p) return;
    p.style.display = p.style.display === 'block' ? 'none' : 'block';
  }
})();
