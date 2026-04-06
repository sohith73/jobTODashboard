// All content script files in load order (must match manifest.json)
const CONTENT_SCRIPTS = [
  'extractors/namespace.js',
  'extractors/confidence.js',
  'extractors/json-ld.js',
  'extractors/meta-tags.js',
  'extractors/site-jobright.js',
  'extractors/site-linkedin.js',
  'extractors/site-indeed.js',
  'extractors/site-greenhouse.js',
  'extractors/site-lever.js',
  'extractors/site-workday.js',
  'extractors/site-smartrecruiters.js',
  'extractors/site-icims.js',
  'extractors/site-bamboohr.js',
  'extractors/site-ashby.js',
  'extractors/generic.js',
  'extractors/pipeline.js',
  'content.js'
];
const RESPONSE_MEMORY_KEY = 'ff_response_memory';
const RESPONSE_MEMORY_LIMIT = 1500;

function sendMessageToFrame(tabId, payload, frameId) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, payload, { frameId }, () => {
      resolve(!chrome.runtime.lastError);
    });
  });
}

/** Try frames in a sensible order: main first, then likely job-board iframes (e.g. Greenhouse embed). */
async function tryOpenInFrames(tabId, payload) {
  const frames = await new Promise((resolve) => {
    chrome.webNavigation.getAllFrames({ tabId }, (list) => {
      if (chrome.runtime.lastError || !list || !list.length) {
        resolve(null);
        return;
      }
      resolve(list);
    });
  });

  if (!frames) {
    return new Promise((resolve) => {
      chrome.tabs.sendMessage(tabId, payload, () => {
        resolve(!chrome.runtime.lastError);
      });
    });
  }

  const sorted = [...frames].sort((a, b) => {
    if (a.frameId === 0) return -1;
    if (b.frameId === 0) return 1;
    const au = (a.url || '').toLowerCase();
    const bu = (b.url || '').toLowerCase();
    const aJob = /greenhouse|lever|workday|icims|smartrecruiters|bamboohr|ashby|embed|job/i.test(au) ? 0 : 1;
    const bJob = /greenhouse|lever|workday|icims|smartrecruiters|bamboohr|ashby|embed|job/i.test(bu) ? 0 : 1;
    if (aJob !== bJob) return aJob - bJob;
    return a.frameId - b.frameId;
  });

  for (const f of sorted) {
    if (await sendMessageToFrame(tabId, payload, f.frameId)) {
      return true;
    }
  }
  return false;
}

async function injectAllFrames(tabId) {
  await chrome.scripting.executeScript({
    target: { tabId, allFrames: true },
    files: CONTENT_SCRIPTS
  });
}

chrome.action.onClicked.addListener(async (tab) => {
  const tabId = tab.id;
  const payload = { action: 'togglePanel', hostTabId: tabId };

  const delays = [0, 60, 180, 400];

  for (let i = 0; i < delays.length; i += 1) {
    if (delays[i] > 0) {
      await new Promise((r) => setTimeout(r, delays[i]));
    }
    if (await tryOpenInFrames(tabId, payload)) {
      return;
    }
  }

  try {
    await injectAllFrames(tabId);
    await new Promise((r) => setTimeout(r, 280));
    if (await tryOpenInFrames(tabId, payload)) {
      return;
    }
    await new Promise((r) => setTimeout(r, 200));
    await tryOpenInFrames(tabId, payload);
  } catch (e) {
    console.error('[FlashFire] Could not inject or open panel:', e?.message || e);
  }
});

