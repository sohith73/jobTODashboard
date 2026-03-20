// Open panel: never reload the tab and never re-inject scripts (manifest content_scripts already run).
// Re-injecting content.js caused duplicate listeners / wrong toggle behavior and felt like a refresh.

chrome.action.onClicked.addListener((tab) => {
  const tabId = tab.id;
  const payload = { action: 'togglePanel', hostTabId: tabId };

  const delays = [0, 80, 200, 400, 700];
  let attempt = 0;

  function trySend() {
    chrome.tabs.sendMessage(tabId, payload, () => {
      if (chrome.runtime.lastError) {
        attempt += 1;
        if (attempt < delays.length) {
          setTimeout(trySend, delays[attempt]);
        } else {
          console.warn(
            '[FlashFire] Could not open panel (content script not reachable).',
            chrome.runtime.lastError?.message,
            'If this tab was open before installing the extension, switch tabs or open a new tab once — the extension never reloads the page.'
          );
        }
      }
    });
  }

  trySend();
});
