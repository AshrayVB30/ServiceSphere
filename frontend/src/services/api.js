import axios from 'axios';

/**
 * ServiceSphere Central Axios Client
 * Configured for Django REST Framework Session & Cookie-based Authentication.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Crucial for Django sessionid and csrftoken cookies
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

/**
 * Extracts a specific cookie value by name from document.cookie
 */
function getCookie(name) {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}

// Request interceptor: Inject Django CSRF token into headers for mutating requests
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

// Response interceptor: Standardize errors and detect session expiry
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // If backend returns 401 and we are not already on the login page
    if (error.response?.status === 401) {
      // Dispatched for React Auth context to observe
      window.dispatchEvent(new CustomEvent('servicesphere:unauthorized'));
    }
    return Promise.reject(error);
  }
);

export default apiClient;

