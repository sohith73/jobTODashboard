import { API_URLS } from './exports.js';

document.addEventListener('DOMContentLoaded', function () {
  const loginForm = document.getElementById('login-form');
  const loginContainer = document.getElementById('login-container');
  const clientContainer = document.getElementById('client-container');
  const mainContainer = document.getElementById('main-container');
  const loginMessage = document.getElementById('login-message');
  const usersList = document.getElementById('users-list');
  const searchInput = document.getElementById('search-input');
  const addJobsBtn = document.getElementById('add-jobs');
  const logoutBtn = document.getElementById('logout-btn');
  const uncheckAllBtn = document.getElementById('uncheck-all-btn');
  const extractBtn = document.getElementById('extract-btn');
  const togglePasswordBtn = document.getElementById('toggle-password');
  const passwordInput = document.getElementById('password');
  const scrollToTopBtn = document.getElementById('scroll-to-top');
  const scrollToTopLeftBtn = document.getElementById('scroll-to-top-left');
  const clientSaveBtn = document.getElementById('client-save');
  const clientVisitLink = document.getElementById('client-visit');
  const clientLogoutBtn = document.getElementById('client-logout-btn');
  const clientSubtitleEl = document.querySelector('.brand-subtitle');
  const rolesListEl = document.getElementById('client-preferred-roles');
  const locationsListEl = document.getElementById('client-preferred-locations');

  // Modal elements
  const jobModal = document.getElementById('job-description-modal');
  const closeModalBtn = document.getElementById('close-modal');
  const cancelJobBtn = document.getElementById('cancel-job');
  const saveJobBtn = document.getElementById('save-job');
  const companyNameInput = document.getElementById('company-name');
  const jobTitleInput = document.getElementById('job-title');
  const jobDescriptionInput = document.getElementById('job-description');

  let allUsers = [];
  let selectedUsers = [];
  let loggedInEmail = '';
  let loggedInName = '';

  // localStorage functions
  function saveLoginData(users) {
    localStorage.setItem('extension_login_data', JSON.stringify({
      users: users,
      timestamp: Date.now()
    }));
  }
  function saveClientLogin(email, name) {
    localStorage.setItem('extension_client_login', JSON.stringify({
      email: email,
      name: name || '',
      timestamp: Date.now()
    }));
  }

  function saveClientPreferredRoles(roles) {
    try {
      localStorage.setItem('extension_client_roles', JSON.stringify({
        roles: Array.isArray(roles) ? roles : [],
        timestamp: Date.now()
      }));
    } catch (e) { }
  }
  function saveClientPreferredLocations(locations) {
    try {
      localStorage.setItem('extension_client_locations', JSON.stringify({
        locations: Array.isArray(locations) ? locations : [],
        timestamp: Date.now()
      }));
    } catch (e) { }
  }

  function saveClientAuth(token, profile) {
    try {
      if (token) localStorage.setItem('extension_client_token', token);
      if (profile) localStorage.setItem('extension_client_profile', JSON.stringify(profile));
    } catch (e) { }
  }

  function loadLoginData() {
    try {
      const data = localStorage.getItem('extension_login_data');
      if (data) {
        const parsed = JSON.parse(data);
        if (Date.now() - parsed.timestamp < 30 * 24 * 60 * 60 * 1000) {
          return parsed.users;
        } else {
          // Clear old data
          localStorage.removeItem('extension_login_data');
        }
      }
    } catch (error) {
      console.error('Error loading login data:', error);
      localStorage.removeItem('extension_login_data');
    }
    return null;
  }
  function loadClientLogin() {
    try {
      const data = localStorage.getItem('extension_client_login');
      if (data) {
        const parsed = JSON.parse(data);
        if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
          return { email: parsed.email || '', name: parsed.name || '' };
        } else {
          localStorage.removeItem('extension_client_login');
        }
      }
    } catch (error) {
      localStorage.removeItem('extension_client_login');
    }
    return null;
  }

  function loadClientPreferredRoles() {
    try {
      const data = localStorage.getItem('extension_client_roles');
      if (data) {
        const parsed = JSON.parse(data);
        if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
          return Array.isArray(parsed.roles) ? parsed.roles : [];
        }
      }
    } catch (e) { }
    return [];
  }
  function loadClientPreferredLocations() {
    try {
      const data = localStorage.getItem('extension_client_locations');
      if (data) {
        const parsed = JSON.parse(data);
        if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
          return Array.isArray(parsed.locations) ? parsed.locations : [];
        }
      }
    } catch (e) { }
    return [];
  }

  function loadClientAuth() {
    try {
      const token = localStorage.getItem('extension_client_token') || '';
      const profileRaw = localStorage.getItem('extension_client_profile');
      const profile = profileRaw ? JSON.parse(profileRaw) : null;
      return { token, profile };
    } catch (e) {
      return { token: '', profile: null };
    }
  }

  function deriveDisplayName(email) {
    try {
      const localPart = (email || '').split('@')[0] || '';
      const cleaned = localPart.replace(/[._-]+/g, ' ').trim();
      if (!cleaned) return '';
      return cleaned.split(' ').map(s => s ? (s[0].toUpperCase() + s.slice(1)) : '').join(' ').trim();
    } catch (e) {
      return '';
    }
  }

  function setClientGreeting(name, email) {
    if (!clientSubtitleEl) return;
    const display = name && name.trim() ? name.trim() : deriveDisplayName(email) || '';
    if (display) {
      clientSubtitleEl.textContent = `Hi ${display}, I'm your FireFlash copilot! How can I help?`;
    } else {
      clientSubtitleEl.textContent = `I'm your FireFlash copilot! How can I help?`;
    }
  }

  function normalizeList(items) {
    const rawItems = Array.isArray(items) ? items : [items];
    const parts = [];
    for (const item of rawItems) {
      if (Array.isArray(item)) {
        item.forEach(sub => parts.push(sub));
      } else if (typeof item === 'string') {
        item.split(/[\n,]+/).forEach(p => parts.push(p));
      } else if (item != null) {
        parts.push(String(item));
      }
    }
    const cleaned = parts
      .map(x => String(x || '').trim())
      .filter(x => x.length > 0);
    // de-duplicate while preserving order
    const seen = new Set();
    const unique = [];
    for (const c of cleaned) {
      if (!seen.has(c.toLowerCase())) {
        seen.add(c.toLowerCase());
        unique.push(c);
      }
    }
    return unique;
  }
  function renderPreferredRoles(roles) {
    if (!rolesListEl) return;
    rolesListEl.innerHTML = '';
    const clean = normalizeList(roles);
    clean.forEach(role => {
      const chip = document.createElement('span');
      chip.className = 'role-chip';
      chip.textContent = role;
      rolesListEl.appendChild(chip);
    });
  }
  function renderPreferredLocations(locations) {
    if (!locationsListEl) return;
    locationsListEl.innerHTML = '';
    const clean = normalizeList(locations);
    clean.forEach(loc => {
      const chip = document.createElement('span');
      chip.className = 'role-chip';
      chip.textContent = loc;
      locationsListEl.appendChild(chip);
    });
  }

  function clearLoginData() {
    localStorage.removeItem('extension_login_data');
    localStorage.removeItem('extension_client_login');
  }

  // Check for existing login data on page load
  function checkExistingLogin() {
    const savedUsers = loadLoginData();
    if (savedUsers && savedUsers.length > 0) {
      allUsers = savedUsers;
      selectedUsers = [];
      renderUsers(allUsers);
      loginContainer.classList.add('hidden');
      mainContainer.classList.remove('hidden');
      return;
    }
    const savedClient = loadClientLogin();
    if (savedClient) {
      loggedInEmail = savedClient.email || '';
      loggedInName = savedClient.name || '';
      loginContainer.classList.add('hidden');
      if (clientContainer) clientContainer.classList.remove('hidden');
      setClientGreeting(loggedInName, loggedInEmail);
      let cachedRoles = loadClientPreferredRoles();
      if (!cachedRoles.length) {
        const { profile } = loadClientAuth();
        if (profile && Array.isArray(profile.preferredRoles)) {
          cachedRoles = profile.preferredRoles;
        }
      }
      renderPreferredRoles(cachedRoles);
      let cachedLocs = loadClientPreferredLocations();
      if (!cachedLocs.length) {
        const { profile } = loadClientAuth();
        if (profile && Array.isArray(profile.preferredLocations)) {
          cachedLocs = profile.preferredLocations;
        }
      }
      renderPreferredLocations(cachedLocs);
    }
  }

  // Initialize
  checkExistingLogin();

  // Password toggle functionality
  if (togglePasswordBtn && passwordInput) {
    togglePasswordBtn.addEventListener('click', function () {
      if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        togglePasswordBtn.textContent = '🙈';
      } else {
        passwordInput.type = 'password';
        togglePasswordBtn.textContent = '👁️';
      }
    });
  }

  // Scroll to top functionality
  if (scrollToTopBtn) {
    // Show/hide scroll to top button based on scroll position
    function toggleScrollToTopButton() {
      const container = document.querySelector('.container');
      if (container.scrollTop > 300) {
        scrollToTopBtn.classList.remove('hidden');
        if (scrollToTopLeftBtn) {
          scrollToTopLeftBtn.classList.remove('hidden');
        }
      } else {
        scrollToTopBtn.classList.add('hidden');
        if (scrollToTopLeftBtn) {
          scrollToTopLeftBtn.classList.add('hidden');
        }
      }
    }

    // Add scroll event listener to container
    const container = document.querySelector('.container');
    if (container) {
      container.addEventListener('scroll', toggleScrollToTopButton);
    }

    // Scroll to top when button is clicked
    scrollToTopBtn.addEventListener('click', function () {
      if (container) {
        container.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      }
    });
  }

  // Left side scroll to top functionality
  if (scrollToTopLeftBtn) {
    scrollToTopLeftBtn.addEventListener('click', function () {
      const container = document.querySelector('.container');
      if (container) {
        container.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      }
    });
  }

  // Handle login
  loginForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
      const isAdmin = /@flashfirehq$/i.test(email.trim());
      const loginUrl = isAdmin ? API_URLS.LOGIN : API_URLS.CLIENT_LOGIN;
      const response = await fetch(loginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          password: password
        })
      });

      const data = await response.json();

      if (!response.ok) {
        showMessage(data.message || 'Login failed', 'error');
        return;
      }

      if (isAdmin) {
        allUsers = data.users || [];
        selectedUsers = [];
        saveLoginData(allUsers);
        renderUsers(allUsers);
        loginContainer.classList.add('hidden');
        mainContainer.classList.remove('hidden');
      } else {
        const userDetails = (data && data.userDetails) ? data.userDetails : {};
        const token = data && data.token ? data.token : '';
        const userProfile = data && data.userProfile ? data.userProfile : null;
        loggedInEmail = userDetails.email || email;
        loggedInName = userDetails.name || '';
        let preferredRoles = Array.isArray(userDetails.preferredRoles) ? userDetails.preferredRoles : (typeof userDetails.preferredRoles === 'string' ? userDetails.preferredRoles : []);
        if (!preferredRoles.length && userProfile && Array.isArray(userProfile.preferredRoles)) {
          preferredRoles = userProfile.preferredRoles;
        }
        let preferredLocations = Array.isArray(userDetails.preferredLocations) ? userDetails.preferredLocations : (typeof userDetails.preferredLocations === 'string' ? userDetails.preferredLocations : []);
        if (!preferredLocations.length && userProfile && Array.isArray(userProfile.preferredLocations)) {
          preferredLocations = userProfile.preferredLocations;
        }
        saveClientLogin(loggedInEmail, loggedInName);
        saveClientPreferredRoles(normalizeList(preferredRoles));
        saveClientPreferredLocations(normalizeList(preferredLocations));
        saveClientAuth(token, userProfile);
        loginContainer.classList.add('hidden');
        if (clientContainer) clientContainer.classList.remove('hidden');
        setClientGreeting(loggedInName, loggedInEmail);
        renderPreferredRoles(preferredRoles);
        renderPreferredLocations(preferredLocations);
      }
    } catch (error) {
      showMessage('Network error. Please try again.', 'error');
      console.error('Login error:', error);
    }
  });

  // Client simplified actions
  if (clientVisitLink) {
    clientVisitLink.setAttribute('href', 'https://portal.flashfirejobs.com/');
  }
  if (clientSaveBtn) {
    clientSaveBtn.addEventListener('click', function () {
      // For client, we still reuse the same modal and saving flow
      showJobModal();
    });
  }
  if (clientLogoutBtn) {
    clientLogoutBtn.addEventListener('click', function () {
      clearLoginData();
      try { localStorage.removeItem('extension_client_roles'); } catch (e) { }
      try { localStorage.removeItem('extension_client_token'); } catch (e) { }
      try { localStorage.removeItem('extension_client_profile'); } catch (e) { }
      allUsers = [];
      selectedUsers = [];
      loggedInEmail = '';
      loggedInName = '';
      // Swap views
      if (clientContainer) clientContainer.classList.add('hidden');
      loginContainer.classList.remove('hidden');
      // Clear form
      const emailInput = document.getElementById('email');
      const passwordInputLocal = document.getElementById('password');
      if (emailInput) emailInput.value = '';
      if (passwordInputLocal) passwordInputLocal.value = '';
      // Reset greeting text
      setClientGreeting('', '');
      if (rolesListEl) rolesListEl.innerHTML = '';
    });
  }

  // Handle search
  searchInput.addEventListener('input', function () {
    const searchTerm = this.value.toLowerCase();
    const filteredUsers = allUsers.filter(user =>
      user.name.toLowerCase().includes(searchTerm)
    );
    renderUsers(filteredUsers);
  });

  // Handle Add Jobs button
  addJobsBtn.addEventListener('click', function () {
    // For admin flow we require selection; for client flow we allow zero because we'll inject their email later
    if (!loggedInEmail && selectedUsers.length === 0) {
      alert('Please select at least one user before adding jobs.');
      return;
    }
    showJobModal();
  });

  // Handle uncheck all button
  uncheckAllBtn.addEventListener('click', function () {
    selectedUsers = [];
    // Uncheck all checkboxes
    document.querySelectorAll('.user-checkbox').forEach(checkbox => {
      checkbox.checked = false;
    });
  });

  // Handle logout button
  logoutBtn.addEventListener('click', function () {
    clearLoginData();
    allUsers = [];
    selectedUsers = [];
    loginContainer.classList.remove('hidden');
    mainContainer.classList.add('hidden');
    // Clear form
    document.getElementById('email').value = '';
    document.getElementById('password').value = '';
  });

  // Modal functions
  function showJobModal() {
    // Try to auto-fill from current page if it's a jobright.ai page
    try {
      if (chrome && chrome.tabs && chrome.tabs.query) {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
          const currentUrl = (tabs && tabs[0] && tabs[0].url) ? tabs[0].url : undefined;

          if (currentUrl && (currentUrl.includes('jobright.ai/jobs/info/') ||
            currentUrl.includes('linkedin.com/jobs/view/') ||
            currentUrl.includes('linkedin.com/jobs/collections/') ||
            currentUrl.includes('currentJobId=') ||
            currentUrl.includes('indeed.com'))) {
            // Try to get job data from the content script
            try {
              chrome.tabs.sendMessage(tabs[0].id, { action: 'getJobData' }, function (response) {
                console.log('Panel received response from content script:', response);
                if (response && response.jobData) {
                  const jobData = response.jobData;
                  console.log('Panel auto-filling with job data:', jobData);
                  companyNameInput.value = jobData.company || '';
                  jobTitleInput.value = jobData.position || '';
                  jobDescriptionInput.value = jobData.description || '';
                  console.log('Panel form fields populated:', {
                    company: companyNameInput.value,
                    title: jobTitleInput.value,
                    descriptionLength: jobDescriptionInput.value.length,
                    descriptionPreview: jobDescriptionInput.value.substring(0, 100) + (jobDescriptionInput.value.length > 100 ? '...' : '')
                  });
                } else {
                  console.log('No job data received from content script');
                }
              });
            } catch (error) {
              console.log('Could not auto-fill job data:', error);
            }
          }
        });
      }
    } catch (err) {
      console.log('Error getting current tab:', err);
    }

    jobModal.classList.remove('hidden');
  }

  function hideJobModal() {
    jobModal.classList.add('hidden');
    // Clear form
    companyNameInput.value = '';
    jobTitleInput.value = '';
    jobDescriptionInput.value = '';
  }

  async function saveJobData() {
    const companyName = companyNameInput.value.trim();
    const jobTitle = jobTitleInput.value.trim();
    const jobDescription = jobDescriptionInput.value.trim();

    if (!companyName || !jobTitle || !jobDescription) {
      alert('Please fill in all fields: Company Name, Job Title, and Job Description.');
      return;
    }

    let selectedEmails = selectedUsers.map(id => {
      const user = allUsers.find(u => u._id === id);
      return user ? user.email : null;
    }).filter(email => email !== null);
    if (!selectedEmails.length && loggedInEmail) {
      selectedEmails = [loggedInEmail];
    }

    // Get current URL
    let currentUrl = 'Unknown URL';
    try {
      if (chrome && chrome.tabs && chrome.tabs.query) {
        chrome.tabs.query({ active: true, currentWindow: true }, async function (tabs) {
          currentUrl = (tabs && tabs[0] && tabs[0].url) ? tabs[0].url : 'Unknown URL';

          const jobData = {
            company: companyName,
            position: jobTitle,
            description: jobDescription,
            url: currentUrl,
            selectedEmails: selectedEmails,
            savedAt: new Date().toISOString()
          };

          console.log('Saving job data:', jobData);

          // Send to backend
          try {
            const response = await fetch(API_URLS.SAVE_TO_DASHBOARD, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(jobData)
            });

            const responseData = await response.json();

            if (response.ok) {
              console.log('Job saved to dashboard successfully:', responseData);
              alert('Job saved to dashboard successfully!');
              hideJobModal();
            } else {
              console.error('Failed to save job:', responseData);
              alert('Failed to save job: ' + (responseData.message || 'Unknown error'));
            }
          } catch (error) {
            console.error('Error saving job:', error);
            alert('Error saving job: ' + error.message);
          }
        });
      } else {
        const jobData = {
          company: companyName,
          position: jobTitle,
          description: jobDescription,
          url: currentUrl,
          selectedEmails: selectedEmails,
          savedAt: new Date().toISOString()
        };

        console.log('Saving job data:', jobData);

        // Send to backend
        try {
          const response = await fetch(API_URLS.SAVE_TO_DASHBOARD, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(jobData)
          });

          const responseData = await response.json();

          if (response.ok) {
            console.log('Job saved to dashboard successfully:', responseData);
            alert('Job saved to dashboard successfully!');
            hideJobModal();
          } else {
            console.error('Failed to save job:', responseData);
            alert('Failed to save job: ' + (responseData.message || 'Unknown error'));
          }
        } catch (error) {
          console.error('Error saving job:', error);
          alert('Error saving job: ' + error.message);
        }
      }
    } catch (err) {
      const jobData = {
        company: companyName,
        position: jobTitle,
        description: jobDescription,
        url: currentUrl,
        selectedEmails: selectedEmails,
        savedAt: new Date().toISOString()
      };

      console.log('Saving job data:', jobData);

      // Send to backend
      try {
        const response = await fetch(API_URLS.SAVE_TO_DASHBOARD, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(jobData)
        });

        const responseData = await response.json();

        if (response.ok) {
          console.log('Job saved to dashboard successfully:', responseData);
          alert('Job saved to dashboard successfully!');
          hideJobModal();
        } else {
          console.error('Failed to save job:', responseData);
          alert('Failed to save job: ' + (responseData.message || 'Unknown error'));
        }
      } catch (error) {
        console.error('Error saving job:', error);
        alert('Error saving job: ' + error.message);
      }
    }
  }

  // Modal event listeners
  closeModalBtn.addEventListener('click', hideJobModal);
  cancelJobBtn.addEventListener('click', hideJobModal);
  saveJobBtn.addEventListener('click', saveJobData);

  // Close modal when clicking outside
  jobModal.addEventListener('click', function (e) {
    if (e.target === jobModal) {
      hideJobModal();
    }
  });

  // Close modal with Escape key
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !jobModal.classList.contains('hidden')) {
      hideJobModal();
    }
  });

  async function extractJobDataWithOpenAI(textContent, websiteUrl) {
    try {
      const response = await fetch(API_URLS.EXTRACT_JOB_DATA, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: textContent,
          websiteUrl: websiteUrl
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Backend API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success || !data.data) {
        throw new Error(data.message || 'Failed to extract job data');
      }

      return {
        company: data.data.company || 'Unknown',
        position: data.data.position || 'Unknown',
        description: data.data.description || ''
      };
    } catch (error) {
      console.error('Job extraction error:', error);
      throw error;
    }
  }

  extractBtn.addEventListener('click', async function () {
    try {
      if (selectedUsers.length === 0 && !loggedInEmail) {
        alert('Please select at least one user before extracting.');
        return;
      }

      const selectedEmails = selectedUsers.length > 0 
        ? selectedUsers.map(id => {
            const user = allUsers.find(u => u._id === id);
            return user ? user.email : null;
          }).filter(email => email !== null)
        : loggedInEmail ? [loggedInEmail] : [];

      if (selectedEmails.length === 0) {
        alert('Please select at least one user before extracting.');
        return;
      }

      extractBtn.disabled = true;
      extractBtn.textContent = 'Extracting...';

      if (chrome && chrome.tabs && chrome.tabs.query) {
        chrome.tabs.query({ active: true, currentWindow: true }, async function (tabs) {
          const tabId = tabs && tabs[0] ? tabs[0].id : undefined;
          if (!tabId) {
            alert('No active tab found for extraction');
            extractBtn.disabled = false;
            extractBtn.textContent = 'Extract';
            return;
          }

          function tryExtraction() {
            // First, try to get structured job data (more reliable)
            chrome.tabs.sendMessage(tabId, { action: 'getJobData' }, async function (structuredResponse) {
              if (chrome.runtime.lastError) {
                chrome.scripting.executeScript({
                  target: { tabId: tabId },
                  files: ['content.js']
                }).then(() => {
                  setTimeout(tryExtraction, 1000);
                }).catch((error) => {
                  alert('Failed to inject content script. Please refresh the page and try again.');
                  extractBtn.disabled = false;
                  extractBtn.textContent = 'Extract';
                });
                return;
              }

              let extractedData = null;
              
              // If we got structured data and it's valid, use it
              if (structuredResponse && structuredResponse.jobData && 
                  structuredResponse.jobData.company !== 'Unknown Company' && 
                  structuredResponse.jobData.position !== 'Unknown Position') {
                extractedData = {
                  company: structuredResponse.jobData.company,
                  position: structuredResponse.jobData.position,
                  description: structuredResponse.jobData.description || ''
                };
                console.log('Using structured job data:', extractedData);
                processExtractedData(extractedData, selectedEmails);
              } else {
                // Fallback to AI extraction
                console.log('Structured data not available, falling back to AI extraction');
                chrome.tabs.sendMessage(tabId, { action: 'extractPageHtml' }, async function (response) {
                  if (chrome.runtime.lastError) {
                    alert('Failed to communicate with content script. Please refresh the page and try again.');
                    extractBtn.disabled = false;
                    extractBtn.textContent = 'Extract';
                    return;
                  }

                  if (response && response.ok) {
                    const { content, websiteUrl } = response.payload;

                    try {
                      extractedData = await extractJobDataWithOpenAI(content, websiteUrl);
                      console.log('Using AI-extracted job data:', extractedData);
                      processExtractedData(extractedData, selectedEmails);
                    } catch (extractionError) {
                      console.error('Extraction error:', extractionError);
                      alert('Failed to extract job data: ' + extractionError.message);
                      extractBtn.disabled = false;
                      extractBtn.textContent = 'Extract';
                    }
                  } else {
                    const errorMsg = response && response.error ? response.error : 'Unknown error';
                    alert('Failed to extract page content: ' + errorMsg);
                    extractBtn.disabled = false;
                    extractBtn.textContent = 'Extract';
                  }
                });
              }
            });
          }

          function processExtractedData(extractedData, selectedEmails) {
            if (!extractedData) {
              alert('Failed to extract job data. Please try again.');
              extractBtn.disabled = false;
              extractBtn.textContent = 'Extract';
              return;
            }

            // Populate form fields with extracted data
            companyNameInput.value = extractedData.company || '';
            jobTitleInput.value = extractedData.position || '';
            jobDescriptionInput.value = extractedData.description || '';
            
            // Show the modal so user can review and edit
            showJobModal();
            
            // Reset button state
            extractBtn.disabled = false;
            extractBtn.textContent = 'Extract';
            
            console.log('Extracted data populated in form:', {
              company: companyNameInput.value,
              title: jobTitleInput.value,
              descriptionLength: jobDescriptionInput.value.length
            });
          }

          tryExtraction();
        });
      } else {
        alert('Chrome tabs API not available');
        extractBtn.disabled = false;
        extractBtn.textContent = 'Extract';
      }
    } catch (err) {
      console.error('Extraction error:', err);
      alert('Extraction error: ' + err.message);
      extractBtn.disabled = false;
      extractBtn.textContent = 'Extract';
    }
  });

  // Render users list
  function renderUsers(users) {
    usersList.innerHTML = '';

    if (users.length === 0) {
      usersList.innerHTML = '<p class="no-users">No users found</p>';
      return;
    }

    users.forEach(user => {
      const userCard = document.createElement('div');
      userCard.className = 'user-card';

      const isSelected = selectedUsers.includes(user._id);

      userCard.innerHTML = `
          <div class="user-info">
            <h3>${user.name}</h3>
            <p>${user.email}</p>
          </div>
          <div class="checkbox-container">
            <input type="checkbox" class="user-checkbox" data-id="${user._id}" ${isSelected ? 'checked' : ''}>
            <span class="checkmark"></span>
          </div>
        `;

      usersList.appendChild(userCard);

      // Add click event listener to the entire user card
      userCard.addEventListener('click', function (e) {
        // Don't trigger if clicking directly on the checkbox
        if (e.target.type === 'checkbox') return;

        const checkbox = userCard.querySelector('.user-checkbox');
        const userId = checkbox.dataset.id;

        // Toggle checkbox
        checkbox.checked = !checkbox.checked;

        if (checkbox.checked) {
          if (!selectedUsers.includes(userId)) {
            selectedUsers.push(userId);
          }
        } else {
          selectedUsers = selectedUsers.filter(id => id !== userId);
        }
      });
    });

    // Add event listeners to checkboxes (for direct checkbox clicks)
    document.querySelectorAll('.user-checkbox').forEach(checkbox => {
      checkbox.addEventListener('change', function () {
        const userId = this.dataset.id;

        if (this.checked) {
          if (!selectedUsers.includes(userId)) {
            selectedUsers.push(userId);
          }
        } else {
          selectedUsers = selectedUsers.filter(id => id !== userId);
        }
      });
    });
  }

  // Show message
  function showMessage(message, type) {
    loginMessage.textContent = message;
    loginMessage.className = `message ${type}`;

    setTimeout(() => {
      loginMessage.textContent = '';
      loginMessage.className = '';
    }, 3000);
  }
});