// Import axios HTTP library for asynchronous API communication
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
  // Read base URL from Vite environment variables (defined in .env or docker-compose)
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  // If no environment variable is provided or it is a relative path starting with '/', return it directly
  if (!envUrl || envUrl.startsWith('/')) {
    // Return configured relative path or default to standard '/api' proxy prefix
    return envUrl || '/api';
  }

  // Check if code is running in a browser environment with window.location available
  if (typeof window !== 'undefined' && window.location) {
    try {
      // Parse the configured environment URL relative to current window origin
      const parsed = new URL(envUrl, window.location.origin);
      // Get the hostname currently running in the user's browser address bar
      const currentHost = window.location.hostname;
      // Reconcile localhost vs 127.0.0.1 discrepancies to prevent cross-origin cookie rejection
      if (
        (currentHost === 'localhost' && parsed.hostname === '127.0.0.1') ||
        (currentHost === '127.0.0.1' && parsed.hostname === 'localhost')
      ) {
        // Harmonize parsed hostname with browser hostname
        parsed.hostname = currentHost;
        // Return normalized string with trailing slash stripped
        return parsed.toString().replace(/\/$/, '');
      }
      // Return normalized URL string with trailing slash stripped
      return parsed.toString().replace(/\/$/, '');
    } catch {
      // Fall back to original environment URL if URL parsing fails
      return envUrl;
    }
  }

  // Fallback return for non-browser environments
  return envUrl;
}

// Compute resolved API Base URL
const API_BASE_URL = resolveApiBaseUrl();

// Instantiate configured Axios client instance
export const apiClient = axios.create({
  // Root URL prefix prepended to all relative request endpoints
  baseURL: API_BASE_URL,
  // Send cookies with every cross-origin request (required for Django sessionid and csrftoken)
  withCredentials: true,
  // Default HTTP request headers
  headers: {
    // Instruct server to interpret payload as JSON
    'Content-Type': 'application/json',
    // Request server to respond in JSON format
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
  // Return null if running outside browser DOM context
  if (typeof document === 'undefined') return null;
  // Prefix document.cookie string with semicolon for uniform splitting
  const value = `; ${document.cookie}`;
  // Split cookie string by target cookie name delimiter
  const parts = value.split(`; ${name}=`);
  // If target cookie was found, extract and return its trimmed string value
  if (parts.length === 2) return parts.pop().split(';').shift();
  // Return null if cookie name was not present
  return null;
}

/**
 * Normalizes complex DRF error responses (strings, arrays, field dictionaries) into a single user-friendly message.
 *
 * @param {object} error - Axios error object.
 * @returns {string} Human-readable error description.
 */
export function formatApiError(error) {
  // Handle network failure where backend server did not return an HTTP response
  if (!error.response) {
    // Specific error message for network disconnections
    if (error.code === 'ERR_NETWORK') {
      return `Unable to connect to the backend server at ${API_BASE_URL}. Please verify the Django service is active.`;
    }
    // Return standard error message or generic fallback
    return error.message || 'An unexpected network error occurred.';
  }

  // Extract response body data from error
  const data = error.response.data;
  // If data is empty, return status code description
  if (!data) return `Request failed with status code ${error.response.status}`;

  // If backend returned raw string message, return it directly
  if (typeof data === 'string') return data;
  // Handle DRF standard detail field (e.g. { "detail": "Authentication credentials were not provided." })
  if (data.detail) return data.detail;
  // Handle custom message field
  if (data.message) return data.message;

  // Handle field-level validation errors: {"field_name": ["error description"]}
  if (typeof data === 'object') {
    // Array to aggregate all individual field errors
    const errorMessages = [];
    // Iterate over each field error key-value pair
    for (const [key, val] of Object.entries(data)) {
      // If error value is an array of strings, join with space
      if (Array.isArray(val)) {
        errorMessages.push(`${key}: ${val.join(' ')}`);
      // If error value is a string, record directly
      } else if (typeof val === 'string') {
        errorMessages.push(`${key}: ${val}`);
      }
    }
    // If field errors were collected, join them with a readable pipe separator
    if (errorMessages.length > 0) {
      return errorMessages.join(' | ');
    }
  }

  // Generic fallback message
  return 'The server encountered an error processing your request.';
}

// Request Interceptor: Attach CSRF Token on all state-mutating HTTP methods
apiClient.interceptors.request.use(
  // Interceptor success handler
  (config) => {
    // Extract current csrftoken cookie value
    const csrfToken = getCookie('csrftoken');
    // If token exists and method mutates state (POST, PUT, PATCH, DELETE), attach X-CSRFToken header
    if (csrfToken && ['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase())) {
      // Assign Django CSRF header
      config.headers['X-CSRFToken'] = csrfToken;
    }
    // Return modified configuration
    return config;
  },
  // Request error handler rejects promise
  (error) => Promise.reject(error)
);

// Response Interceptor: Catch 401 Unauthorized and normalize errors
apiClient.interceptors.response.use(
  // On successful response, pass through unchanged
  (response) => response,
  // On error response, handle session expiry and formatting
  (error) => {
    // If backend returns 401 Unauthorized, notify the application to clear session
    if (error.response?.status === 401) {
      // Dispatch custom browser event to clear auth state without page reload
      window.dispatchEvent(new CustomEvent('servicesphere:unauthorized'));
    }
    // Enrich error with formatted user-friendly message
    error.formattedMessage = formatApiError(error);
    // Reject promise with enriched error
    return Promise.reject(error);
  }
);

// Export apiClient as default export
export default apiClient;