// Autofill telemetry aggregation (hostname-level quality tracking)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message !== 'object') return false;
  if (sender && sender.id && sender.id !== chrome.runtime.id) return false;

  if (message.action === 'recordAutofillTelemetry') {
    chrome.storage.local.get(['ff_autofill_telemetry'], (res) => {
      const sample = message.sample || {};
      const host = String(sample.hostname || '').toLowerCase().trim();
      if (!host) {
        sendResponse({ ok: false });
        return;
      }

      const all = res.ff_autofill_telemetry || {};
      const cur = all[host] || {
        runs: 0,
        detected: 0,
        filled: 0,
        skippedExisting: 0,
        autopilotNext: 0,
        autopilotSubmit: 0,
        unmatchedMap: {},
        lastRunAt: 0
      };

      var detected = Math.max(0, Math.min(500, Number(sample.detected || 0)));
      var filled = Math.max(0, Math.min(500, Number(sample.filled || 0)));
      var skipped = Math.max(0, Math.min(500, Number(sample.skippedExisting || 0)));
      var unmatchedLabels = Array.isArray(sample.unmatchedLabels)
        ? sample.unmatchedLabels.map((x) => String(x || '').trim().toLowerCase()).filter(Boolean).slice(0, 15)
        : [];
      var unmatchedMap = { ...(cur.unmatchedMap || {}) };
      unmatchedLabels.forEach((label) => {
        var key = label.slice(0, 140);
        if (!key) return;
        var prev = Number(unmatchedMap[key] || 0);
        unmatchedMap[key] = Math.min(9999, prev + 1);
      });
      // cap map size
      var unmatchedEntries = Object.entries(unmatchedMap)
        .sort((a, b) => Number(b[1] || 0) - Number(a[1] || 0))
        .slice(0, 120);
      unmatchedMap = Object.fromEntries(unmatchedEntries);

      all[host] = {
        runs: cur.runs + 1,
        detected: cur.detected + detected,
        filled: cur.filled + filled,
        skippedExisting: cur.skippedExisting + skipped,
        autopilotNext: cur.autopilotNext + (sample.autopilotNext ? 1 : 0),
        autopilotSubmit: cur.autopilotSubmit + (sample.autopilotSubmit ? 1 : 0),
        unmatchedMap,
        lastRunAt: Date.now()
      };

      chrome.storage.local.set({ ff_autofill_telemetry: all }, () => sendResponse({ ok: true }));
    });
    return true;
  }

  if (message.action === 'getAutofillTelemetry') {
    chrome.storage.local.get(['ff_autofill_telemetry'], (res) => {
      sendResponse({ ok: true, data: res.ff_autofill_telemetry || {} });
    });
    return true;
  }

  if (message.action === 'getAutofillTelemetrySummary') {
    chrome.storage.local.get(['ff_autofill_telemetry'], (res) => {
      const raw = res.ff_autofill_telemetry || {};
      const rows = Object.entries(raw).map(([host, v]) => {
        const detected = Number(v.detected || 0);
        const filled = Number(v.filled || 0);
        const runs = Number(v.runs || 0);
        const fillRate = detected > 0 ? Math.round((filled / detected) * 100) : 0;
        var topUnmatched = Object.entries(v.unmatchedMap || {})
          .sort((a, b) => Number(b[1] || 0) - Number(a[1] || 0))
          .slice(0, 3)
          .map(([label, count]) => ({ label, count: Number(count || 0) }));
        return {
          host,
          runs,
          detected,
          filled,
          skippedExisting: Number(v.skippedExisting || 0),
          autopilotNext: Number(v.autopilotNext || 0),
          autopilotSubmit: Number(v.autopilotSubmit || 0),
          fillRate,
          topUnmatched,
          lastRunAt: Number(v.lastRunAt || 0)
        };
      });

      rows.sort((a, b) => {
        if (b.runs !== a.runs) return b.runs - a.runs;
        return b.lastRunAt - a.lastRunAt;
      });

      const adapterCandidates = rows
        .filter((r) => r.runs >= 3)
        .sort((a, b) => {
          if (a.fillRate !== b.fillRate) return a.fillRate - b.fillRate;
          return b.runs - a.runs;
        })
        .slice(0, 10)
        .map((r) => ({
          host: r.host,
          fillRate: r.fillRate,
          runs: r.runs,
          topUnmatched: r.topUnmatched || []
        }));

      sendResponse({
        ok: true,
        summary: {
          totalHosts: rows.length,
          top: rows.slice(0, 20),
          adapterCandidates
        }
      });
    });
    return true;
  }

  if (message.action === 'getResponseMemory') {
    chrome.storage.local.get([RESPONSE_MEMORY_KEY], (res) => {
      const list = Array.isArray(res[RESPONSE_MEMORY_KEY]) ? res[RESPONSE_MEMORY_KEY] : [];
      sendResponse({ ok: true, items: list });
    });
    return true;
  }

  if (message.action === 'saveResponseMemory') {
    const incoming = Array.isArray(message.items) ? message.items : [];
    if (!incoming.length) {
      sendResponse({ ok: true, saved: 0 });
      return false;
    }

    chrome.storage.local.get([RESPONSE_MEMORY_KEY], (res) => {
      const existing = Array.isArray(res[RESPONSE_MEMORY_KEY]) ? res[RESPONSE_MEMORY_KEY] : [];
      const byKey = new Map();

      existing.forEach((item) => {
        const key = String(item && item.key || '').trim();
        if (!key) return;
        const normalized = normalizeMemoryItem(item);
        if (!normalized) return;
        byKey.set(key, normalized);
      });

      incoming.forEach((item) => {
        const normalized = normalizeMemoryItem(item);
        if (!normalized) return;
        const cur = byKey.get(normalized.key);
        if (!cur) {
          byKey.set(normalized.key, normalized);
          return;
        }
        byKey.set(normalized.key, {
          ...cur,
          response: normalized.response || cur.response,
          question: normalized.question || cur.question,
          tokens: normalized.tokens && normalized.tokens.length ? normalized.tokens : cur.tokens,
          count: Math.min(9999, Number(cur.count || 0) + Math.max(1, Number(normalized.count || 1))),
          updatedAt: Date.now(),
          lastHost: normalized.lastHost || cur.lastHost
        });
      });

      const merged = Array.from(byKey.values())
        .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0))
        .slice(0, RESPONSE_MEMORY_LIMIT);

      chrome.storage.local.set({ [RESPONSE_MEMORY_KEY]: merged }, () => {
        sendResponse({ ok: true, saved: incoming.length, total: merged.length });
      });
    });
    return true;
  }

  return false;
});

function normalizeMemoryItem(item) {
  if (!item || typeof item !== 'object') return null;
  const key = String(item.key || '').trim();
  const response = String(item.response || '').trim();
  if (!key || !response) return null;

  const tokens = Array.isArray(item.tokens)
    ? item.tokens.map((t) => String(t || '').toLowerCase().trim()).filter(Boolean).slice(0, 20)
    : [];

  const question = String(item.question || '').slice(0, 300);
  const noisyQuestion = /(captcha|otp|one.?time|verification|security code|password|passcode|credit card|ssn|social security|tax id|ein|bank account)/i.test(question);
  if (noisyQuestion) return null;

  return {
    key,
    question,
    response: response.slice(0, 1200),
    tokens,
    count: Math.max(1, Math.min(9999, Number(item.count || 1))),
    lastHost: String(item.lastHost || '').toLowerCase().slice(0, 200),
    updatedAt: Date.now()
  };
}
