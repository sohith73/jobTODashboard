// FlashFire Extraction Engine - Global Namespace
// All extractor modules register on window.FFExtract
(function () {
  if (window.FFExtract) return; // Prevent re-initialization

  window.FFExtract = {
    // Registry for site-specific extractors
    siteExtractors: [],

    // Core layer extractors (set by their respective files)
    jsonLd: null,
    metaTags: null,
    generic: null,
    pipeline: null,
    confidence: null,

    // Register a site-specific extractor
    // config = { name: string, match: function(URL), extract: function(doc), priority: number }
    registerSite: function (config) {
      this.siteExtractors.push(config);
      this.siteExtractors.sort(function (a, b) {
        return (b.priority || 0) - (a.priority || 0);
      });
    },

    // Shared utility functions used across all extractors
    utils: {
      q: function (sel, root) {
        try { return (root || document).querySelector(sel); }
        catch (e) { return null; }
      },
      qa: function (sel, root) {
        try { return Array.from((root || document).querySelectorAll(sel)); }
        catch (e) { return []; }
      },
      // Extract clean text from an element, handling various DOM structures
      extractText: function (element) {
        if (!element) return '';
        var text = (element.textContent || '').trim();
        if (!text && element.childNodes) {
          text = Array.from(element.childNodes)
            .filter(function (node) { return node.nodeType === Node.TEXT_NODE; })
            .map(function (node) { return node.textContent; })
            .join(' ').trim();
        }
        if (!text) text = (element.innerText || '').trim();
        return text.replace(/\s+/g, ' ').trim();
      },
      // Strip class/id/data attributes from HTML for clean storage
      cleanHtml: function (html) {
        if (!html) return '';
        return html
          .replace(/\s*class="[^"]*"/gi, '')
          .replace(/\s*id="[^"]*"/gi, '')
          .replace(/\s*data-[a-z-]*="[^"]*"/gi, '')
          .replace(/\s*style="[^"]*"/gi, '')
          .replace(/<!--[\s\S]*?-->/g, '')
          .replace(/\s{2,}/g, ' ')
          .trim();
      },
      // Build a partial-class attribute selector
      byPartialClass: function (part) {
        return '[class*="' + part + '"]';
      },
      // Try multiple selectors in order, return first match's text
      firstText: function (selectors, root) {
        for (var i = 0; i < selectors.length; i++) {
          var el = this.q(selectors[i], root);
          if (el) {
            var text = this.extractText(el);
            if (text) return text;
          }
        }
        return '';
      },
      // Try multiple selectors in order, return first match's innerHTML (cleaned)
      firstHtml: function (selectors, root) {
        for (var i = 0; i < selectors.length; i++) {
          var el = this.q(selectors[i], root);
          if (el && (el.innerHTML || '').trim().length >= 50) {
            return this.cleanHtml(el.innerHTML);
          }
        }
        return '';
      }
    },

    // In-memory pattern cache for unknown domains (per session)
    _patternCache: {},
    cachePattern: function (domain, selectors) {
      this._patternCache[domain] = {
        selectors: selectors,
        cachedAt: Date.now(),
        hitCount: 0
      };
    },
    getCachedPattern: function (domain) {
      var entry = this._patternCache[domain];
      if (entry) {
        entry.hitCount++;
        return entry.selectors;
      }
      return null;
    }
  };
})();
