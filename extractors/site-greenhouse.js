// FlashFire Extraction Engine - Site: Greenhouse
(function () {
  var ns = window.FFExtract;
  if (!ns) return;

  ns.registerSite({
    name: 'greenhouse',
    priority: 90,

    match: function (url) {
      var h = url.hostname;
      return h.indexOf('greenhouse.io') !== -1 ||
        h.indexOf('boards.greenhouse.io') !== -1 ||
        document.querySelector('#app_body[class*="greenhouse"]') !== null ||
        document.querySelector('[data-mapped="true"][data-greenhouse]') !== null;
    },

    extract: function () {
      var u = ns.utils;

      // --- Position ---
      var position = u.firstText([
        '[data-gh="job-title"]',
        '.posting-title .posting-title__text',
        '.app-title',
        'h1.job-title',
        'h1'
      ]);

      // --- Company ---
      var company = u.firstText([
        '.company-name',
        '[data-gh="company-name"]',
        '.posting-title .posting-title__company'
      ]);
      // Fallback: parse from page title ("Position at Company")
      if (!company && document.title) {
        var m = document.title.match(/at\s+(.+?)(?:\s*[-|–]|$)/i);
        if (m) company = m[1].trim();
      }

      // --- Description (HTML) ---
      var description = u.firstHtml([
        '#content',
        '.posting-page .posting-description',
        '[data-gh="job-description"]',
        '.job-description',
        '.job__description'
      ]);

      // --- Location ---
      var location = u.firstText([
        '.posting-categories .sort-by-commit--location',
        '.location',
        '[data-gh="job-location"]',
        '.posting-title .posting-title__location',
        '.body--metadata .location'
      ]);

      if (!position && !company) return null;

      return {
        data: {
          company: company || '',
          position: position || '',
          location: location || '',
          type: '',
          description: description || '',
          url: window.location.href,
          scrapedAt: new Date().toISOString()
        },
        layerConfidence: 85,
        layerName: 'greenhouse'
      };
    }
  });
})();
