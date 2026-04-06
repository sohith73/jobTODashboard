// ─── Dashboard Backend (port 8086) ────────────────────────────────────────────
export const API_BASE_URL = 'http://localhost:8086';
// export const API_BASE_URL = 'https://dashboard-api.flashfirejobs.com';

// ─── Gemini Resume Backend (port 5000) ────────────────────────────────────────
export const RESUME_BACKEND_URL = 'http://localhost:5000';
// export const RESUME_BACKEND_URL = 'https://resume-api.flashfirejobs.com';

// ─── Frontend Dashboard ────────────────────────────────────────────────────────
export const DASHBOARD_FRONTEND_URL = 'http://localhost:3000';
// export const DASHBOARD_FRONTEND_URL = 'https://portal.flashfirejobs.com';

// ─── API Endpoints (relative) ─────────────────────────────────────────────────
export const API_ENDPOINTS = {
  LOGIN: '/extension/login',
  CLIENT_LOGIN: '/extension/clientLogin',
  SAVE_TO_DASHBOARD: '/extension/saveToDashboard',
  SEND_DATA: '/extension/sendData',
  EXTRACT_JOB_DATA: '/extension/extractJobData',
  EXCLUSION_LISTS: '/extension/exclusion-lists',
  FLASH_FILL: '/flash-fill',
  GET_OPTIMIZED_RESUME: '/getOptimizedResume',
  // Resume backend endpoints
  RESUME_BY_EMAIL: '/api/resume-by-email'
};

// ─── Full API URLs ─────────────────────────────────────────────────────────────
export const API_URLS = {
  LOGIN: `${API_BASE_URL}${API_ENDPOINTS.LOGIN}`,
  CLIENT_LOGIN: `${API_BASE_URL}${API_ENDPOINTS.CLIENT_LOGIN}`,
  SAVE_TO_DASHBOARD: `${API_BASE_URL}${API_ENDPOINTS.SAVE_TO_DASHBOARD}`,
  SEND_DATA: `${API_BASE_URL}${API_ENDPOINTS.SEND_DATA}`,
  EXTRACT_JOB_DATA: `${API_BASE_URL}${API_ENDPOINTS.EXTRACT_JOB_DATA}`,
  EXCLUSION_LISTS: `${API_BASE_URL}${API_ENDPOINTS.EXCLUSION_LISTS}`,
  FLASH_FILL: `${API_BASE_URL}${API_ENDPOINTS.FLASH_FILL}`,
  GET_OPTIMIZED_RESUME: `${API_BASE_URL}${API_ENDPOINTS.GET_OPTIMIZED_RESUME}`,
  // Resume backend
  RESUME_BY_EMAIL: `${RESUME_BACKEND_URL}${API_ENDPOINTS.RESUME_BY_EMAIL}`
};
