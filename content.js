(function () {
  // Check if panel already exists
  if (document.getElementById('extension-panel')) {
    togglePanel();
    return;
  }

  // Job scraping functionality
  let currentJobData = null;

  // Check if we're on a jobright.ai job page
  function isJobRightJobPage() {
    return window.location.hostname === 'jobright.ai' &&
      window.location.pathname.startsWith('/jobs/info/');
  }

  // Check if we're on a LinkedIn job page
  function isLinkedInJobPage() {
    return (window.location.hostname === 'www.linkedin.com' || window.location.hostname === 'linkedin.com') &&
      (window.location.pathname.includes('/jobs/view/') ||
        window.location.pathname.includes('/jobs/collections/') ||
        window.location.search.includes('currentJobId='));
  }

  // Check if we're on an Indeed job page
  function isIndeedJobPage() {
    return (window.location.hostname.includes('indeed.com')) &&
      (window.location.pathname.includes('/viewjob') ||
        window.location.pathname.includes('/jobs') ||
        document.querySelector('#jobsearch-ViewjobPaneWrapper') !== null ||
        document.querySelector('.jobsearch-ViewJobLayout--embedded') !== null);
  }

  // Scrape job data from jobright.ai
  function scrapeJobData() {
    if (!isJobRightJobPage()) return null;

    try {
      // Helpers to query with resilient selectors (class name hashes may change)
      const q = (sel) => document.querySelector(sel);
      const qa = (sel) => Array.from(document.querySelectorAll(sel));
      const byPartialClass = (part) => `[class*="${part}"]`;

      // Extract company name from <strong> inside h2 with ant-typography class
      const companyElement = q('h2.ant-typography strong') || q(`${byPartialClass('company-row')} strong`) || q('h2 strong');
      const companyName = companyElement ? companyElement.textContent.trim() : 'Unknown Company';

      // Extract job title from h1 with ant-typography class
      const jobTitleElement = q('h1.ant-typography') || q(`${byPartialClass('job-title')}`) || q('h1');
      const jobTitle = jobTitleElement ? jobTitleElement.textContent.trim() : 'Unknown Position';

      // Extract job description from multiple sections - return HTML
      let jobDescription = '';

      // Get company summary
      const companySummary = q(`${byPartialClass('company-summary')} p`) || q(`${byPartialClass('company-summary')}`);
      if (companySummary) {
        jobDescription += `<div class="company-summary"><p>${companySummary.innerHTML || companySummary.textContent.trim()}</p></div>`;
      }

      // Get responsibilities - look for the section with "Responsibilities" heading
      const responsibilitiesHeading = qa('h2').find(h2 =>
        h2.textContent.toLowerCase().includes('responsibilities')
      );
      if (responsibilitiesHeading) {
        const responsibilitiesSection = responsibilitiesHeading.closest('section');
        if (responsibilitiesSection) {
          const responsibilities = responsibilitiesSection.querySelectorAll(`${byPartialClass('listText')}`);
          if (responsibilities.length > 0) {
            jobDescription += '<div class="responsibilities"><h3>Responsibilities:</h3><ul>';
            responsibilities.forEach((item) => {
              jobDescription += `<li>${item.innerHTML || item.textContent.trim()}</li>`;
            });
            jobDescription += '</ul></div>';
          }
        }
      }

      // Get qualifications/skills - look for the section with "Qualification" heading
      const qualificationsHeading = qa('h2').find(h2 =>
        h2.textContent.toLowerCase().includes('qualification')
      );
      if (qualificationsHeading) {
        const qualificationsSection = qualificationsHeading.closest('section');
        if (qualificationsSection) {
          const qualifications = qualificationsSection.querySelectorAll(`${byPartialClass('listText')}`);
          if (qualifications.length > 0) {
            jobDescription += '<div class="qualifications"><h3>Qualifications:</h3><ul>';
            qualifications.forEach((item) => {
              jobDescription += `<li>${item.innerHTML || item.textContent.trim()}</li>`;
            });
            jobDescription += '</ul></div>';
          }
        }
      }

      // Extract additional metadata
      const locationElement = q(`${byPartialClass('job-metadata-item')} span`);
      const location = locationElement ? locationElement.textContent.trim() : 'Unknown Location';

      const jobTypeElement = qa(`${byPartialClass('job-metadata-item')} span`)[1];
      const jobType = jobTypeElement ? jobTypeElement.textContent.trim() : 'Unknown Type';

      return {
        company: companyName,
        position: jobTitle,
        location: location,
        type: jobType,
        description: jobDescription.trim(),
        url: window.location.href,
        scrapedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error scraping job data:', error);
      return null;
    }
  }

  // Scrape job data from LinkedIn
  function scrapeLinkedInJobData() {
    if (!isLinkedInJobPage()) return null;

    try {
      // Helpers to query with resilient selectors
      const q = (sel) => document.querySelector(sel);
      const qa = (sel) => Array.from(document.querySelectorAll(sel));
      
      // Focus on the main job details panel, not sidebar job lists
      // The main job details are typically in .jobs-details__main-content or similar
      const mainJobContainer = q('.jobs-details__main-content') || 
                               q('.job-details-jobs-unified-top-card__container') ||
                               q('main') ||
                               document.body;
      
      // Create a scoped query function that searches within main container
      const qScoped = (sel) => {
        try {
          return mainJobContainer.querySelector(sel);
        } catch (e) {
          return q(sel);
        }
      };

      // Helper function to extract text content robustly
      const extractText = (element) => {
        if (!element) return '';
        // Try textContent first (includes hidden text)
        let text = element.textContent || element.innerText || '';
        // If empty, try getting direct child text nodes
        if (!text.trim() && element.childNodes) {
          text = Array.from(element.childNodes)
            .filter(node => node.nodeType === Node.TEXT_NODE)
            .map(node => node.textContent)
            .join(' ')
            .trim();
        }
        // If still empty, try getting from all descendants
        if (!text.trim()) {
          text = element.innerText || element.textContent || '';
        }
        return text.trim();
      };

      // Extract company name from job details - using scoped selectors to avoid sidebar jobs
      let companyName = 'Unknown Company';
      
      // Try multiple selectors in order of specificity, scoped to main container
      const companySelectors = [
        '.job-details-jobs-unified-top-card__company-name a',
        '.job-details-jobs-unified-top-card__company-name',
        '.jobs-unified-top-card__company-name a',
        '.jobs-unified-top-card__company-name',
        'a[href*="/company/"][href*="/life"]',
        'a[href*="/company/"]',
        '.artdeco-entity-lockup__title a',
        '.artdeco-entity-lockup__title'
      ];
      
      let companyElement = null;
      for (const selector of companySelectors) {
        companyElement = qScoped(selector);
        // If not found in scoped, try global as fallback
        if (!companyElement) {
          companyElement = q(selector);
        }
        if (companyElement) {
          // Verify it's in the main container, not sidebar
          const isInMainContainer = mainJobContainer.contains(companyElement);
          if (isInMainContainer) {
            const text = extractText(companyElement);
            if (text && text !== 'Unknown Company') {
              companyName = text;
              break;
            }
          }
        }
      }
      
      // If still not found, try finding by text pattern near company-related elements
      if (companyName === 'Unknown Company') {
        const companyDiv = qScoped('.job-details-jobs-unified-top-card__company-name') || 
                          q('.job-details-jobs-unified-top-card__company-name');
        if (companyDiv && mainJobContainer.contains(companyDiv)) {
          const text = extractText(companyDiv);
          if (text) {
            companyName = text;
          }
        }
      }

      // Extract job title - using scoped selectors to avoid sidebar jobs
      let jobTitle = 'Unknown Position';
      
      // Try multiple selectors in order of specificity, scoped to main container
      const titleSelectors = [
        '.job-details-jobs-unified-top-card__job-title h1 a',
        '.job-details-jobs-unified-top-card__job-title h1',
        '.job-details-jobs-unified-top-card__sticky-header h2',
        '.jobs-unified-top-card__job-title h1 a',
        '.jobs-unified-top-card__job-title h1',
        'h1 a[href*="/jobs/view/"]',
        'h1.t-24.t-bold',
        'h1.t-24',
        'h1'
      ];
      
      let titleElement = null;
      for (const selector of titleSelectors) {
        titleElement = qScoped(selector);
        // If not found in scoped, try global as fallback
        if (!titleElement) {
          titleElement = q(selector);
        }
        if (titleElement) {
          // Verify it's in the main container, not sidebar
          const isInMainContainer = mainJobContainer.contains(titleElement);
          if (isInMainContainer) {
            const text = extractText(titleElement);
            if (text && text !== 'Unknown Position') {
              jobTitle = text;
              break;
            }
          }
        }
      }
      
      // If still not found, try finding by text pattern
      if (jobTitle === 'Unknown Position') {
        const titleDiv = qScoped('.job-details-jobs-unified-top-card__job-title') || 
                        q('.job-details-jobs-unified-top-card__job-title');
        if (titleDiv && mainJobContainer.contains(titleDiv)) {
          const text = extractText(titleDiv);
          if (text) {
            jobTitle = text;
          }
        }
      }

      // Extract job description from the main content area - return HTML
      // Focus on main job panel, exclude sidebar job lists
      let jobDescription = '';

      // Get the main job description content - this is the key section, scoped to main container
      const descriptionElement = qScoped('.jobs-description__content .jobs-box__html-content') ||
        qScoped('.jobs-description__content') ||
        qScoped('.jobs-box__html-content') ||
        qScoped('#job-details') ||
        qScoped('[class*="job-description"]') ||
        // Fallback to global if not found in scoped
        (q('.jobs-description__content .jobs-box__html-content') && 
         mainJobContainer.contains(q('.jobs-description__content .jobs-box__html-content')) ? 
         q('.jobs-description__content .jobs-box__html-content') : null) ||
        (q('#job-details') && mainJobContainer.contains(q('#job-details')) ? q('#job-details') : null);

      if (descriptionElement) {
        // Extract HTML content and clean it up
        let descriptionHTML = descriptionElement.innerHTML || descriptionElement.outerHTML || '';

        // Clean up the HTML - remove LinkedIn-specific classes and IDs that might cause styling issues
        descriptionHTML = descriptionHTML
          .replace(/class="[^"]*"/g, '')  // Remove class attributes
          .replace(/id="[^"]*"/g, '')    // Remove id attributes
          .replace(/data-[^=]*="[^"]*"/g, '')  // Remove data attributes
          .replace(/\s+/g, ' ')          // Clean up extra whitespace
          .trim();

        // Wrap in a container div for better styling control
        jobDescription = `<div class="linkedin-job-description">${descriptionHTML}</div>`;
      }

      // Extract location - using actual selectors from the HTML
      let location = 'Unknown Location';
      const locationElement = q('.job-details-jobs-unified-top-card__tertiary-description-container .tvm__text') ||
        q('.job-details-jobs-unified-top-card__tertiary-description-container span') ||
        q('[class*="tertiary-description"] span');
      if (locationElement) {
        const locationText = locationElement.textContent.trim();
        // Extract location from text like "Hyderabad, Telangana, India · Reposted 1 month ago"
        const locationMatch = locationText.match(/^([^·]+)/);
        if (locationMatch) {
          location = locationMatch[1].trim();
        }
      }

      // Extract job type (Full-time, Part-time, etc.) - using actual selectors
      let jobType = 'Unknown Type';
      const typeElements = qa('.job-details-fit-level-preferences button span strong');
      if (typeElements.length > 0) {
        const types = Array.from(typeElements).map(el => el.textContent.trim()).filter(text => text);
        if (types.length > 0) {
          jobType = types.join(', ');
        }
      }

      console.log('LinkedIn scraping results:', {
        company: companyName,
        position: jobTitle,
        location: location,
        type: jobType,
        descriptionLength: jobDescription.length,
        descriptionPreview: jobDescription.substring(0, 100) + (jobDescription.length > 100 ? '...' : '')
      });

      return {
        company: companyName,
        position: jobTitle,
        location: location,
        type: jobType,
        description: jobDescription,
        url: window.location.href,
        scrapedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error scraping LinkedIn job data:', error);
      return null;
    }
  }

  // Scrape job data from Indeed
  function scrapeIndeedJobData() {
    if (!isIndeedJobPage()) return null;

    try {
      // Helpers to query with resilient selectors
      const q = (sel) => document.querySelector(sel);
      const qa = (sel) => Array.from(document.querySelectorAll(sel));

      // Extract company name from Indeed job details
      let companyName = 'Unknown Company';
      const companyElement = q('[data-company-name="true"]') ||
        q('[data-testid="inlineHeader-companyName"]') ||
        q('.css-19qk8gi .css-1tuvypf') ||
        q('[data-testid="jobsearch-CompanyInfoContainer"] span');
      if (companyElement) {
        companyName = companyElement.textContent.trim();
      }

      // Extract job title from Indeed
      let jobTitle = 'Unknown Position';
      const titleElement = q('[data-testid="jobsearch-JobInfoHeader-title"]') ||
        q('.jobsearch-JobInfoHeader-title') ||
        q('h2[data-testid="jobsearch-JobInfoHeader-title"]') ||
        q('.css-zsfb41');
      if (titleElement) {
        // Remove "- job post" suffix if present
        let titleText = titleElement.textContent.trim();
        titleText = titleText.replace(/\s*-\s*job\s*post\s*$/i, '');
        jobTitle = titleText;
      }

      // Extract job description from Indeed - return HTML
      let jobDescription = '';

      // Get the main job description content - using more comprehensive selectors
      const descriptionElement = q('#jobDescriptionText') ||
        q('.jobsearch-JobComponent-description') ||
        q('[data-testid="jobsearch-JobComponent-description"]') ||
        q('.css-ci04xl') ||
        q('.css-19ehp9i') ||
        q('.css-19ehp9i.e37uo190') ||
        q('[class*="jobsearch-JobComponent-description"]') ||
        q('[class*="css-19ehp9i"]');

      if (descriptionElement) {
        // Extract HTML content and clean it up
        let descriptionHTML = descriptionElement.innerHTML || descriptionElement.outerHTML || '';

        // Clean up the HTML - remove Indeed-specific classes and IDs that might cause styling issues
        descriptionHTML = descriptionHTML
          .replace(/class="[^"]*"/g, '')  // Remove class attributes
          .replace(/id="[^"]*"/g, '')    // Remove id attributes
          .replace(/data-[^=]*="[^"]*"/g, '')  // Remove data attributes
          .replace(/\s+/g, ' ')          // Clean up extra whitespace
          .trim();

        // Wrap in a container div for better styling control
        jobDescription = `<div class="indeed-job-description">${descriptionHTML}</div>`;
      }

      // If still no description found, try to get it from the main content area
      if (!jobDescription) {
        const mainContent = q('#jobsearch-ViewjobPaneWrapper') ||
          q('.jobsearch-ViewJobLayout--embedded') ||
          q('[class*="ViewjobPaneWrapper"]');
        if (mainContent) {
          // Look for any div that contains substantial text content
          const textElements = qa('div').filter(div => {
            const text = div.textContent || '';
            return text.length > 200 && text.length < 5000 &&
              !div.querySelector('div') && // Leaf node
              !text.includes('Apply now') &&
              !text.includes('Save job');
          });

          if (textElements.length > 0) {
            // Take the longest text element as likely description
            const longestElement = textElements.reduce((longest, current) =>
              current.textContent.length > longest.textContent.length ? current : longest
            );

            // Convert to HTML with proper formatting
            let descriptionHTML = longestElement.innerHTML || longestElement.textContent.trim();

            // Clean up the HTML
            descriptionHTML = descriptionHTML
              .replace(/class="[^"]*"/g, '')  // Remove class attributes
              .replace(/id="[^"]*"/g, '')    // Remove id attributes
              .replace(/data-[^=]*="[^"]*"/g, '')  // Remove data attributes
              .replace(/\s+/g, ' ')          // Clean up extra whitespace
              .trim();

            jobDescription = `<div class="indeed-job-description">${descriptionHTML}</div>`;
          }
        }
      }

      // Extract location from Indeed
      let location = 'Unknown Location';
      const locationElement = q('[data-testid="inlineHeader-companyLocation"]') ||
        q('[data-testid="jobsearch-JobInfoHeader-companyLocation"]') ||
        q('.css-1vysp2z div') ||
        q('#jobLocationText span');
      if (locationElement) {
        location = locationElement.textContent.trim();
      }

      // Extract job type from Indeed
      let jobType = 'Unknown Type';
      const typeElement = q('[data-testid="Full-time-tile"] span') ||
        q('[data-testid="Part-time-tile"] span') ||
        q('[data-testid="Contract-tile"] span') ||
        q('.js-match-insights-provider-1vjtffa');
      if (typeElement) {
        jobType = typeElement.textContent.trim();
      }

      // Extract salary if available
      let salary = '';
      const salaryElement = q('[data-testid*="tile"] span') ||
        q('.css-1oc7tea') ||
        q('.js-match-insights-provider-1vjtffa');
      if (salaryElement && salaryElement.textContent.includes('₹')) {
        salary = salaryElement.textContent.trim();
      }

      console.log('Indeed scraping results:', {
        company: companyName,
        position: jobTitle,
        location: location,
        type: jobType,
        salary: salary,
        descriptionLength: jobDescription.length,
        descriptionPreview: jobDescription.substring(0, 100) + (jobDescription.length > 100 ? '...' : '')
      });

      // Additional debugging for description extraction
      if (!jobDescription) {
        console.log('Indeed: No description found, debugging selectors...');
        console.log('#jobDescriptionText:', q('#jobDescriptionText'));
        console.log('.jobsearch-JobComponent-description:', q('.jobsearch-JobComponent-description'));
        console.log('.css-19ehp9i:', q('.css-19ehp9i'));
        console.log('.css-19ehp9i.e37uo190:', q('.css-19ehp9i.e37uo190'));
      }

      return {
        company: companyName,
        position: jobTitle,
        location: location,
        type: jobType,
        salary: salary,
        description: jobDescription,
        url: window.location.href,
        scrapedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error scraping Indeed job data:', error);
      return null;
    }
  }

  // Update job data when page loads or changes
  function updateJobData() {
    if (isJobRightJobPage()) {
      currentJobData = scrapeJobData();
      console.log('JobRight job data scraped:', currentJobData);
    } else if (isLinkedInJobPage()) {
      currentJobData = scrapeLinkedInJobData();
      console.log('LinkedIn job data scraped:', currentJobData);
    } else if (isIndeedJobPage()) {
      currentJobData = scrapeIndeedJobData();
      console.log('Indeed job data scraped:', currentJobData);
    } else {
      currentJobData = null;
    }
  }

  // Listen for page changes (for SPAs)
  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      setTimeout(updateJobData, 1000); // Wait for page to load
    }
  }).observe(document, { subtree: true, childList: true });

  // Initial scrape plus retries and DOM observation for late content
  const tryUpdateWithElement = () => {
    if (isJobRightJobPage()) {
      const titleEl = document.querySelector('[class*="job-title"], h1');
      if (titleEl) {
        updateJobData();
        return true;
      }
    } else if (isLinkedInJobPage()) {
      const titleEl = document.querySelector('.job-details-jobs-unified-top-card__job-title h1 a, .job-details-jobs-unified-top-card__job-title h1, .job-details-jobs-unified-top-card__sticky-header h2, h1 a[href*="/jobs/view/"], h1.t-24');
      const companyEl = document.querySelector('.job-details-jobs-unified-top-card__company-name a, .job-details-jobs-unified-top-card__company-name');
      if (titleEl || companyEl) {
        updateJobData();
        return true;
      }
    } else if (isIndeedJobPage()) {
      const titleEl = document.querySelector('[data-testid="jobsearch-JobInfoHeader-title"], .jobsearch-JobInfoHeader-title, h2[data-testid="jobsearch-JobInfoHeader-title"]');
      if (titleEl) {
        updateJobData();
        return true;
      }
    }
    return false;
  };

  let attempts = 0;
  const intervalId = setInterval(() => {
    attempts += 1;
    if (tryUpdateWithElement() || attempts > 10) {
      clearInterval(intervalId);
    }
  }, 500);

  const domObserver = new MutationObserver(() => {
    if (isJobRightJobPage()) {
      const newData = scrapeJobData();
      if (newData && JSON.stringify(newData) !== JSON.stringify(currentJobData)) {
        currentJobData = newData;
      }
    } else if (isLinkedInJobPage()) {
      const newData = scrapeLinkedInJobData();
      if (newData && JSON.stringify(newData) !== JSON.stringify(currentJobData)) {
        currentJobData = newData;
      }
    } else if (isIndeedJobPage()) {
      const newData = scrapeIndeedJobData();
      if (newData && JSON.stringify(newData) !== JSON.stringify(currentJobData)) {
        currentJobData = newData;
      }
    }
  });
  domObserver.observe(document.body, { subtree: true, childList: true });

  // Expose job data to panel
  window.getCurrentJobData = function () {
    return currentJobData;
  };

  // Debug function to test LinkedIn selectors
  window.debugLinkedInSelectors = function () {
    if (!isLinkedInJobPage()) {
      console.log('Not on a LinkedIn job page');
      return;
    }

    const extractText = (element) => {
      if (!element) return '';
      let text = element.textContent || element.innerText || '';
      if (!text.trim() && element.childNodes) {
        text = Array.from(element.childNodes)
          .filter(node => node.nodeType === Node.TEXT_NODE)
          .map(node => node.textContent)
          .join(' ')
          .trim();
      }
      if (!text.trim()) {
        text = element.innerText || element.textContent || '';
      }
      return text.trim();
    };

    console.log('=== LinkedIn Selector Debug ===');
    console.log('Current URL:', window.location.href);
    
    console.log('\n--- Company Selectors ---');
    const companySelectors = [
      '.job-details-jobs-unified-top-card__company-name a',
      '.job-details-jobs-unified-top-card__company-name',
      '.jobs-unified-top-card__company-name a',
      'a[href*="/company/"]',
      '.artdeco-entity-lockup__title a'
    ];
    companySelectors.forEach(selector => {
      const el = document.querySelector(selector);
      if (el) {
        const text = extractText(el);
        console.log(`${selector}:`, el, 'Text:', text);
      } else {
        console.log(`${selector}:`, 'NOT FOUND');
      }
    });

    console.log('\n--- Title Selectors ---');
    const titleSelectors = [
      '.job-details-jobs-unified-top-card__job-title h1 a',
      '.job-details-jobs-unified-top-card__job-title h1',
      '.job-details-jobs-unified-top-card__sticky-header h2',
      'h1 a[href*="/jobs/view/"]',
      'h1.t-24.t-bold',
      'h1'
    ];
    titleSelectors.forEach(selector => {
      const el = document.querySelector(selector);
      if (el) {
        const text = extractText(el);
        console.log(`${selector}:`, el, 'Text:', text);
      } else {
        console.log(`${selector}:`, 'NOT FOUND');
      }
    });

    console.log('\n--- Description Selectors ---');
    console.log('.jobs-description__content .jobs-box__html-content:', document.querySelector('.jobs-description__content .jobs-box__html-content'));
    console.log('#job-details:', document.querySelector('#job-details'));

    console.log('\n--- Location Selectors ---');
    console.log('.job-details-jobs-unified-top-card__tertiary-description-container .tvm__text:', document.querySelector('.job-details-jobs-unified-top-card__tertiary-description-container .tvm__text'));

    console.log('\n--- Job Type Selectors ---');
    console.log('.job-details-fit-level-preferences button span strong:', document.querySelectorAll('.job-details-fit-level-preferences button span strong'));

    console.log('\n--- Testing scrapeLinkedInJobData() ---');
    const result = scrapeLinkedInJobData();
    console.log('Scraping result:', result);
  };

  // Debug function to test Indeed selectors
  window.debugIndeedSelectors = function () {
    if (!isIndeedJobPage()) {
      console.log('Not on an Indeed job page');
      return;
    }

    console.log('=== Indeed Selector Debug ===');
    console.log('Company selectors:');
    console.log('[data-company-name="true"]:', document.querySelector('[data-company-name="true"]'));
    console.log('[data-testid="inlineHeader-companyName"]:', document.querySelector('[data-testid="inlineHeader-companyName"]'));

    console.log('Title selectors:');
    console.log('[data-testid="jobsearch-JobInfoHeader-title"]:', document.querySelector('[data-testid="jobsearch-JobInfoHeader-title"]'));
    console.log('.jobsearch-JobInfoHeader-title:', document.querySelector('.jobsearch-JobInfoHeader-title'));

    console.log('Description selectors:');
    console.log('#jobDescriptionText:', document.querySelector('#jobDescriptionText'));
    console.log('.jobsearch-JobComponent-description:', document.querySelector('.jobsearch-JobComponent-description'));
    console.log('.css-19ehp9i:', document.querySelector('.css-19ehp9i'));
    console.log('.css-19ehp9i.e37uo190:', document.querySelector('.css-19ehp9i.e37uo190'));
    console.log('[class*="css-19ehp9i"]:', document.querySelectorAll('[class*="css-19ehp9i"]'));

    console.log('Location selectors:');
    console.log('[data-testid="inlineHeader-companyLocation"]:', document.querySelector('[data-testid="inlineHeader-companyLocation"]'));
    console.log('#jobLocationText span:', document.querySelector('#jobLocationText span'));

    console.log('Job type selectors:');
    console.log('[data-testid="Full-time-tile"] span:', document.querySelector('[data-testid="Full-time-tile"] span'));
    console.log('.js-match-insights-provider-1vjtffa:', document.querySelectorAll('.js-match-insights-provider-1vjtffa'));

    // Test the actual scraping function
    console.log('=== Testing scrapeIndeedJobData() ===');
    const result = scrapeIndeedJobData();
    console.log('Scraping result:', result);
  };

  // Listen for messages from panel and background script
  chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.action === 'togglePanel') {
      togglePanel();
      sendResponse({ success: true });
    } else if (request.action === 'getJobData') {
      if (!currentJobData) {
        if (isJobRightJobPage()) {
          currentJobData = scrapeJobData();
        } else if (isLinkedInJobPage()) {
          currentJobData = scrapeLinkedInJobData();
        } else if (isIndeedJobPage()) {
          currentJobData = scrapeIndeedJobData();
        }
      }
      sendResponse({ jobData: currentJobData });
    } else if (request.action === 'scanJobFields') {
      // Generic page scan for company and position
      const result = (function scanPageForCompanyAndTitle() {
        try {
          const companyFromKnown = (document.querySelector('h2.ant-typography strong') || document.querySelector('[class*="company-row"] strong'));
          const titleFromKnown = (document.querySelector('h1.ant-typography') || document.querySelector('[class*="job-title"]'));
          let company = companyFromKnown ? companyFromKnown.textContent.trim() : '';
          let position = titleFromKnown ? titleFromKnown.textContent.trim() : '';

          if (!position) {
            const titleCandidates = Array.from(document.querySelectorAll('h1, h2'))
              .map(el => ({ el, text: el.textContent.trim() }))
              .filter(x => x.text.length >= 3 && x.text.length <= 140)
              .filter(x => !/\b(about|company|login|sign in|subscribe|contact|apply now)\b/i.test(x.text));
            if (titleCandidates.length) {
              titleCandidates.sort((a, b) => {
                const aw = a.el.tagName === 'H1' ? 2 : 1;
                const bw = b.el.tagName === 'H1' ? 2 : 1;
                if (bw !== aw) return bw - aw;
                return b.text.length - a.text.length;
              });
              position = titleCandidates[0].text;
            }
          }

          if (!company) {
            const strongNearTitle = titleFromKnown ? titleFromKnown.closest('*') : null;
            if (strongNearTitle) {
              const strong = strongNearTitle.parentElement ? strongNearTitle.parentElement.querySelector('strong') : null;
              if (strong) company = strong.textContent.trim();
            }
            if (!company) {
              const labelEls = Array.from(document.querySelectorAll('label, span, div, dt'))
                .filter(el => /company|employer|organization/i.test(el.textContent))
                .slice(0, 50);
              for (const el of labelEls) {
                const next = el.nextElementSibling;
                if (next && next.textContent.trim()) {
                  company = next.textContent.trim();
                  break;
                }
              }
            }
          }

          return { company: company || null, position: position || null };
        } catch (e) {
          return { company: null, position: null };
        }
      })();
      sendResponse(result);
    } else if (request.action === 'extractPageHtml') {
      try {
        let textContent = '';
        
        // For LinkedIn job pages, focus on the currently viewed job only
        if (isLinkedInJobPage()) {
          // Try to get structured data first
          const structuredData = scrapeLinkedInJobData();
          if (structuredData && structuredData.company !== 'Unknown Company' && structuredData.position !== 'Unknown Position') {
            // Use structured data to build focused content
            textContent = `Job Title: ${structuredData.position}\n`;
            textContent += `Company: ${structuredData.company}\n`;
            textContent += `Location: ${structuredData.location}\n`;
            textContent += `Job Type: ${structuredData.type}\n\n`;
            textContent += `Job Description:\n${structuredData.description || ''}\n`;
          } else {
            // Fallback: Extract only from the main job details panel
            const mainJobPanel = document.querySelector('.jobs-details__main-content') ||
                                document.querySelector('.job-details-jobs-unified-top-card__container') ||
                                document.querySelector('.jobs-description__content') ||
                                document.querySelector('#job-details');
            
            if (mainJobPanel) {
              // Extract text only from the main job panel, excluding sidebar job lists
              textContent = mainJobPanel.innerText || mainJobPanel.textContent || '';
              
              // Also try to get structured info from the top card
              const topCard = document.querySelector('.job-details-jobs-unified-top-card__container');
              if (topCard) {
                const topCardText = topCard.innerText || topCard.textContent || '';
                // Prepend top card info if not already included
                if (!textContent.includes(topCardText.substring(0, 100))) {
                  textContent = topCardText + '\n\n' + textContent;
                }
              }
            } else {
              // Last resort: use body but try to exclude job list sidebars
              const jobListSidebars = document.querySelectorAll('.jobs-search-results-list, .jobs-search__results-list, [class*="jobs-search-results"]');
              const bodyClone = document.body.cloneNode(true);
              
              // Remove job list sidebars from clone
              jobListSidebars.forEach(sidebar => {
                const cloneSidebar = bodyClone.querySelector(`[class="${sidebar.className}"]`);
                if (cloneSidebar) cloneSidebar.remove();
              });
              
              textContent = bodyClone.innerText || bodyClone.textContent || '';
            }
          }
        } 
        // For Indeed job pages, focus on the main job view
        else if (isIndeedJobPage()) {
          const structuredData = scrapeIndeedJobData();
          if (structuredData && structuredData.company !== 'Unknown Company' && structuredData.position !== 'Unknown Position') {
            textContent = `Job Title: ${structuredData.position}\n`;
            textContent += `Company: ${structuredData.company}\n`;
            textContent += `Location: ${structuredData.location}\n`;
            textContent += `Job Type: ${structuredData.type}\n`;
            if (structuredData.salary) {
              textContent += `Salary: ${structuredData.salary}\n`;
            }
            textContent += `\nJob Description:\n${structuredData.description || ''}\n`;
          } else {
            // Focus on main job view panel
            const mainJobView = document.querySelector('#jobDescriptionText') ||
                               document.querySelector('.jobsearch-JobComponent-description') ||
                               document.querySelector('#jobsearch-ViewjobPaneWrapper') ||
                               document.querySelector('.jobsearch-ViewJobLayout--embedded');
            
            if (mainJobView) {
              textContent = mainJobView.innerText || mainJobView.textContent || '';
            } else {
              textContent = document.body.innerText || document.body.textContent || '';
            }
          }
        }
        // For JobRight pages
        else if (isJobRightJobPage()) {
          const structuredData = scrapeJobData();
          if (structuredData && structuredData.company !== 'Unknown Company' && structuredData.position !== 'Unknown Position') {
            textContent = `Job Title: ${structuredData.position}\n`;
            textContent += `Company: ${structuredData.company}\n`;
            textContent += `Location: ${structuredData.location}\n`;
            textContent += `Job Type: ${structuredData.type}\n\n`;
            textContent += `Job Description:\n${structuredData.description || ''}\n`;
          } else {
            textContent = document.body.innerText || document.body.textContent || '';
          }
        }
        // For other pages, use full body
        else {
          textContent = document.body.innerText || document.body.textContent || '';
        }

        const payload = {
          content: textContent.trim(),
          source: location.hostname,
          websiteUrl: location.href
        };
        sendResponse({ ok: true, payload });
      } catch (e) {
        console.error('Extraction error:', e);
        sendResponse({ ok: false, error: String(e) });
      }
    }
  });

  const panel = document.createElement('div');
  panel.id = 'extension-panel';
  panel.style.cssText = `
      position: fixed;
      top: 0;
      right: 0;
      width: 350px;
      height: 100vh;
      background: white;
      z-index: 9999;
      box-shadow: -2px 0 10px rgba(0,0,0,0.2);
      overflow-y: auto;
      display: none;
      border-left: 1px solid #ddd;
    `;

  const iframe = document.createElement('iframe');
  iframe.src = chrome.runtime.getURL('panel.html');
  iframe.style.cssText = `
      width: 100%;
      height: 100%;
      border: none;
    `;

  // Create close button
  const closeButton = document.createElement('button');
  closeButton.innerHTML = '×';
  closeButton.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      width: 30px;
      height: 30px;
      background: #dc3545;
      color: white;
      border: none;
      border-radius: 50%;
      cursor: pointer;
      font-size: 18px;
      font-weight: bold;
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    `;

  closeButton.addEventListener('click', function () {
    panel.style.display = 'none';
  });

  panel.appendChild(closeButton);
  panel.appendChild(iframe);
  document.body.appendChild(panel);

  // Add styles for the panel (no overlay needed)
  const style = document.createElement('style');
  style.textContent = `
      /* No overlay or body restrictions - allow full website interaction */
    `;
  document.head.appendChild(style);

  // Panel will be shown only when extension icon is clicked

  function togglePanel() {
    const panel = document.getElementById('extension-panel');
    const isVisible = panel.style.display === 'block';

    if (isVisible) {
      panel.style.display = 'none';
    } else {
      panel.style.display = 'block';
    }
  }
})();