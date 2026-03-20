// API Configuration
export const API_BASE_URL = 'http://localhost:8086';
// export const API_BASE_URL = 'https://dashboard-api.flashfirejobs.com';

// API Endpoints
export const API_ENDPOINTS = {
  LOGIN: '/extension/login',
  CLIENT_LOGIN: '/extension/clientLogin',
  SAVE_TO_DASHBOARD: '/extension/saveToDashboard',
  SEND_DATA: '/extension/sendData',
  EXTRACT_JOB_DATA: '/extension/extractJobData'
};

// Full API URLs
export const API_URLS = {
  LOGIN: `${API_BASE_URL}${API_ENDPOINTS.LOGIN}`,
  CLIENT_LOGIN: `${API_BASE_URL}${API_ENDPOINTS.CLIENT_LOGIN}`,
  SAVE_TO_DASHBOARD: `${API_BASE_URL}${API_ENDPOINTS.SAVE_TO_DASHBOARD}`,
  SEND_DATA: `${API_BASE_URL}${API_ENDPOINTS.SEND_DATA}`,
  EXTRACT_JOB_DATA: `${API_BASE_URL}${API_ENDPOINTS.EXTRACT_JOB_DATA}`
};
