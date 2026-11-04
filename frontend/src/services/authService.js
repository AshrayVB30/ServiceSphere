import apiClient from './api';
import { ENDPOINTS } from './endpoints';
import { USER_ROLES } from '../constants';

/**
 * ServiceSphere Authentication Service
 * Communicates with Django session auth endpoints.
 * Includes a resilient mock fallback during frontend prototyping when backend is unreachable.
 */

// Realistic demo profiles for testing all 4 roles
export const MOCK_USERS = {
  'admin@servicesphere.io': {
    id: 1,
    username: 'alex_admin',
    email: 'admin@servicesphere.io',
    first_name: 'Alex',
    last_name: 'Vance',
    role: USER_ROLES.ADMIN,
    is_staff: true,
    is_superuser: true,
    client: null,
  },
  'agent@servicesphere.io': {
    id: 2,
    username: 'sarah_agent',
    email: 'agent@servicesphere.io',
    first_name: 'Sarah',
    last_name: 'Connor',
    role: USER_ROLES.SUPPORT_AGENT,
    is_staff: true,
    is_superuser: false,
    client: null,
  },
  'client@acmecorp.com': {
    id: 3,
    username: 'john_client',
    email: 'client@acmecorp.com',
    first_name: 'John',
    last_name: 'Doe',
    role: USER_ROLES.CLIENT,
    is_staff: false,
    is_superuser: false,
    client: {
      id: 1,
      name: 'Acme Global Corp',
      tier: 'ENTERPRISE',
    },
  },
  'approver@acmecorp.com': {
    id: 4,
    username: 'elena_approver',
    email: 'approver@acmecorp.com',
    first_name: 'Elena',
    last_name: 'Rostova',
    role: USER_ROLES.APPROVER,
    is_staff: false,
    is_superuser: false,
    client: {
      id: 1,
      name: 'Acme Global Corp',
    },
  },
};

const MOCK_STORAGE_KEY = 'servicesphere_mock_user';

export const authService = {
  /**
   * Fetches the CSRF cookie from the Django backend
   */
  async getCsrfToken() {
    try {
      await apiClient.get(ENDPOINTS.AUTH.CSRF);
    } catch {
      // Ignore network errors in offline/mock mode
    }
  },

  /**
   * Authenticates user against Django /api/auth/login/
   * Falls back to mock accounts if backend is offline and fallback is enabled.
   */
  async login({ email, password, username }) {
    const identifier = email || username;

    try {
      // 1. First ensure CSRF cookie is set
      await this.getCsrfToken();

      // 2. Attempt real backend call
      const response = await apiClient.post(ENDPOINTS.AUTH.LOGIN, {
        username: identifier,
        password,
      });

      localStorage.removeItem(MOCK_STORAGE_KEY);
      return { user: response.data.user || response.data, isMock: false };
    } catch (error) {
      // If backend network error or 404, check mock credentials if fallback enabled
      const isNetworkError = !error.response || error.code === 'ERR_NETWORK';
      const fallbackAllowed = import.meta.env.VITE_ENABLE_MOCK_FALLBACK !== 'false';

      if (isNetworkError && fallbackAllowed) {
        const mockUser = MOCK_USERS[identifier?.toLowerCase()];
        if (mockUser && password === 'Password123!') {
          localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(mockUser));
          return { user: mockUser, isMock: true };
        }
      }

      // Re-throw formatted backend error
      const message =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.response?.data?.non_field_errors?.[0] ||
        (isNetworkError
          ? 'Cannot connect to Django backend at ' + apiClient.defaults.baseURL + '. Verify backend server is running, or use demo credentials.'
          : 'Invalid credentials. Please verify your email and password.');

      throw new Error(message, { cause: error });
    }
  },

  /**
   * Verifies current session via /api/auth/me/
   */
  async getMe() {
    // Check if we are in an active mock session
    const storedMock = localStorage.getItem(MOCK_STORAGE_KEY);
    if (storedMock) {
      try {
        return { user: JSON.parse(storedMock), isMock: true };
      } catch {
        localStorage.removeItem(MOCK_STORAGE_KEY);
      }
    }

    const response = await apiClient.get(ENDPOINTS.AUTH.ME);
    return { user: response.data, isMock: false };
  },

  /**
   * Logs out user via /api/auth/logout/
   */
  async logout() {
    localStorage.removeItem(MOCK_STORAGE_KEY);
    try {
      await apiClient.post(ENDPOINTS.AUTH.LOGOUT);
    } catch {
      // Ignore errors on logout
    }
  },
};

export default authService;

