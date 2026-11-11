import axios from 'axios';

/**
 * ServiceSphere Central Axios Client
 * Configured for Django REST Framework Session & Cookie-based Authentication.
 *
 * Capabilities:
 * 1. Base URL loaded dynamically from VITE_API_BASE_URL.
 * 2. Cross-origin credential transmission (`withCredentials: true`) to send/receive `sessionid` and `csrftoken`.
 * 3. Request Interceptor: Automatically extracts `csrftoken` from browser cookies and injects `X-CSRFToken` header.
 * 4. Response Interceptor: Standardizes DRF error structures and dispatches session expiration events.
 */

/**
 * Resolves the API Base URL:
 * 1. Defaults to '/api' so Vite dev proxy (or production reverse-proxy) handles requests as same-origin,
 *    ensuring browser cookie attachment and zero cross-site SameSite drops.
 * 2. If an absolute URL is configured (e.g. 'http://127.0.0.1:8000/api') while the browser is on 'localhost'
 *    (or vice versa), dynamically aligns the host to match window.location.hostname to prevent cross-site cookie rejection.
 */
function resolveApiBaseUrl() {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (!envUrl || envUrl.startsWith('/')) {
    return envUrl || '/api';
  }

  if (typeof window !== 'undefined' && window.location) {
    try {
      const parsed = new URL(envUrl, window.location.origin);
      const currentHost = window.location.hostname;
      if (
        (currentHost === 'localhost' && parsed.hostname === '127.0.0.1') ||
        (currentHost === '127.0.0.1' && parsed.hostname === 'localhost')
      ) {
        parsed.hostname = currentHost;
        return parsed.toString().replace(/\/$/, '');
      }
      return parsed.toString().replace(/\/$/, '');
    } catch {
      return envUrl;
    }
  }

  return envUrl;
}

const API_BASE_URL = resolveApiBaseUrl();

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

/**
 * Extracts a specific cookie value by name from document.cookie.
 *
 * @param {string} name - Name of the cookie (e.g. 'csrftoken').
 * @returns {string|null} Cookie value or null if not found.
 */
export function getCookie(name) {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}

/**
 * Normalizes complex DRF error responses (strings, arrays, field dictionaries) into a single user-friendly message.
 *
 * @param {object} error - Axios error object.
 * @returns {string} Human-readable error description.
 */
export function formatApiError(error) {
  if (!error.response) {
    if (error.code === 'ERR_NETWORK') {
      return `Unable to connect to the backend server at ${API_BASE_URL}. Please verify the Django service is active.`;
    }
    return error.message || 'An unexpected network error occurred.';
  }

  const data = error.response.data;
  if (!data) return `Request failed with status code ${error.response.status}`;

  if (typeof data === 'string') return data;
  if (data.detail) return data.detail;
  if (data.message) return data.message;

  // Handle field-level validation errors: {"field_name": ["error description"]}
  if (typeof data === 'object') {
    const errorMessages = [];
    for (const [key, val] of Object.entries(data)) {
      if (Array.isArray(val)) {
        errorMessages.push(`${key}: ${val.join(' ')}`);
      } else if (typeof val === 'string') {
        errorMessages.push(`${key}: ${val}`);
      }
    }
    if (errorMessages.length > 0) {
      return errorMessages.join(' | ');
    }
  }

  return 'The server encountered an error processing your request.';
}

// Request Interceptor: Attach CSRF Token on all state-mutating HTTP methods
apiClient.interceptors.request.use(
  (config) => {
    const csrfToken = getCookie('csrftoken');
    if (csrfToken && ['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase())) {
      config.headers['X-CSRFToken'] = csrfToken;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Catch 401 Unauthorized and normalize errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // If backend returns 401 Unauthorized, notify the application to clear session
    if (error.response?.status === 401) {
      window.dispatchEvent(new CustomEvent('servicesphere:unauthorized'));
    }
    // Enrich error with formatted message
    error.formattedMessage = formatApiError(error);
    return Promise.reject(error);
  }
);

export default apiClient;
