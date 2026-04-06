(function () {
  // Tab that opened the panel (from background); avoids wrong URL when activeTab != host page
  var hostTabIdForPanel = null;

  // --- Extension context validity check ---
  function isExtensionValid() {
    try {
      // This throws if extension context is invalidated (extension reloaded/updated)
      chrome.runtime.getURL('');
      return true;
    } catch (e) {
      return false;
    }
  }

  function showRefreshToast() {
    if (document.getElementById('ff-refresh-toast')) return;
    var toast = document.createElement('div');
    toast.id = 'ff-refresh-toast';
    toast.style.cssText = [
      'position:fixed',
      'top:16px',
      'right:70px',
      'z-index:2147483647',
      'background:#1e293b',
      'color:#fff',
      'padding:12px 20px',
      'border-radius:10px',
      'font-family:-apple-system,BlinkMacSystemFont,sans-serif',
      'font-size:14px',
      'box-shadow:0 8px 32px rgba(0,0,0,0.3)',
      'display:flex',
      'align-items:center',
      'gap:10px',
      'max-width:340px',
      'animation:ff-slide-in .3s ease'
    ].join(';');
    toast.innerHTML =
      '<span style="font-size:18px">🔄</span>' +
      '<span><b>FlashFire updated</b><br><span style="opacity:0.8;font-size:12px">Please refresh this page to use the extension.</span></span>' +
      '<button onclick="location.reload()" style="all:unset;cursor:pointer;background:#ff5722;color:#fff;padding:6px 14px;border-radius:6px;font-size:12px;font-weight:600;white-space:nowrap">Refresh</button>';
    var style = document.createElement('style');
    style.textContent = '@keyframes ff-slide-in{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}';
    document.head.appendChild(style);
    (document.body || document.documentElement).appendChild(toast);
    // Auto-dismiss after 8 seconds
    setTimeout(function () {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 8000);
  }

  function notifyIframeHostTabId() {
    if (hostTabIdForPanel == null) return;
    var panel = document.getElementById('extension-panel');
    if (!panel || panel.style.display !== 'block') return;
    var iframe = panel.querySelector('iframe');
    if (!iframe || !iframe.contentWindow) return;
    try {
      iframe.contentWindow.postMessage(
        { type: 'FF_HOST_TAB_ID', tabId: hostTabIdForPanel },
        '*'
      );
    } catch (e) {
      /* ignore */
    }
  }

  function syncLauncherWithPanel() {
    var host = document.getElementById('flashfire-launcher-host');
    var p = document.getElementById('extension-panel');
    if (!host || !p) return;
    host.style.right = p.style.display === 'block' ? '358px' : '12px';
  }

  function togglePanel() {
    // Check extension context is still valid
    if (!isExtensionValid()) {
      showRefreshToast();
      return;
    }

    var p = document.getElementById('extension-panel');
    if (!p) {
      // Panel doesn't exist yet — try creating it
      createPanelUI();
      p = document.getElementById('extension-panel');
      if (!p) return;
    }

    // Verify iframe has valid src (not broken by context invalidation)
    var iframe = p.querySelector('iframe');
    if (iframe && !iframe.src) {
      try {
        iframe.src = chrome.runtime.getURL('panel.html');
      } catch (e) {
        showRefreshToast();
        return;
      }
    }

    var opening = p.style.display !== 'block';
    p.style.display = opening ? 'block' : 'none';
    if (opening) {
      setTimeout(notifyIframeHostTabId, 0);
      setTimeout(notifyIframeHostTabId, 200);
    }
    syncLauncherWithPanel();
  }

  function getFlashfireMountRoot() {
    return document.body || document.documentElement;
  }

  function addFloatingLauncherButton() {
    // Only show the floating button in the top frame, not inside iframes
    if (window !== window.top) return;
    if (document.getElementById('flashfire-launcher-host')) return;
    var mount = getFlashfireMountRoot();
    if (!mount) return;

    var host = document.createElement('div');
    host.id = 'flashfire-launcher-host';
    host.setAttribute('data-flashfire-launcher', '1');
    host.style.cssText = [
      'all:initial',
      'position:fixed',
      'top:16px',
      'right:12px',
      'z-index:2147483646',
      'pointer-events:auto',
      'display:block',
      'font-size:16px',
      'line-height:1'
    ].join(';');

    var root = host.attachShadow({ mode: 'open' });
    var css = document.createElement('style');
    css.textContent = [
      ':host { display: block !important; visibility: visible !important; opacity: 1 !important; }',
      'button {',
      '  all: unset;',
      '  box-sizing: border-box;',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '  width: 42px;',
      '  height: 42px;',
      '  border-radius: 50%;',
      '  cursor: pointer;',
      '  box-shadow: 0 4px 16px rgba(0,0,0,0.28);',
      '  background: linear-gradient(135deg,#ff5722 0%,#ff6b00 50%,#ea580c 100%);',
      '  color: #fff;',
      '  transition: transform .15s ease, box-shadow .15s ease;',
      '  padding: 0;',
      '}',
      'button:hover {',
      '  transform: scale(1.08);',
      '  box-shadow: 0 6px 22px rgba(234,88,12,0.55);',
      '}',
      'button svg {',
      '  width: 24px;',
      '  height: 24px;',
      '  display: block;',
      '  fill: none;',
      '  stroke: #fff;',
      '  stroke-width: 1.8;',
      '  stroke-linecap: round;',
      '  stroke-linejoin: round;',
      '}'
    ].join('\n');
    var btn = document.createElement('button');
    btn.type = 'button';
    // FlashFire bolt logo SVG
    btn.innerHTML = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="rgba(255,255,255,0.95)" stroke="#fff" /></svg>';
    btn.setAttribute('aria-label', 'Open FlashFire job panel');
    btn.title = 'FlashFire — open panel (save jobs to dashboard)';
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      e.preventDefault();
      togglePanel();
    });
    root.appendChild(css);
    root.appendChild(btn);
    mount.appendChild(host);
    syncLauncherWithPanel();
  }

  function ensureLauncherExists() {
    if (window !== window.top) return;
    var existing = document.getElementById('flashfire-launcher-host');
    if (!existing) {
      addFloatingLauncherButton();
      return;
    }
    // Force visibility in case site CSS hid it
    existing.style.display = 'block';
    existing.style.visibility = 'visible';
    existing.style.opacity = '1';
  }

  // Check quickly at first (500ms, 1s, 2s) then every 3s
  setTimeout(ensureLauncherExists, 500);
  setTimeout(ensureLauncherExists, 1000);
  setTimeout(ensureLauncherExists, 2000);
  setInterval(ensureLauncherExists, 3000);

  // Prevent double-initialization
  if (document.getElementById('extension-panel')) {
    addFloatingLauncherButton();
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
    // Only the TOP frame should respond to data requests.
    // Sub-frames (reCAPTCHA, ads, tracking iframes) must NOT respond
    // to avoid returning garbage data like "reCAPTCHA" as job title.
    var isTopFrame = (window === window.top);

    if (request.action === 'togglePanel') {
      // Only toggle panel in top frame
      if (!isTopFrame) return false;
      if (request.hostTabId != null) {
        hostTabIdForPanel = request.hostTabId;
      } else if (sender && sender.tab && sender.tab.id != null) {
        hostTabIdForPanel = sender.tab.id;
      }
      togglePanel();
      setTimeout(notifyIframeHostTabId, 0);
      setTimeout(notifyIframeHostTabId, 200);
      setTimeout(notifyIframeHostTabId, 600);
      sendResponse({ success: true });

    } else if (request.action === 'getPageLoadStatus') {
      if (!isTopFrame) return false;
      sendResponse({
        readyState: document.readyState,
        url: location.href,
      });

    } else if (request.action === 'getJobData') {
      if (!isTopFrame) return false;
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
      if (!isTopFrame) return false;
      if (ns && ns.pipeline) {
        var scan = ns.pipeline.quickScan();
        sendResponse({ company: scan.company, position: scan.position });
      } else {
        sendResponse({ company: null, position: null });
      }

    } else if (request.action === 'extractPageHtml') {
      if (!isTopFrame) return false;
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

    } else if (request.action === 'fillFormFields') {
      // Top frame always handles it. Sub-frames only handle it if they have ≥3
      // fillable inputs — this covers embedded ATS iframes (Greenhouse embed, etc.)
      // while ignoring ad iframes, reCAPTCHA, tracking pixels, etc.
      if (!isTopFrame) {
        var subFrameInputCount = document.querySelectorAll(
          'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="file"]):not([type="image"]):not([type="password"]),' +
          'textarea,select'
        ).length;
        if (subFrameInputCount < 3) return false;
      }
      try {
        var profile = request.profile || {};
        var autopilot = request.autopilot || {};
        FF_MEMORY_CAPTURE_ENABLED = autopilot.saveResponses !== false;
        if (!FF_RESPONSE_MEMORY_LOADED) loadResponseMemoryFromExtension();
        // Store profile in session so MutationObserver can re-fill on step changes
        FF_SESSION_PROFILE = profile;
        var result = fillApplicationForm(profile);
        var autopilotResult = maybeRunAutopilot(autopilot, result);
        reportAutofillTelemetry({
          hostname: location.hostname,
          detected: result.total || 0,
          filled: result.filled || 0,
          skippedExisting: result.skippedExisting || 0,
          unmatchedLabels: result.unmatchedLabels || [],
          autopilotNext: Boolean(autopilotResult && autopilotResult.clickedNext),
          autopilotSubmit: Boolean(autopilotResult && autopilotResult.clickedSubmit)
        });
        sendResponse({
          success: true,
          filled: result.filled,
          total: result.total,
          skippedExisting: result.skippedExisting || 0,
          fields: result.fields,
          autopilot: autopilotResult || { clickedNext: false, clickedSubmit: false }
        });
        // Arm the multi-step observer after a successful fill
        armMultiStepObserver();
      } catch (e) {
        console.error('[FlashFire] fillFormFields error:', e);
        sendResponse({ success: false, filled: 0, total: 0 });
      }
      return false;
    }
  });

  // ─── Session profile store for multi-step re-fill ───────────────────────────
  var FF_SESSION_PROFILE = null;
  var FF_RESPONSE_MEMORY = [];
  var FF_RESPONSE_MEMORY_LOADED = false;
  var FF_MEMORY_SAVE_DEBOUNCE = null;
  var FF_MEMORY_CAPTURE_ENABLED = true;

  loadResponseMemoryFromExtension();

  // ═══════════════════════════════════════════════════════════════════════════════
  // FlashFire AutoFill Engine v3.0
  // Best-in-class label detection + scoring. Covers 40+ field types across every
  // major ATS: Workday, Greenhouse, Lever, LinkedIn, SmartRecruiters, iCIMS,
  // BambooHR, Ashby, Taleo, SuccessFactors, Indeed, Rippling, Wellfound + generic.
  // ═══════════════════════════════════════════════════════════════════════════════

  var FF_SITE = (function () {
    var h = location.hostname.toLowerCase();
    if (h.includes('linkedin.com'))                           return 'linkedin';
    if (h.includes('greenhouse.io') || h.includes('boards.greenhouse')) return 'greenhouse';
    if (h.includes('lever.co'))                               return 'lever';
    if (h.includes('myworkdayjobs.com') || h.includes('workday.com')) return 'workday';
    if (h.includes('smartrecruiters.com'))                    return 'smartrecruiters';
    if (h.includes('icims.com'))                              return 'icims';
    if (h.includes('bamboohr.com'))                           return 'bamboohr';
    if (h.includes('ashbyhq.com') || h.includes('jobs.ashby'))return 'ashby';
    if (h.includes('indeed.com'))                             return 'indeed';
    if (h.includes('jobright.ai'))                            return 'jobright';
    if (h.includes('recruitee.com'))                          return 'recruitee';
    if (h.includes('taleo.net') || h.includes('taleo.com'))  return 'taleo';
    if (h.includes('successfactors.com') || h.includes('sap.com/careers')) return 'successfactors';
    if (h.includes('rippling.com'))                           return 'rippling';
    if (h.includes('dover.com'))                              return 'dover';
    if (h.includes('wellfound.com') || h.includes('angel.co')) return 'wellfound';
    if (h.includes('workable.com'))                           return 'workable';
    if (h.includes('jazzhr.com') || h.includes('resumatorjobs.com')) return 'jazzhr';
    if (h.includes('jobvite.com'))                            return 'jobvite';
    if (h.includes('breezy.hr'))                              return 'breezy';
    if (h.includes('freshteam.com') || h.includes('freshworks.com')) return 'freshteam';
    if (h.includes('pinpointrecruitment.com'))                return 'pinpoint';
    if (h.includes('careers-page.com') || h.includes('teamtailor.com')) return 'teamtailor';
    if (h.includes('comeet.com'))                             return 'comeet';
    if (h.includes('zohorecruit.com') || h.includes('recruit.zoho')) return 'zoho';
    return 'generic';
  })();

  var FF_ADAPTER_ACTION_SELECTORS = {
    workday: {
      next: [
        'button[data-automation-id="bottom-navigation-next-button"]',
        'button[data-automation-id*="next" i]',
        'button[aria-label*="next" i]'
      ],
      submit: [
        'button[data-automation-id="bottom-navigation-submit-button"]',
        'button[data-automation-id*="submit" i]',
        'button[aria-label*="submit" i]'
      ]
    },
    greenhouse: {
      next: ['button[type="submit"]', 'button[data-mapped="true"]'],
      submit: ['button[type="submit"]']
    },
    lever: {
      next: ['.application-page button[type="submit"]', 'button[type="submit"]'],
      submit: ['.application-page button[type="submit"]', 'button[type="submit"]']
    },
    icims: {
      next: ['button[id*="next" i]', 'input[type="button"][value*="next" i]'],
      submit: ['button[id*="submit" i]', 'input[type="submit"]']
    },
    smartrecruiters: {
      next: ['button[data-testid*="next" i]', 'button[aria-label*="continue" i]'],
      submit: ['button[data-testid*="submit" i]', 'button[aria-label*="submit" i]']
    },
    ashby: {
      next: ['button[data-testid*="next" i]', 'button[type="button"]'],
      submit: ['button[type="submit"]', 'button[data-testid*="submit" i]']
    },
    bamboohr: {
      next: ['button[data-fabric-component="Button"]', 'button[type="button"]'],
      submit: ['button[type="submit"]']
    }
  };

  // ── Levenshtein edit-distance (capped at maxDist for performance) ─────────────
  function editDist(a, b, maxDist) {
    if (Math.abs(a.length - b.length) > maxDist) return maxDist + 1;
    var la = a.length, lb = b.length;
    var prev = [], curr = [];
    for (var j = 0; j <= lb; j++) prev[j] = j;
    for (var i = 1; i <= la; i++) {
      curr[0] = i;
      for (var j = 1; j <= lb; j++) {
        curr[j] = a[i-1] === b[j-1]
          ? prev[j-1]
          : 1 + Math.min(prev[j-1], prev[j], curr[j-1]);
      }
      var tmp = prev; prev = curr; curr = tmp;
    }
    return prev[lb];
  }

  // ── Tokenise a label string into lowercase words ───────────────────────────────
  function tokenise(s) {
    return s.toLowerCase()
      .replace(/[^\w\s]/g, ' ')          // strip punctuation
      .replace(/([a-z])([A-Z])/g, '$1 $2') // split camelCase
      .replace(/_/g, ' ')
      .split(/\s+/)
      .filter(function (t) { return t.length > 0; });
  }

  function memoryTokens(text) {
    var stop = {
      'the':1,'and':1,'for':1,'your':1,'you':1,'are':1,'with':1,'this':1,'that':1,
      'what':1,'when':1,'where':1,'why':1,'how':1,'have':1,'has':1,'had':1,'from':1,
      'will':1,'would':1,'can':1,'could':1,'should':1,'about':1,'into':1,'form':1,
      'field':1,'please':1,'enter':1,'select':1,'choose':1,'optional':1,'required':1
    };
    return Array.from(new Set(tokenise(text).filter(function (t) {
      return t.length >= 3 && !stop[t];
    }))).slice(0, 20);
  }

  function buildMemoryKeyFromQuestion(questionText) {
    var toks = memoryTokens(questionText);
    return toks.sort().join('|');
  }

  function loadResponseMemoryFromExtension() {
    try {
      chrome.runtime.sendMessage({ action: 'getResponseMemory' }, function (res) {
        if (chrome.runtime.lastError || !res || !res.ok) return;
        FF_RESPONSE_MEMORY = Array.isArray(res.items) ? res.items : [];
        FF_RESPONSE_MEMORY_LOADED = true;
      });
    } catch (e) {}
  }

  function saveResponseMemoryToExtension(items) {
    if (!items || !items.length) return;
    clearTimeout(FF_MEMORY_SAVE_DEBOUNCE);
    FF_MEMORY_SAVE_DEBOUNCE = setTimeout(function () {
      try {
        chrome.runtime.sendMessage({ action: 'saveResponseMemory', items: items }, function () {});
      } catch (e) {}
    }, 300);
  }

  function scoreMemoryMatch(inputTokens, memoryItem) {
    if (!inputTokens || !inputTokens.length || !memoryItem) return 0;
    var mt = Array.isArray(memoryItem.tokens) ? memoryItem.tokens : [];
    if (!mt.length) return 0;
    var set = new Set(mt);
    var overlap = inputTokens.filter(function (t) { return set.has(t); }).length;
    if (overlap === 0) return 0;
    var density = overlap / Math.max(1, mt.length);
    var recencyBoost = memoryItem.updatedAt ? 1 + Math.min(0.2, (Date.now() - Number(memoryItem.updatedAt) < 14 * 24 * 60 * 60 * 1000) ? 0.2 : 0) : 1;
    return overlap * 3 + density * 2 + recencyBoost;
  }

  function getMemoryResponseForField(input, ctx) {
    if (!FF_RESPONSE_MEMORY_LOADED || !Array.isArray(FF_RESPONSE_MEMORY) || !FF_RESPONSE_MEMORY.length) return null;

    var questionText = (ctx && (ctx.label || ctx.all)) || '';
    if (isBlockedMemoryQuestion(questionText)) return null;
    var qTokens = memoryTokens(questionText);
    if (qTokens.length < 2) return null;

    var best = null;
    var bestScore = 0;
    for (var i = 0; i < FF_RESPONSE_MEMORY.length; i++) {
      var item = FF_RESPONSE_MEMORY[i];
      var score = scoreMemoryMatch(qTokens, item);
      if (score > bestScore) {
        best = item;
        bestScore = score;
      }
    }

    var threshold = 4.2;
    if (input && input.tagName === 'TEXTAREA') threshold = 5.2;
    if (input && input.tagName === 'SELECT') threshold = 4.8;
    if (!best || bestScore < threshold) return null;
    var response = String(best.response || '').trim();
    if (!response) return null;

    // For selects, only return if we can likely match to an option text/value.
    if (input && input.tagName === 'SELECT') {
      var optionsText = Array.from(input.options || []).map(function (o) {
        return ((o.textContent || '') + ' ' + (o.value || '')).toLowerCase();
      }).join(' | ');
      if (optionsText && !optionsText.includes(response.toLowerCase())) {
        var respTokens = tokenise(response);
        var hasToken = respTokens.some(function (t) { return t.length >= 3 && optionsText.includes(t); });
        if (!hasToken) return null;
      }
    }

    return response;
  }

  function isBlockedMemoryQuestion(questionText) {
    var q = String(questionText || '').toLowerCase();
    if (!q) return true;
    return /(captcha|otp|one.?time|verification code|security code|password|passcode|ssn|social security|credit card|bank account|routing|tax id|ein|consent|terms and conditions|privacy policy|signature|date of birth|dob)/.test(q);
  }

  // ── Phrase + token + fuzzy scorer: returns [0..∞] ────────────────────────────
  function kwScore(text, keywords) {
    if (!text || !keywords) return 0;
    var t = text.toLowerCase();
    var tokens = tokenise(text);
    var score = 0;
    for (var ki = 0; ki < keywords.length; ki++) {
      var kw = keywords[ki].toLowerCase();
      // Exact phrase
      if (t.includes(kw)) {
        score += kw.split(' ').length * 4 + 2;
        continue;
      }
      // Token-by-token overlap + fuzzy
      var kwToks = kw.split(' ');
      var matched = 0;
      for (var ti = 0; ti < kwToks.length; ti++) {
        var kt = kwToks[ti];
        if (kt.length < 3) continue;
        for (var ei = 0; ei < tokens.length; ei++) {
          var tok = tokens[ei];
          if (tok === kt) { matched += 2; break; }
          if (tok.length >= 4 && kt.length >= 4 && editDist(tok, kt, 2) <= 1) {
            matched += 1; break;
          }
        }
      }
      score += matched;
    }
    return score;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // LABEL DETECTION — 10-strategy cascade with confidence weights
  // Returns an object: { label, placeholder, name, id, ariaLabel, dataAttr,
  //                      sectionHdr, all, confidence }
  // ═══════════════════════════════════════════════════════════════════════════════
  function getFieldContext(el) {
    var sources = []; // { text, confidence }

    // ── Strategy 1: <label for="id"> ── confidence 1.00 ──────────────────────
    if (el.id) {
      try {
        var lbl = document.querySelector('label[for="' + CSS.escape(el.id) + '"]');
        if (lbl) sources.push({ text: lbl.innerText || lbl.textContent || '', conf: 1.00, key: 'label' });
      } catch (e) {}
    }

    // ── Strategy 2: aria-labelledby (multi-id) ── confidence 0.95 ─────────────
    var ariaBy = el.getAttribute('aria-labelledby');
    if (ariaBy) {
      var parts = ariaBy.split(/\s+/).map(function (id) {
        var le = document.getElementById(id);
        return le ? (le.innerText || le.textContent || '').trim() : '';
      }).filter(Boolean);
      if (parts.length) sources.push({ text: parts.join(' '), conf: 0.95, key: 'ariaLabelledby' });
    }

    // ── Strategy 3: aria-label attribute ── confidence 0.90 ───────────────────
    var ariaLbl = el.getAttribute('aria-label');
    if (ariaLbl && ariaLbl.trim()) sources.push({ text: ariaLbl.trim(), conf: 0.90, key: 'ariaLabel' });

    // ── Strategy 4: Ancestor <label> element ── confidence 0.85 ───────────────
    var anc = el.closest('label');
    if (anc) {
      var ancClone = anc.cloneNode(true);
      ancClone.querySelectorAll('input,textarea,select,button').forEach(function (n) { n.remove(); });
      var ancTxt = (ancClone.innerText || ancClone.textContent || '').trim();
      if (ancTxt) sources.push({ text: ancTxt, conf: 0.85, key: 'ancestorLabel' });
    }

    // ── Strategy 5: Site-specific data attributes ── confidence 0.82 ──────────
    var dataAttrKeys = [
      'data-automation-id',   // Workday
      'data-field-name',      // Generic / Lever
      'data-qa',              // Lever / Greenhouse
      'data-testid',          // Misc React
      'data-label',           // Custom
      'data-name',            // Custom
      'name',                 // form field name
      'id'                    // element id
    ];
    var dataAttrText = '';
    for (var dki = 0; dki < dataAttrKeys.length; dki++) {
      var dkv = el.getAttribute ? el.getAttribute(dataAttrKeys[dki]) : null;
      if (!dkv && dataAttrKeys[dki] === 'name') dkv = el.name || '';
      if (!dkv && dataAttrKeys[dki] === 'id')   dkv = el.id || '';
      if (dkv && dkv.trim()) { dataAttrText = dkv.trim(); break; }
    }
    if (dataAttrText) {
      var humanDataAttr = dataAttrText.replace(/[-_]/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2');
      sources.push({ text: humanDataAttr, conf: 0.82, key: 'dataAttr' });
    }

    // ── Strategy 6: Preceding sibling scan (up to 6) ── confidence 0.75 ───────
    var sib = el.previousElementSibling;
    for (var si = 0; si < 6 && sib; si++) {
      var sibCls = (sib.className || '').toLowerCase();
      var sibTag = sib.tagName;
      var isLabelLike = sibTag === 'LABEL' ||
        sibCls.includes('label') || sibCls.includes('field-name') || sibCls.includes('form-label') ||
        sibCls.includes('field-label') || sibCls.includes('input-label') || sibCls.includes('field__label') ||
        sibCls.includes('form__label') || sibCls.includes('question-label') || sibCls.includes('css-label') ||
        sib.tagName === 'DT' ||
        (sib.getAttribute && sib.getAttribute('role') === 'label');
      if (isLabelLike) {
        var sibTxt = (sib.innerText || sib.textContent || '').trim();
        if (sibTxt) { sources.push({ text: sibTxt, conf: 0.75, key: 'sibling' }); break; }
      }
      sib = sib.previousElementSibling;
    }

    // ── Strategy 7: Parent walk — find label-like element ── confidence 0.70 ───
    // IMPORTANT: Only add a label from a parent container if either:
    //   a) We haven't found a good label yet (no Strategy 1-6 hit at conf >= 0.70), OR
    //   b) The container has exactly ONE form field inside it (unambiguous single-field wrapper)
    // This prevents multi-field containers (like Lever's urls-question div that holds
    // LinkedIn URL, GitHub URL, Portfolio URL, and Other website all at once) from
    // injecting the FIRST field's label as context for EVERY field in that group.
    var alreadyHaveGoodLabel = sources.some(function (s) { return s.conf >= 0.70; });
    var node = el.parentElement;
    for (var pi = 0; pi < 5 && node; pi++) {
      // Workday: data-automation-id on wrapper
      var nodeAuto = node.getAttribute && node.getAttribute('data-automation-id');
      if (nodeAuto) {
        sources.push({ text: nodeAuto.replace(/[-_]/g, ' '), conf: 0.78, key: 'parentDataAttr' });
        break;
      }
      var nodeCls = (node.className || '').toLowerCase();
      var nodeTag = node.tagName;
      // Check for visible text children that look like labels
      if (nodeTag === 'FIELDSET' || nodeTag === 'LEGEND' || nodeCls.includes('form-group') ||
          nodeCls.includes('field-group') || nodeCls.includes('input-group') ||
          nodeCls.includes('question') || nodeCls.includes('form-field')) {

        // Count form inputs inside this container to detect multi-field wrappers
        var inputsInContainer = node.querySelectorAll('input:not([type="hidden"]),textarea,select').length;
        var isSingleField = inputsInContainer <= 1;

        // If it's a multi-field container AND we already have a good label → skip
        // (avoids "LinkedIn URL" contaminating "Portfolio URL" on Lever)
        if (!isSingleField && alreadyHaveGoodLabel) {
          node = node.parentElement;
          continue;
        }

        // For multi-field containers without a prior label, find the label PAIRED with
        // this specific input (the last label in DOM order before our element).
        var labelSelector = 'label,legend,span.label,p.label,[class*="label"]:not(input):not(textarea):not(select)';
        var innerLbl;
        if (!isSingleField) {
          // Find all labels in container and pick the closest one preceding our element
          var allContainerLabels = Array.from(node.querySelectorAll(labelSelector));
          var preceding = allContainerLabels.filter(function (lbl) {
            return !!(lbl.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING);
          });
          innerLbl = preceding[preceding.length - 1] || null;
        } else {
          innerLbl = node.querySelector(labelSelector);
        }

        if (innerLbl) {
          var ilClone = innerLbl.cloneNode(true);
          ilClone.querySelectorAll('input,textarea,select,button').forEach(function (n) { n.remove(); });
          var ilTxt = (ilClone.innerText || ilClone.textContent || '').replace(/[*:]+$/, '').trim();
          if (ilTxt && ilTxt.length < 120) {
            sources.push({ text: ilTxt, conf: 0.70, key: 'parentGroupLabel' }); break;
          }
        }
      }
      node = node.parentElement;
    }

    // ── Strategy 8: Placeholder text ── confidence 0.55 ──────────────────────
    var ph = el.placeholder || el.getAttribute('data-placeholder') || '';
    if (ph && ph.trim()) sources.push({ text: ph.trim(), conf: 0.55, key: 'placeholder' });

    // ── Strategy 9: Section / fieldset heading above ── confidence 0.40 ───────
    var secHdr = getSectionHeading(el);
    if (secHdr) sources.push({ text: secHdr, conf: 0.40, key: 'sectionHeading' });

    // ── Strategy 10: Shallow parent text (stripped) ── confidence 0.30 ─────────
    var par = el.parentElement;
    if (par) {
      var parClone = par.cloneNode(true);
      parClone.querySelectorAll('input,textarea,select,button,script,style').forEach(function (n) { n.remove(); });
      var parTxt = (parClone.innerText || parClone.textContent || '').trim();
      if (parTxt && parTxt.length < 80) sources.push({ text: parTxt, conf: 0.30, key: 'parentText' });
    }

    // ── Build normalised text blocks ─────────────────────────────────────────
    var label     = sources.find(function (s) { return s.key === 'label' || s.key === 'ariaLabelledby' || s.key === 'ariaLabel' || s.key === 'ancestorLabel'; });
    var labelTxt  = label ? label.text : '';
    var phTxt     = ph;
    var nameTxt   = (el.name || '').replace(/[-_]/g, ' ');
    var idTxt     = (el.id  || '').replace(/[-_]/g, ' ');
    var allParts  = sources.map(function (s) { return s.text; });
    allParts.push(nameTxt, idTxt);

    return {
      sources:     sources,              // full source list with confidence
      label:       labelTxt.toLowerCase(),
      placeholder: phTxt.toLowerCase(),
      name:        nameTxt.toLowerCase(),
      id:          idTxt.toLowerCase(),
      all:         allParts.join(' ').toLowerCase(),
      // Weighted text for scoring: label sources count more
      weighted:    sources.map(function (s) {
        return Array(Math.round(s.conf * 4)).fill(s.text).join(' ');
      }).join(' ').toLowerCase()
    };
  }

  // ── Section heading finder ─────────────────────────────────────────────────────
  function getSectionHeading(el) {
    var node = el.parentElement;
    for (var i = 0; i < 10 && node && node !== document.body; i++) {
      var hdrEl = node.querySelector('h1,h2,h3,h4,h5,legend,[class*="section-title"],[class*="section-header"],[class*="section-name"],[class*="step-title"],[class*="group-title"]');
      if (hdrEl && hdrEl !== el) {
        var txt = (hdrEl.innerText || hdrEl.textContent || '').trim();
        if (txt && txt.length < 80) return txt;
      }
      node = node.parentElement;
    }
    return '';
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // FIELD DEFINITIONS — 42 field types with multi-keyword arrays
  // ═══════════════════════════════════════════════════════════════════════════════
  function buildFieldDefs(p) {
    var F = [
      // ── Identity ──────────────────────────────────────────────────────────
      { type: 'firstName', value: p.firstName, priority: 10, inputTypes: ['text','search'],
        kw: ['first name','firstname','first-name','fname','given name','given-name','forename','preferred first name','legal first name','first'] },
      { type: 'lastName', value: p.lastName, priority: 10, inputTypes: ['text','search'],
        kw: ['last name','lastname','last-name','lname','surname','family name','family-name','last'] },
      { type: 'middleName', value: p.middleName || '', priority: 6, inputTypes: ['text'],
        kw: ['middle name','middlename','middle initial','middle-name','middle'] },
      { type: 'fullName', value: p.fullName, priority: 5,
        kw: ['full name','fullname','full-name','your name','name','candidate name','applicant name','legal name','preferred name','complete name'] },
      { type: 'suffix', value: p.suffix || '', priority: 3, inputTypes: ['text'],
        kw: ['suffix','name suffix','jr','sr','ii','iii'] },
      { type: 'pronouns', value: p.pronouns || '', priority: 3, inputTypes: ['text','select'],
        kw: ['pronouns','preferred pronouns','gender pronouns'] },

      // ── Contact ───────────────────────────────────────────────────────────
      { type: 'email', value: p.email, priority: 10, inputTypes: ['email','text'],
        kw: ['email','e-mail','email address','emailaddress','email-address','your email','work email','personal email','contact email','primary email'] },
      { type: 'phone', value: p.contactNumber, priority: 10, inputTypes: ['tel','text','number'],
        kw: ['phone','mobile','telephone','cell','contact number','phone number','mobile number','phonenumber','contact','cell phone','primary phone','best phone','phone/mobile'] },
      { type: 'phoneExt', value: p.phoneExt || '', priority: 3, inputTypes: ['text','number'],
        kw: ['extension','phone ext','ext.','phone extension'] },

      // ── Social / links ────────────────────────────────────────────────────
      { type: 'linkedin', value: p.linkedinUrl, priority: 9, inputTypes: ['url','text'],
        kw: ['linkedin','linkedin url','linkedin profile','linkedin-url','linkedin profile url','linkedin.com','linkedin link','linkedin profile link','in profile','linkedin profile link','connect on linkedin','professional profile','social profile linkedin'] },
      { type: 'github', value: p.githubUrl, priority: 8, inputTypes: ['url','text'],
        kw: ['github','github url','github profile','github-url','github.com','github link','github profile link','source code','code repository','git profile','code profile','github account'] },
      // portfolio / "other website" — catches any generic website / other link field
      { type: 'portfolio', value: p.portfolioUrl || '', priority: 7, inputTypes: ['url','text'],
        kw: ['portfolio','portfolio url','website','personal site','personal website','personal url','personal link','website url','online portfolio','work samples','work portfolio','your website','personal portfolio','other website','other url','other link','other site','additional url','additional website','optional url','website or portfolio','web presence','online presence','professional website'] },
      { type: 'twitter', value: p.twitterUrl || '', priority: 4, inputTypes: ['url','text'],
        kw: ['twitter','twitter url','twitter profile','tweet','x.com','x profile','x url','twitter handle'] },
      { type: 'stackoverflow', value: p.stackoverflowUrl || '', priority: 4, inputTypes: ['url','text'],
        kw: ['stackoverflow','stack overflow','stack-overflow','stack overflow profile'] },
      { type: 'dribbble', value: p.dribbbleUrl || '', priority: 3, inputTypes: ['url','text'],
        kw: ['dribbble','dribbble url','design portfolio','behance','behance url','design url'] },

      // ── Location ──────────────────────────────────────────────────────────
      { type: 'streetAddress', value: p.streetAddress || p.address, priority: 6,
        kw: ['street address','address line 1','address 1','streetaddress','home address','mailing address','residential address','current address','your address','street'] },
      { type: 'addressLine2', value: p.addressLine2 || '', priority: 4,
        kw: ['address line 2','address 2','apt','suite','unit','apartment','floor'] },
      { type: 'city', value: p.city, priority: 8,
        kw: ['city','town','current city','city of residence','city name','municipality','suburb'] },
      { type: 'state', value: p.state, priority: 8,
        kw: ['state','province','state / province','state/province','region','territory','prefecture'] },
      { type: 'country', value: p.country, priority: 6,
        kw: ['country','nation','country of residence','country name','country/region','citizenship country'] },
      { type: 'zip', value: p.zip || '', priority: 6,
        kw: ['zip','postal','postal code','zip code','postcode','pin code','zipcode'] },

      // ── Current / last job ────────────────────────────────────────────────
      { type: 'currentTitle', value: p.currentTitle || p.lastJobTitle, priority: 8,
        kw: ['current title','current position','current job title','job title','your title','professional title','headline','current role','role title','position title','title'] },
      { type: 'lastEmployer', value: p.lastEmployer, priority: 8,
        kw: ['current employer','last employer','current company','last company','employer','company name','organization','most recent employer','recent employer','current organization','place of work','company/organization'] },
      { type: 'lastJobTitle', value: p.lastJobTitle, priority: 7,
        kw: ['most recent job title','last job title','previous job title','recent job title','previous title','last title','former title','previous position','last position','previous role'] },
      { type: 'lastJobStart', value: p.lastJobStart, priority: 5, inputTypes: ['date','month','text'],
        kw: ['start date','from date','employment start','start of employment','began','from','job start','position start','start month','start year'] },
      { type: 'lastJobEnd', value: p.lastJobEnd || 'Present', priority: 5, inputTypes: ['date','month','text'],
        kw: ['end date','to date','employment end','end of employment','ended','to','job end','position end','end month','end year','current job end','present'] },
      { type: 'lastJobDesc', value: p.lastJobResponsibilities, priority: 4, inputTypes: ['textarea'],
        kw: ['responsibilities','job responsibilities','duties','describe your role','describe your experience','what did you do','key responsibilities','work description','describe work','role description','describe duties','daily responsibilities','job description','previous responsibilities','describe experience'] },
      { type: 'totalExperience', value: p.experienceLevel, priority: 6, inputTypes: ['text','number','select'],
        kw: ['years of experience','experience level','work experience','years experience','experience years','total experience','how many years','number of years','years worked','professional experience years','career experience'] },

      // ── Education ─────────────────────────────────────────────────────────
      { type: 'schoolName', value: p.schoolName, priority: 8,
        kw: ['school','university','college','institution','school name','university name','college name','where did you study','educational institution','alma mater','highest education school','institution name','school/university'] },
      { type: 'degreeLevel', value: p.degreeLevel, priority: 8,
        kw: ['degree','degree level','highest degree','highest education','degree type','level of education','highest level of education','educational qualification','academic degree','highest qualification'] },
      { type: 'fieldOfStudy', value: p.fieldOfStudy, priority: 8,
        kw: ['field of study','major','area of study','course','specialization','concentration','subject','discipline','area of concentration','study field','program of study','academic major'] },
      { type: 'graduationYear', value: p.graduationYear, priority: 5, inputTypes: ['text','number','select'],
        kw: ['graduation year','year of graduation','graduated','completion year','year completed','graduation date','expected graduation','degree year','year awarded'] },
      { type: 'gpa', value: p.bachelorsGPA, priority: 5, inputTypes: ['text','number'],
        kw: ['gpa','grade point average','cgpa','grade point','cumulative gpa','academic gpa','overall gpa'] },
      { type: 'coursework', value: p.coursework || '', priority: 3, inputTypes: ['textarea','text'],
        kw: ['coursework','relevant courses','courses taken','academic courses','key courses','relevant coursework'] },

      // ── Summary / Cover Letter ────────────────────────────────────────────
      { type: 'summary', value: p.summaryText, priority: 4, inputTypes: ['textarea'],
        kw: ['summary','professional summary','about yourself','about you','tell us about yourself','background','brief description','bio','introduction','objective','career objective','professional background'] },
      { type: 'coverLetter', value: p.summaryText, priority: 4, inputTypes: ['textarea'],
        kw: ['cover letter','covering letter','why do you want','motivation','personal statement','why are you interested','why join','why apply','why this role','why this company','why this position','message to hiring manager','write a note','add a note','additional information','anything else','message','comments','tell us more'] },

      // ── Skills ────────────────────────────────────────────────────────────
      { type: 'skills', value: p.skillsText, priority: 5, inputTypes: ['textarea','text'],
        kw: ['skills','technical skills','key skills','list your skills','your skills','core skills','technologies','tools and technologies','programming languages','tech stack','competencies','expertise','proficiencies','areas of expertise','tools','software skills'] },
      { type: 'languages', value: p.languagesText || '', priority: 4, inputTypes: ['textarea','text'],
        kw: ['languages','spoken languages','language skills','languages spoken','programming language','other languages'] },

      // ── Work Authorization / Visa ─────────────────────────────────────────
      { type: 'visa', value: p.visaStatus, priority: 7,
        kw: ['visa','visa status','work authorization','work permit','work auth','authorization','work eligibility','employment eligibility','legal status','immigration status','right to work','work rights','authorized to work','eligible to work'] },
      { type: 'sponsorship', value: p.needsSponsorship || 'No', priority: 6,
        kw: ['sponsorship','require sponsorship','visa sponsorship','need sponsorship','sponsor','h1b','h-1b','need visa','require visa','visa required'] },

      // ── Salary ────────────────────────────────────────────────────────────
      { type: 'salary', value: p.expectedSalaryRange, priority: 5,
        kw: ['salary','expected salary','salary expectation','desired salary','compensation','salary range','pay expectation','annual salary','ctc','package','salary requirement','total compensation','base salary'] },
      { type: 'salaryMin', value: p.salaryMin || '', priority: 4, inputTypes: ['text','number'],
        kw: ['minimum salary','salary minimum','salary min','min salary','base salary min','floor salary'] },
      { type: 'salaryMax', value: p.salaryMax || '', priority: 4, inputTypes: ['text','number'],
        kw: ['maximum salary','salary maximum','salary max','max salary','top salary','ceiling salary'] },
      { type: 'currentSalary', value: p.currentSalary || '', priority: 4,
        kw: ['current salary','current ctc','current compensation','present salary','current package','existing salary'] },

      // ── Availability ──────────────────────────────────────────────────────
      { type: 'joinDate', value: p.joinDate, priority: 5,
        kw: ['start date','join date','available from','earliest start','when can you start','availability','available to start','expected start'] },
      { type: 'noticePeriod', value: p.noticePeriod || '', priority: 5,
        kw: ['notice period','notice','how soon can you join','time to join','availability period','serving notice','notice required'] },

      // ── Education full-text fields ────────────────────────────────────────
      { type: 'bachelor', value: p.bachelorsUniDegree, priority: 5,
        kw: ["bachelor's degree","bachelors degree","bachelor degree","undergraduate degree","bachelors university","bs degree","ba degree","undergraduate institution","bachelor's education"] },
      { type: 'masters', value: p.mastersUniDegree, priority: 5,
        kw: ["master's degree","masters degree","master degree","graduate degree","postgraduate","ms degree","ma degree","mba degree","graduate institution","master's education"] },

      // ── Diversity / EEO (US compliance) ──────────────────────────────────
      { type: 'gender', value: p.gender || '', priority: 3,
        kw: ['gender','sex','gender identity','identify as'] },
      { type: 'ethnicity', value: p.ethnicity || '', priority: 3,
        kw: ['ethnicity','race','racial','ethnic','race/ethnicity','racial background'] },
      { type: 'veteranStatus', value: p.veteranStatus || '', priority: 3,
        kw: ['veteran','veteran status','military','military service','protected veteran','armed forces'] },
      { type: 'disability', value: p.disability || '', priority: 3,
        kw: ['disability','disabled','disability status','accommodation','ada','differently abled'] },

      // ── Misc ─────────────────────────────────────────────────────────────
      { type: 'hearAboutUs', value: p.hearAboutUs || 'LinkedIn', priority: 3,
        kw: ['hear about','heard about','how did you find','how did you learn','source','referral source','how did you come across','where did you hear','where did you find','how did you know'] },
      { type: 'referralName', value: p.referralName || '', priority: 3,
        kw: ['referral','referred by','employee referral','referral name','who referred','who recommended'] },
      { type: 'securityClearance', value: p.securityClearance || '', priority: 4,
        kw: ['security clearance','clearance level','clearance','secret clearance','top secret','government clearance'] },
      { type: 'driversLicense', value: p.driversLicense || '', priority: 3,
        kw: ["driver's license","drivers license","driving license","driver license","driving licence"] },
      { type: 'linkedinPublicUrl', value: p.linkedinUrl, priority: 5, inputTypes: ['url','text'],
        kw: ['public profile url','public linkedin url','linkedin public','your public profile'] },

      // ── Certifications ────────────────────────────────────────────────────
      { type: 'certifications', value: p.certificationsText || '', priority: 4, inputTypes: ['textarea','text'],
        kw: ['certifications','certifications and licenses','licenses','credentials','professional certifications','certifications/licenses','certificates','professional certificates','awards and certifications','licenses & certifications','additional qualifications'] }
    ];

    // Remove defs with no value
    return F.filter(function (d) { return d.value && String(d.value).trim(); });
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // SCORING ENGINE — weighted multi-source scoring
  // ═══════════════════════════════════════════════════════════════════════════════
  function scoreBestDef(input, ctx, defs) {
    var bestDef = null;
    var bestScore = 0;

    var autoHint = mapAutocompleteToDef(input);
    if (autoHint) {
      var hinted = defs.find(function (d) { return d.type === autoHint; });
      if (hinted) return { def: hinted, score: 9500 };
    }

    // Hard type overrides (highest confidence)
    if (input.type === 'email') {
      var em = defs.find(function (d) { return d.type === 'email'; });
      if (em) return { def: em, score: 9999 };
    }
    if (input.type === 'tel') {
      var ph = defs.find(function (d) { return d.type === 'phone'; });
      if (ph) return { def: ph, score: 9999 };
    }
    if (input.type === 'url') {
      // URL context disambiguation — check label, placeholder, name, id, and data-attrs
      // Many ATS use placeholder="https://linkedin.com/in/..." or name="linkedin_url"
      // so we check ctx.all (which includes all those sources)
      var ua = ctx.all + ' ' + (input.placeholder || '') + ' ' + (input.name || '') + ' ' + (input.id || '');
      ua = ua.toLowerCase();
      var urlDef;
      var explicitLinkedIn = /\blinked\s*in\b|\blinkedin\b/.test(ua);
      var explicitGithub = /\bgithub\b/.test(ua);
      var explicitTwitter = /\btwitter\b|\bx\.com\b/.test(ua);
      var explicitStack = /\bstack\b|\boverflow\b/.test(ua);
      var explicitDribbble = /\bdribbble\b|\bbehance\b/.test(ua);
      var explicitPortfolio = /\bportfolio\b|\bother website\b|\bother url\b|\bwebsite\b/.test(ua);

      if (explicitLinkedIn) {
        urlDef = defs.find(function (d) { return d.type === 'linkedin'; });
        if (!urlDef) return null; // Never fill LinkedIn slot with other link types
      } else if (explicitGithub) {
        urlDef = defs.find(function (d) { return d.type === 'github'; });
        if (!urlDef) return null; // Never fill GitHub slot with LinkedIn/portfolio
      } else if (explicitTwitter) {
        urlDef = defs.find(function (d) { return d.type === 'twitter'; });
        if (!urlDef) return null;
      } else if (explicitStack) {
        urlDef = defs.find(function (d) { return d.type === 'stackoverflow'; });
        if (!urlDef) return null;
      } else if (explicitDribbble) {
        urlDef = defs.find(function (d) { return d.type === 'dribbble'; });
        if (!urlDef) return null;
      } else if (explicitPortfolio) {
        urlDef = defs.find(function (d) { return d.type === 'portfolio'; });
        if (!urlDef) return null;
      } else {
        // Unknown URL slot: prefer portfolio/website only; do not leak LinkedIn by default.
        urlDef = defs.find(function (d) { return d.type === 'portfolio'; });
      }
      if (urlDef) return { def: urlDef, score: 8000 };
      return null; // For URL fields, prefer no fill over wrong-link fill.
    }

    for (var di = 0; di < defs.length; di++) {
      var def = defs[di];
      if (!def.value) continue;

      // Input type restriction
      if (def.inputTypes) {
        var itype = (input.type || '').toLowerCase() || (input.tagName === 'TEXTAREA' ? 'textarea' : 'text');
        var tagL  = input.tagName.toLowerCase();
        var allowed = def.inputTypes.indexOf(itype) !== -1 || def.inputTypes.indexOf(tagL) !== -1;
        if (!allowed) continue;
      }

      // Score each context source weighted by its confidence
      var totalScore = 0;
      for (var si = 0; si < ctx.sources.length; si++) {
        var src = ctx.sources[si];
        var s = kwScore(src.text, def.kw);
        if (s > 0) totalScore += s * src.conf;
      }
      // Also score name/id with lower weight
      totalScore += kwScore(ctx.name, def.kw) * 0.5;
      totalScore += kwScore(ctx.id, def.kw) * 0.4;

      if (totalScore > 0) {
        totalScore *= (def.priority || 1);
      }

      if (totalScore > bestScore) { bestScore = totalScore; bestDef = def; }
    }

    return bestScore > 0 ? { def: bestDef, score: bestScore } : null;
  }

  // Negative patterns — fields we should NEVER autofill
  var FF_NEGATIVE_KW = [
    'captcha','recaptcha','security code','otp','one-time','verification code',
    'password','confirm password','re-enter password','new password',
    'search','filter','query','find jobs','keywords',
    'notes','internal notes','recruiter notes','hiring notes',
    'eeoc','eeo optional'
  ];
  function isNegativeField(ctx) {
    var all = ctx.all;
    for (var i = 0; i < FF_NEGATIVE_KW.length; i++) {
      if (all.includes(FF_NEGATIVE_KW[i])) return true;
    }
    return false;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // INPUT COLLECTORS (including shadow DOM)
  // ═══════════════════════════════════════════════════════════════════════════════
  function deepQueryAll(root, selector) {
    var results = [];
    try {
      var found = Array.from(root.querySelectorAll(selector));
      results = results.concat(found);
      // Traverse shadow roots
      var allEls = root.querySelectorAll('*');
      for (var i = 0; i < allEls.length; i++) {
        if (allEls[i].shadowRoot) {
          results = results.concat(deepQueryAll(allEls[i].shadowRoot, selector));
        }
      }
    } catch (e) {}
    return results;
  }

  function collectAllInputs() {
    var textSel =
      'input:not([type="hidden"]):not([type="submit"]):not([type="button"])' +
      ':not([type="file"]):not([type="image"]):not([type="checkbox"]):not([type="radio"]):not([type="password"]),' +
      'textarea,select';

    var textEls = deepQueryAll(document, textSel).filter(function (el) {
      return !el.disabled && !el.readOnly && isVisible(el);
    });

    // Radio groups keyed by name or nearest fieldset id
    var radioMap = {};
    deepQueryAll(document, 'input[type="radio"]').filter(function (r) {
      return !r.disabled && isVisible(r);
    }).forEach(function (r) {
      var key = r.name;
      if (!key) {
        var fs = r.closest('fieldset,[role="radiogroup"],[role="group"]');
        key = fs ? (fs.id || fs.getAttribute('data-automation-id') || 'group_' + Math.random()) : 'anon_' + Math.random();
      }
      if (!radioMap[key]) radioMap[key] = [];
      radioMap[key].push(r);
    });

    var checkboxes = deepQueryAll(document, 'input[type="checkbox"]').filter(function (c) {
      return !c.disabled && isVisible(c);
    });

    // Custom combobox widgets (Workday, SmartRecruiters etc.)
    var comboboxes = deepQueryAll(document, '[role="combobox"],[aria-haspopup="listbox"],[aria-haspopup="true"]')
      .filter(function (el) {
        return el.tagName !== 'INPUT' && el.tagName !== 'SELECT' && isVisible(el);
      });

    var contenteditable = deepQueryAll(document, '[contenteditable="true"]').filter(function (el) {
      return isVisible(el) && el.tagName !== 'BODY' && el.tagName !== 'HTML';
    });

    return {
      text:          textEls,
      radios:        Object.values(radioMap),
      checkboxes:    checkboxes,
      comboboxes:    comboboxes,
      contenteditable: contenteditable
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // MAIN FILL FUNCTION
  // ═══════════════════════════════════════════════════════════════════════════════
  function fillApplicationForm(profile) {
    var p = profile || {};
    // Ensure fullName is available
    if (!p.fullName && p.firstName) p.fullName = [p.firstName, p.lastName].filter(Boolean).join(' ');

    var defs        = buildFieldDefs(p);
    var inputs      = collectAllInputs();
    var filledCount = 0;
    var skippedExisting = 0;
    var filledTypes = {};
    var unmatchedLabels = [];

    // Field deduplication: track which field types have already been filled
    // so a second input scoring for the same def type gets skipped.
    // Exception: textarea gets its own slot (e.g. two separate description fields).
    var usedDefTypes = {};

    // ── Pass 1: text / textarea / select / number / date ──────────────────────
    inputs.text.forEach(function (input) {
      if (isSensitiveInput(input)) return;

      // Skip already-filled (user may have typed something).
      // BUT don't skip URL inputs that only have a bare protocol prefix like
      // "https://" or "http://" — many ATS pre-populate these and we should
      // still fill in the actual URL.
      var currentVal = input.value ? input.value.trim() : '';
      var isUrlPrefix = /^https?:\/\/?$/.test(currentVal);
      if (currentVal.length > 2 && !isUrlPrefix && input.tagName !== 'SELECT') {
        skippedExisting++;
        return;
      }

      var ctx    = getFieldContext(input);
      if (isNegativeField(ctx)) return;

      var result = scoreBestDef(input, ctx, defs);
      if (!result) {
        var memoryResponse = getMemoryResponseForField(input, ctx);
        if (!memoryResponse) {
          var rawLabel = String((ctx && (ctx.label || ctx.all)) || '').trim();
          if (rawLabel && rawLabel.length >= 4) {
            unmatchedLabels.push(rawLabel.slice(0, 120));
          }
          return;
        }
        fillInput(input, memoryResponse);
        filledCount++;
        if (!filledTypes.memoryResponse) filledTypes.memoryResponse = true;
        return;
      }
      var def    = result.def;

      // fullName: only fill if no separate first/last fields in this form
      if (def.type === 'fullName') {
        var hasFL = inputs.text.some(function (o) {
          if (o === input) return false;
          var oc = getFieldContext(o);
          return /first|fname|lname|last/.test(oc.name + oc.id + oc.label);
        });
        if (hasFL) return;
      }

      // Long-form text: only in textarea
      var longTypes = { summary: 1, coverLetter: 1, lastJobDesc: 1 };
      if (longTypes[def.type] && input.tagName !== 'TEXTAREA') return;

      // Skills: prefer textarea, but allow text input too
      if (def.type === 'skills' && input.tagName === 'TEXTAREA' && input.value && input.value.trim().length > 2) return;

      // Deduplication: skip if this def type was already filled,
      // except for textarea fields (multiple text areas ok) and URL inputs
      // (forms like Lever have LinkedIn URL, GitHub URL, Portfolio URL, Other website —
      // all are distinct URL slots and should each fill independently).
      var isUrlInput = (input.type === 'url');
      var dedupKey = def.type + (input.tagName === 'TEXTAREA' ? '_ta' : '');
      if (!isUrlInput && usedDefTypes[dedupKey]) return;

      fillInput(input, def.value);
      if (!isUrlInput) usedDefTypes[dedupKey] = true;
      filledCount++;
      if (!filledTypes[def.type]) filledTypes[def.type] = true;
    });

    // ── Pass 2: custom combobox / ARIA widgets ─────────────────────────────────
    inputs.comboboxes.forEach(function (el) {
      var ctx = getFieldContext(el);
      if (isNegativeField(ctx)) return;
      var result = scoreBestDef(el, ctx, defs);
      if (!result) return;
      fillCustomCombobox(el, result.def.value);
    });

    // ── Pass 3: radio button groups ────────────────────────────────────────────
    inputs.radios.forEach(function (group) {
      fillRadioGroup(group, p);
    });

    // ── Pass 4: checkboxes ─────────────────────────────────────────────────────
    inputs.checkboxes.forEach(function (cb) {
      fillCheckbox(cb, p);
    });

    // ── Pass 5: contenteditable (LinkedIn rich-text inputs) ────────────────────
    inputs.contenteditable.forEach(function (el) {
      if (el.textContent && el.textContent.trim().length > 2) return;
      var ctx = getFieldContext(el);
      if (isNegativeField(ctx)) return;
      var result = scoreBestDef(el, ctx, defs);
      if (!result) return;
      fillContentEditable(el, result.def.value);
      filledCount++;
    });

    return {
      filled: filledCount,
      total:  inputs.text.length,
      skippedExisting: skippedExisting,
      fields: Object.keys(filledTypes),
      unmatchedLabels: Array.from(new Set(unmatchedLabels)).slice(0, 12)
    };
  }

  function extractCurrentResponsesFromPage() {
    var selector =
      'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="password"]),textarea,select';
    var fields = deepQueryAll(document, selector).filter(function (el) {
      return isVisible(el) && !el.disabled;
    });
    var results = [];

    fields.forEach(function (el) {
      if (isSensitiveInput(el)) return;
      var ctx = getFieldContext(el);
      if (isNegativeField(ctx)) return;

      var question = String((ctx && (ctx.label || ctx.all)) || '').trim();
      if (!question || question.length < 4) return;
      if (isBlockedMemoryQuestion(question)) return;

      var value = '';
      var type = String(el.type || '').toLowerCase();
      if (el.tagName === 'SELECT') {
        var opt = el.selectedOptions && el.selectedOptions[0];
        value = String((opt && (opt.textContent || opt.value)) || '').trim();
      } else if (type === 'checkbox') {
        value = el.checked ? 'Yes' : 'No';
      } else if (type === 'radio') {
        if (!el.checked) return;
        value = String(getLabelText(el) || el.value || '').trim();
      } else {
        value = String(el.value || '').trim();
      }

      if (!value) return;
      if (value.length < 2 && !/^(y|n|yes|no)$/i.test(value)) return;
      if (/^(select|choose|--|n\/a)$/i.test(value)) return;

      var key = buildMemoryKeyFromQuestion(question);
      if (!key) return;
      results.push({
        key: key,
        tokens: memoryTokens(question),
        question: question.slice(0, 280),
        response: value.slice(0, 1200),
        count: 1,
        lastHost: location.hostname
      });
    });

    var map = {};
    results.forEach(function (it) { map[it.key] = it; });
    return Object.values(map);
  }

  function captureAndSaveResponseMemory() {
    if (!FF_MEMORY_CAPTURE_ENABLED) return;
    var items = extractCurrentResponsesFromPage();
    if (!items.length) return;
    saveResponseMemoryToExtension(items);
  }

  function attachResponseMemoryListeners() {
    document.addEventListener('submit', function () {
      captureAndSaveResponseMemory();
    }, true);

    document.addEventListener('click', function (ev) {
      var t = ev && ev.target;
      if (!t || !t.closest) return;
      var btn = t.closest('button,input[type="submit"],input[type="button"],[role="button"]');
      if (!btn) return;
      var txt = getActionText(btn).toLowerCase();
      if (!txt) return;
      if (!/(next|continue|review|submit|apply|finish)/.test(txt)) return;
      if (/(cancel|close|discard|delete|withdraw)/.test(txt)) return;
      captureAndSaveResponseMemory();
    }, true);
  }

  attachResponseMemoryListeners();

  function mapAutocompleteToDef(input) {
    if (!input || !input.getAttribute) return null;
    var ac = String(input.getAttribute('autocomplete') || '').toLowerCase().trim();
    if (!ac) return null;

    if (/\bgiven-name\b/.test(ac)) return 'firstName';
    if (/\bfamily-name\b/.test(ac)) return 'lastName';
    if (/\bname\b/.test(ac)) return 'fullName';
    if (/\bemail\b/.test(ac)) return 'email';
    if (/\btel\b/.test(ac)) return 'phone';
    if (/\baddress-line1\b/.test(ac)) return 'streetAddress';
    if (/\baddress-line2\b/.test(ac)) return 'addressLine2';
    if (/\baddress-level2\b/.test(ac)) return 'city';
    if (/\baddress-level1\b/.test(ac)) return 'state';
    if (/\bpostal-code\b/.test(ac)) return 'zip';
    if (/\bcountry\b/.test(ac)) return 'country';
    if (/\borganization\b/.test(ac)) return 'lastEmployer';
    if (/\burl\b/.test(ac)) return 'portfolio';
    return null;
  }

  function isSensitiveInput(input) {
    if (!input) return false;
    var type = String(input.type || '').toLowerCase();
    if (type === 'password') return true;

    var ac = String(input.getAttribute && input.getAttribute('autocomplete') || '').toLowerCase();
    if (/(one-time-code|current-password|new-password|cc-number|cc-csc|cc-exp|transaction-amount)/.test(ac)) return true;

    var identity = (
      String(input.name || '') + ' ' +
      String(input.id || '') + ' ' +
      String(input.getAttribute && input.getAttribute('aria-label') || '')
    ).toLowerCase();
    if (/(otp|one.?time|captcha|security.?code|verification.?code|passcode|password|token)/.test(identity)) return true;
    return false;
  }

  // ── Autopilot (SpeedyApply-style): auto-next / optional auto-submit ─────────
  function maybeRunAutopilot(opts, fillResult) {
    var settings = {
      autoClickNextPage: true,
      autoSubmit: false,
      ...(opts || {})
    };

    var result = { clickedNext: false, clickedSubmit: false, targetText: '' };
    var totalDetected = Number(fillResult && fillResult.total || 0);
    var totalFilled = Number(fillResult && fillResult.filled || 0);
    if (totalDetected < 3) return result;
    if (totalFilled < 1) return result;
    if (!isLikelyApplicationFlow()) return result;

    // submit is opt-in only
    if (settings.autoSubmit) {
      var submitButtons = collectActionButtons('submit');
      var submitBtn = pickBestActionButton(submitButtons, 'submit');
      if (submitBtn && isSafeToClick(submitBtn, 'submit')) {
        result.clickedSubmit = safeClickButton(submitBtn);
        result.targetText = getActionText(submitBtn);
        if (result.clickedSubmit) return result;
      }
    }

    if (settings.autoClickNextPage) {
      var nextButtons = collectActionButtons('next');
      var nextBtn = pickBestActionButton(nextButtons, 'next');
      if (nextBtn && isSafeToClick(nextBtn, 'next')) {
        result.clickedNext = safeClickButton(nextBtn);
        result.targetText = getActionText(nextBtn);
      }
    }

    return result;
  }

  function collectActionButtons(mode) {
    var adapter = FF_ADAPTER_ACTION_SELECTORS[FF_SITE] || {};
    var modeSelectors = Array.isArray(adapter[mode]) ? adapter[mode] : [];
    var selectors = [
      ...modeSelectors,
      'button[type="submit"]',
      'button',
      'input[type="submit"]',
      'input[type="button"]',
      '[role="button"]',
      '[data-automation-id*="next" i]',
      '[data-automation-id*="continue" i]',
      '[data-automation-id*="submit" i]'
    ];
    var all = [];
    selectors.forEach(function (sel) {
      deepQueryAll(document, sel).forEach(function (el) {
        if (!el || all.indexOf(el) !== -1) return;
        if (!isVisible(el)) return;
        if (el.disabled) return;
        all.push(el);
      });
    });
    return all;
  }

  function pickBestActionButton(buttons, mode) {
    var positive = mode === 'submit'
      ? ['submit application', 'submit', 'apply now', 'send application', 'finish and submit']
      : ['next', 'continue', 'review', 'save and continue', 'continue to next step', 'next step'];

    var negative = mode === 'submit'
      ? ['next', 'continue', 'cancel', 'close', 'discard', 'back']
      : ['submit', 'cancel', 'close', 'discard', 'delete', 'remove', 'withdraw'];

    var best = null;
    var bestScore = 0;
    buttons.forEach(function (btn) {
      var text = getActionText(btn);
      if (!text) return;
      var score = 0;
      var lower = text.toLowerCase();
      positive.forEach(function (p) { if (lower.includes(p)) score += p.length + 6; });
      negative.forEach(function (n) { if (lower.includes(n)) score -= n.length + 8; });
      if (mode === 'submit' && (btn.type || '').toLowerCase() === 'submit') score += 4;
      if (score > bestScore) {
        best = btn;
        bestScore = score;
      }
    });
    return bestScore > 4 ? best : null;
  }

  function getActionText(btn) {
    if (!btn) return '';
    return String(
      btn.innerText ||
      btn.textContent ||
      btn.value ||
      btn.getAttribute('aria-label') ||
      btn.getAttribute('title') ||
      ''
    ).trim().replace(/\s+/g, ' ');
  }

  function isSafeToClick(btn, mode) {
    if (!btn || btn.disabled) return false;
    var text = getActionText(btn).toLowerCase();
    if (!text) return false;
    if (!isClickTargetClearlyVisible(btn)) return false;

    // never auto-click destructive actions
    if (/cancel|close|discard|delete|remove|withdraw|decline/.test(text)) return false;
    if (mode === 'next' && /submit|apply/.test(text)) return false;
    if (mode === 'submit' && /next|continue|review/.test(text)) return false;
    if (!buttonIsInLikelyForm(btn)) return false;

    return true;
  }

  function isClickTargetClearlyVisible(btn) {
    try {
      var style = window.getComputedStyle(btn);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
      if (style.pointerEvents === 'none') return false;
      if (Number(style.opacity || '1') < 0.2) return false;
      var rect = btn.getBoundingClientRect();
      if (rect.width < 24 || rect.height < 16) return false;
      var cx = rect.left + rect.width / 2;
      var cy = rect.top + rect.height / 2;
      var topEl = document.elementFromPoint(cx, cy);
      if (!topEl) return false;
      return btn === topEl || btn.contains(topEl) || topEl.contains(btn);
    } catch (e) {
      return false;
    }
  }

  function buttonIsInLikelyForm(btn) {
    if (!btn) return false;
    if (btn.closest('form,[role="form"],[data-automation-id*="form" i]')) return true;
    var wrapped = btn.closest('section,div,main,article');
    if (!wrapped) return false;
    var nearbyFields = wrapped.querySelectorAll('input,textarea,select,[contenteditable="true"]');
    return nearbyFields.length >= 2;
  }

  function isLikelyApplicationFlow() {
    var text = String(document.body && (document.body.innerText || document.body.textContent) || '')
      .toLowerCase();
    var formCount = document.querySelectorAll('input,textarea,select').length;
    if (formCount >= 4 && /apply|application|work authorization|resume|cover letter|employment/i.test(text)) {
      return true;
    }

    var url = (location.href || '').toLowerCase();
    return /(apply|application|careers|jobs|workday|greenhouse|lever|ashby|icims|smartrecruiters)/i.test(url);
  }

  function safeClickButton(btn) {
    try {
      btn.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
    } catch (e) {}
    try {
      btn.focus();
    } catch (e) {}
    try {
      btn.click();
      return true;
    } catch (e) {
      return false;
    }
  }

  function reportAutofillTelemetry(sample) {
    try {
      chrome.runtime.sendMessage({ action: 'recordAutofillTelemetry', sample: sample || {} }, function () {});
    } catch (e) {}
  }

  // ── Multi-step form observer ───────────────────────────────────────────────────
  // Watches for new form fields added to the DOM (wizard "Next" steps) and
  // re-applies the stored profile automatically.
  var _multiStepObserver = null;
  var _multiStepDebounce = null;

  function armMultiStepObserver() {
    if (_multiStepObserver) return; // already armed
    var lastInputCount = document.querySelectorAll(
      'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="password"]),textarea,select'
    ).length;

    _multiStepObserver = new MutationObserver(function (mutations) {
      var relevant = mutations.some(function (m) {
        return Array.from(m.addedNodes).some(function (n) {
          return n.nodeType === 1 && (
            n.matches && (n.matches('input,textarea,select,form,[role="form"]') ||
            n.querySelector('input,textarea,select'))
          );
        });
      });
      if (!relevant) return;
      clearTimeout(_multiStepDebounce);
      _multiStepDebounce = setTimeout(function () {
        if (!FF_SESSION_PROFILE) return;
        var newCount = document.querySelectorAll(
          'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="password"]),textarea,select'
        ).length;
        if (newCount <= lastInputCount) return; // no new fields appeared
        lastInputCount = newCount;
        try {
          fillApplicationForm(FF_SESSION_PROFILE);
        } catch (e) {
          console.warn('[FlashFire] multi-step re-fill error:', e);
        }
      }, 400); // debounce: wait for step transition to settle
    });

    _multiStepObserver.observe(document.body, { childList: true, subtree: true });
  }

  function disarmMultiStepObserver() {
    if (_multiStepObserver) {
      _multiStepObserver.disconnect();
      _multiStepObserver = null;
    }
    clearTimeout(_multiStepDebounce);
    _multiStepDebounce = null;
  }

  // ── Radio group filler ─────────────────────────────────────────────────────────
  function fillRadioGroup(radios, p) {
    if (!radios || !radios.length) return;
    var groupCtx = getGroupLabel(radios[0]).toLowerCase();

    // Work authorization
    if (/authorized|authorization|eligible to work|work.*permit|right to work|sponsorship|require.*sponsor|visa.*status/i.test(groupCtx)) {
      var visa = str(p.visaStatus).toLowerCase();
      var isAuth = /citizen|gc|green.?card|permanent|authorized|ead|opt|cpt|h1|l1|o1|tn\b/i.test(visa) ||
                   /yes|authorized|eligible|no.?sponsor/i.test(visa);
      pickRadioOption(radios, isAuth
        ? ['yes','authorized','eligible','no sponsorship needed','no','do not require']
        : ['no','not authorized','require','need sponsorship','yes i require']);
      return;
    }

    // Willing to relocate
    if (/relocat/i.test(groupCtx)) {
      pickRadioOption(radios, ['yes', 'open to relocation', 'willing', 'yes i am willing']);
      return;
    }

    // Remote / hybrid / on-site preference
    if (/remote|work.*from.*home|hybrid|on.?site|work.*arrangement/i.test(groupCtx)) {
      pickRadioOption(radios, ['yes', 'remote', 'hybrid', 'open to remote']);
      return;
    }

    // Employment type
    if (/employment type|contract.*type|type of employment|full.?time|part.?time/i.test(groupCtx)) {
      pickRadioOption(radios, ['full-time', 'full time', 'permanent', 'regular', 'direct hire']);
      return;
    }

    // Gender (EEO)
    if (p.gender && /gender|sex\b/i.test(groupCtx)) {
      pickRadioOption(radios, [p.gender.toLowerCase(), str(p.gender)]);
      return;
    }

    // Veteran status
    if (p.veteranStatus && /veteran|military/i.test(groupCtx)) {
      pickRadioOption(radios, [p.veteranStatus.toLowerCase()]);
      return;
    }

    // Disability status
    if (p.disability && /disab/i.test(groupCtx)) {
      pickRadioOption(radios, [p.disability.toLowerCase()]);
      return;
    }
  }

  function pickRadioOption(radios, preferred) {
    var picked = null;
    for (var i = 0; i < preferred.length && !picked; i++) {
      var pref = preferred[i].toLowerCase();
      picked = radios.find(function (r) {
        var lbl = (getLabelText(r) + ' ' + str(r.value)).toLowerCase();
        return lbl.includes(pref);
      });
    }
    if (!picked || picked.checked) return;
    try { picked.click(); picked.dispatchEvent(new Event('change', { bubbles: true })); } catch (e) {}
  }

  function getGroupLabel(radio) {
    var fs = radio.closest('fieldset,[role="radiogroup"],[role="group"]');
    if (fs) {
      var leg = fs.querySelector('legend,[class*="legend"],[class*="group-label"],[class*="section-label"]');
      if (leg) return (leg.innerText || leg.textContent || '').trim();
      var ariaLab = fs.getAttribute('aria-labelledby');
      if (ariaLab) {
        var le = document.getElementById(ariaLab);
        if (le) return (le.innerText || le.textContent || '').trim();
      }
      var ariaL = fs.getAttribute('aria-label');
      if (ariaL) return ariaL;
    }
    return getLabelText(radio);
  }

  // ── Checkbox filler ────────────────────────────────────────────────────────────
  function fillCheckbox(cb, p) {
    if (cb.checked) return;
    var lbl = (getLabelText(cb) + ' ' + str(cb.name) + ' ' + str(cb.id)).toLowerCase();

    // Terms / agreements / certifications — always check
    if (/certif|agree|acknowledge|confirm|consent|accept|understand|attest|i have read|terms|conditions|privacy|policy/i.test(lbl)) {
      try { cb.click(); cb.dispatchEvent(new Event('change', { bubbles: true })); } catch (e) {}
      return;
    }

    // "Authorized to work" checkbox
    if (/authorized|eligible|work.*us|us.*work|work permit/i.test(lbl)) {
      var visa = str(p.visaStatus).toLowerCase();
      if (/citizen|green.?card|gc|permanent|authorized|ead|opt/i.test(visa)) {
        try { cb.click(); cb.dispatchEvent(new Event('change', { bubbles: true })); } catch (e) {}
      }
    }
  }

  // ── Custom combobox filler (Workday, SmartRecruiters etc.) ────────────────────
  // Uses polling (up to 1.5s, 50ms interval) instead of a fixed timeout
  // so it works on both slow (Workday) and fast (SmartRecruiters) pages.
  function fillCustomCombobox(el, value) {
    if (!value) return;
    try {
      el.click();
      el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));

      var valL = value.toLowerCase();
      var attempts = 0;
      var maxAttempts = 30; // 30 × 50ms = 1.5s max wait

      function pickFromListbox() {
        attempts++;
        var listbox =
          document.querySelector('[role="listbox"]') ||
          document.querySelector('[aria-haspopup="listbox"] + *, [aria-expanded="true"] [role="option"]') ||
          document.querySelector('[class*="dropdown-menu"],[class*="select-menu"],[class*="options-list"],[class*="suggestion-list"]');

        if (listbox) {
          var opts = listbox.querySelectorAll(
            '[role="option"],[class*="option"],[class*="select-item"],[class*="menu-item"],[class*="list-item"],[class*="suggestion"]'
          );
          if (opts.length > 0) {
            var match = Array.from(opts).find(function (o) {
              return (o.textContent || '').toLowerCase().includes(valL);
            });
            if (match) {
              match.click();
              match.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
              return; // success
            }
          }
        }
        if (attempts < maxAttempts) {
          setTimeout(pickFromListbox, 50);
        }
        // Silently give up after 1.5s — form may not use a dropdown for this field
      }

      setTimeout(pickFromListbox, 50);
    } catch (e) {
      console.warn('[FlashFire] fillCustomCombobox error:', e);
    }
  }

  // ── contenteditable filler ─────────────────────────────────────────────────────
  function fillContentEditable(el, value) {
    try {
      el.focus();
      el.textContent = '';
      document.execCommand('insertText', false, value);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    } catch (e) {
      try { el.textContent = value; } catch (e2) {}
    }
  }

  // ── isVisible — handles modern CSS including transforms ────────────────────────
  function isVisible(el) {
    try {
      if (!el || !el.getBoundingClientRect) return false;
      var rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        // Could be hidden behind a scroll / off-screen but still valid (forms in steps)
        var style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') return false;
        return true; // Accept off-screen inputs (multi-step forms)
      }
      var style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
      if (parseFloat(style.opacity) === 0) return false;
      return true;
    } catch (e) {
      return false;
    }
  }

  // ── getLabelText — fast version used by radio/checkbox helpers ─────────────────
  function getLabelText(el) {
    if (!el) return '';
    // 1. label[for=id]
    if (el.id) {
      try {
        var lbl = document.querySelector('label[for="' + CSS.escape(el.id) + '"]');
        if (lbl) return (lbl.innerText || lbl.textContent || '').trim();
      } catch (e) {}
    }
    // 2. aria-labelledby
    var alby = el.getAttribute && el.getAttribute('aria-labelledby');
    if (alby) {
      var albyTxt = alby.split(/\s+/).map(function (id) {
        var e = document.getElementById(id);
        return e ? (e.innerText || e.textContent || '') : '';
      }).filter(Boolean).join(' ');
      if (albyTxt) return albyTxt.trim();
    }
    // 3. aria-label
    var al = el.getAttribute && el.getAttribute('aria-label');
    if (al) return al.trim();
    // 4. ancestor label
    var anc = el.closest && el.closest('label');
    if (anc) return (anc.innerText || anc.textContent || '').trim();
    // 5. preceding sibling
    var sib = el.previousElementSibling;
    for (var i = 0; i < 4 && sib; i++) {
      if (sib.tagName === 'LABEL' || (sib.className || '').toLowerCase().includes('label')) {
        return (sib.innerText || sib.textContent || '').trim();
      }
      sib = sib.previousElementSibling;
    }
    return '';
  }

  // ── str helper ────────────────────────────────────────────────────────────────
  function str(v) { return String(v || '').trim(); }

  // ── fillInput — React/Vue/Angular/plain HTML compatible ───────────────────────
  function fillInput(input, value) {
    try {
      if (input.tagName === 'SELECT') { fillSelect(input, value); return; }
      var proto = input.tagName === 'TEXTAREA'
        ? window.HTMLTextAreaElement.prototype
        : window.HTMLInputElement.prototype;

      // React 18+: reset _valueTracker BEFORE setting value so React sees it as a new change
      if (input._valueTracker) {
        try { input._valueTracker.setValue(''); } catch (e) {}
      }

      var nSetter = Object.getOwnPropertyDescriptor(proto, 'value');
      if (nSetter && nSetter.set) nSetter.set.call(input, value);
      else input.value = value;

      // React synthetic event (handles both old and new fiber keys)
      var rk = Object.keys(input).find(function (k) {
        return k.startsWith('__reactFiber') || k.startsWith('__reactInternalInstance') || k.startsWith('_reactFiber');
      });
      if (rk) {
        var tracker = input[rk] && input[rk].stateNode && input[rk].stateNode._wrapperState;
        if (tracker && tracker.controlled) {
          var trackerSetter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value');
          if (!trackerSetter) trackerSetter = Object.getOwnPropertyDescriptor(proto, 'value');
          if (trackerSetter && trackerSetter.set) trackerSetter.set.call(input, value);
        }
      }

      // Full event chain: covers React, Vue, Angular, Svelte, plain HTML
      input.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
      input.dispatchEvent(new Event('input',  { bubbles: true, cancelable: true }));
      try { input.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, data: value, inputType: 'insertText' })); } catch (e) {}
      input.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
      input.dispatchEvent(new Event('blur',   { bubbles: true, cancelable: true }));
      // Angular / Vue need keyboard events
      ['keydown', 'keypress', 'keyup'].forEach(function (evType) {
        input.dispatchEvent(new KeyboardEvent(evType, { bubbles: true, cancelable: true, key: 'a', keyCode: 65 }));
      });
      // Angular-specific: dispatch ngModelChange via custom event
      try {
        input.dispatchEvent(new CustomEvent('ngModelChange', { bubbles: true, detail: value }));
      } catch (e) {}
    } catch (e) {
      console.warn('[FlashFire] fillInput error:', e);
    }
  }

  // ── Country / State alias expansion ───────────────────────────────────────────
  // Many dropdowns use full names ("United States") while resume data has abbreviations ("USA").
  var FF_COUNTRY_ALIASES = {
    'usa': ['united states', 'united states of america', 'us', 'u.s.', 'u.s.a.', 'america'],
    'us':  ['united states', 'united states of america', 'usa', 'u.s.a.', 'america'],
    'uk':  ['united kingdom', 'great britain', 'england', 'britain', 'u.k.'],
    'uae': ['united arab emirates'],
    'india': ['in', 'ind'],
    'canada': ['ca', 'can'],
    'australia': ['au', 'aus'],
    'germany': ['de', 'deu'],
    'france': ['fr', 'fra'],
    'singapore': ['sg', 'sgp']
  };
  var FF_STATE_ALIASES = {
    'al': 'alabama','ak': 'alaska','az': 'arizona','ar': 'arkansas',
    'ca': 'california','co': 'colorado','ct': 'connecticut','de': 'delaware',
    'fl': 'florida','ga': 'georgia','hi': 'hawaii','id': 'idaho',
    'il': 'illinois','in': 'indiana','ia': 'iowa','ks': 'kansas',
    'ky': 'kentucky','la': 'louisiana','me': 'maine','md': 'maryland',
    'ma': 'massachusetts','mi': 'michigan','mn': 'minnesota','ms': 'mississippi',
    'mo': 'missouri','mt': 'montana','ne': 'nebraska','nv': 'nevada',
    'nh': 'new hampshire','nj': 'new jersey','nm': 'new mexico','ny': 'new york',
    'nc': 'north carolina','nd': 'north dakota','oh': 'ohio','ok': 'oklahoma',
    'or': 'oregon','pa': 'pennsylvania','ri': 'rhode island','sc': 'south carolina',
    'sd': 'south dakota','tn': 'tennessee','tx': 'texas','ut': 'utah',
    'vt': 'vermont','va': 'virginia','wa': 'washington','wv': 'west virginia',
    'wi': 'wisconsin','wy': 'wyoming','dc': 'district of columbia'
  };

  function getValueAliases(value) {
    var vl = value.toLowerCase().trim();
    var aliases = [value]; // always include the original
    // State abbreviation?
    if (FF_STATE_ALIASES[vl]) aliases.push(FF_STATE_ALIASES[vl]);
    // Country abbreviation?
    if (FF_COUNTRY_ALIASES[vl]) aliases = aliases.concat(FF_COUNTRY_ALIASES[vl]);
    // Reverse: full name → abbrev (Texas → TX, United States → USA)
    for (var abbr in FF_STATE_ALIASES) {
      if (FF_STATE_ALIASES[abbr] === vl) { aliases.push(abbr.toUpperCase()); break; }
    }
    return aliases;
  }

  // ── fillSelect — multi-strategy select matcher ─────────────────────────────────
  function fillSelect(input, value) {
    try {
      if (!value) return;
      // Filter out disabled options, hidden options, and placeholder options
      // (placeholder = empty value OR text that looks like "Select...", "Choose...", "-- Please select --")
      var placeholderPattern = /^[-–—\s]*(please\s+)?(select|choose|pick|option)[-–—\s]*$/i;
      var opts = Array.from(input.options).filter(function (o) {
        if (o.disabled) return false;
        if (!o.value && o.value !== 0) return false; // empty-value placeholder
        if (placeholderPattern.test(o.text.trim())) return false;
        return true;
      });
      if (!opts.length) return;

      var vl = value.toLowerCase().trim();
      var vt = tokenise(value);
      // Expand abbreviations: "USA"→["united states",...], "TX"→["texas",...]
      var aliases = getValueAliases(value);

      function findInOpts(candidates) {
        for (var ci = 0; ci < candidates.length; ci++) {
          var cv = candidates[ci].toLowerCase().trim();
          var vts = tokenise(candidates[ci]);
          // 1. Exact value match
          var m = opts.find(function (o) { return o.value.toLowerCase() === cv; });
          // 2. Exact text match
          if (!m) m = opts.find(function (o) { return o.text.toLowerCase().trim() === cv; });
          // 3. Text starts with candidate
          if (!m) m = opts.find(function (o) { return o.text.toLowerCase().trim().startsWith(cv); });
          // 4. Value starts with candidate
          if (!m) m = opts.find(function (o) { return o.value.toLowerCase().startsWith(cv); });
          // 5. Text contains candidate
          if (!m) m = opts.find(function (o) { return o.text.toLowerCase().includes(cv); });
          if (m) return m;
        }
        return null;
      }

      // Try all aliases in order
      var match = findInOpts(aliases);

      // 6. Value contains option text (partial reverse)
      if (!match) match = opts.find(function (o) {
        return vl.includes(o.text.toLowerCase().trim()) && o.text.trim().length > 1;
      });
      // 7. Token overlap (best match by score) using all alias tokens
      if (!match) {
        var allTokens = aliases.reduce(function (acc, a) { return acc.concat(tokenise(a)); }, []);
        var best = null, bestScore = 0;
        opts.forEach(function (o) {
          var otoks = tokenise(o.text);
          var overlap = allTokens.filter(function (t) { return otoks.includes(t); }).length;
          if (overlap > bestScore) { bestScore = overlap; best = o; }
        });
        if (best && bestScore > 0) match = best;
      }

      if (!match) return;
      var nSel = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value');
      if (nSel && nSel.set) nSel.set.call(input, match.value);
      else input.value = match.value;
      input.dispatchEvent(new Event('change', { bubbles: true }));
      input.dispatchEvent(new Event('input',  { bubbles: true }));
    } catch (e) {
      console.warn('[FlashFire] fillSelect error:', e);
    }
  }


  // --- Panel UI Creation (top frame only) ---
  if (window !== window.top) return;

  function createPanelUI() {
    if (document.getElementById('extension-panel')) return;
    if (!isExtensionValid()) return;

    var panel = document.createElement('div');
    panel.id = 'extension-panel';
    panel.style.cssText = [
      'position: fixed',
      'top: 0',
      'right: 0',
      'width: 350px',
      'height: 100vh',
      'background: white',
      'z-index: 2147483647',
      'box-shadow: -2px 0 10px rgba(0,0,0,0.2)',
      'overflow-y: auto',
      'display: none',
      'border-left: 1px solid #ddd'
    ].join(';');

    var panelIframe = document.createElement('iframe');
    try {
      panelIframe.src = chrome.runtime.getURL('panel.html');
    } catch (e) {
      showRefreshToast();
      return;
    }
    panelIframe.style.cssText = 'width:100%;height:100%;border:none';

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
      syncLauncherWithPanel();
    });

    panel.appendChild(closeButton);
    panel.appendChild(panelIframe);

    var mountRoot = getFlashfireMountRoot();
    if (mountRoot) {
      mountRoot.appendChild(panel);
    }
  }

  var mountRoot = getFlashfireMountRoot();
  if (mountRoot) {
    createPanelUI();
  } else {
    document.addEventListener('DOMContentLoaded', function onReady() {
      document.removeEventListener('DOMContentLoaded', onReady);
      createPanelUI();
      addFloatingLauncherButton();
    });
  }
  addFloatingLauncherButton();
})();
