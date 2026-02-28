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
  'extractors/generic.js',
  'extractors/pipeline.js',
  'content.js'
];

chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.sendMessage(tab.id, { action: 'togglePanel' }, (response) => {
    if (chrome.runtime.lastError) {
      // Content script not available, inject all files in order
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: CONTENT_SCRIPTS
      }).then(() => {
        setTimeout(() => {
          chrome.tabs.sendMessage(tab.id, { action: 'togglePanel' });
        }, 150);
      }).catch((error) => {
        console.error('Failed to inject content scripts:', error);
      });
    }
  });
});
