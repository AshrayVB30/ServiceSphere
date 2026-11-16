// Import React core hooks and context primitives for state management and lifecycle control
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
// Import authentication service to execute HTTP session requests (login, logout, register, me)
import authService from '../services/authService';
// Import user role constants to derive role-checking boolean flags (isAdmin, isAgent, etc.)
import { USER_ROLES } from '../constants';

/**
 * Authentication Context for ServiceSphere
 * Manages user identity, RBAC authorization flags, and session hydration.
 * Provides global authentication state to all components in the React component tree.
 */
// Create React Context object initialized with null before provider is mounted
const AuthContext = createContext(null);

// Main context provider component that encapsulates application authentication state
export function AuthProvider({ children }) {
  // Current authenticated user object containing profile details, role, and permissions
  const [user, setUser] = useState(null);
  // Loading flag indicating whether initial session check or auth mutation is in progress
  const [isLoading, setIsLoading] = useState(true);

  // Verifies active Django session on initial application mount using useCallback to memoize reference
  const checkAuth = useCallback(async () => {
    // Set loading indicator to true while verifying HTTP session with server
    setIsLoading(true);
    try {
      // Fetch authenticated user profile from GET /api/auth/me/ endpoint
      const currentUser = await authService.getMe();
      // Store user record in context state upon successful response
      setUser(currentUser);
    } catch {
      // Clear user record if session cookie is invalid, expired, or absent
      setUser(null);
    } finally {
      // Mark session verification complete regardless of success or error
      setIsLoading(false);
    }
  }, []);

  // Effect hook to run session verification on initial application mount
  useEffect(() => {
    // Execute session check immediately when component mounts
    checkAuth();

    // Event handler for global 401 Unauthorized events emitted by the Axios response interceptor
    function handleUnauthorized() {
      // Reset authenticated user state to null when server responds with 401
      setUser(null);
    }
    // Attach listener to window object for inter-service session invalidation
    window.addEventListener('servicesphere:unauthorized', handleUnauthorized);
    // Cleanup callback executed on component unmount
    return () => {
      // Detach event listener to prevent memory leaks
      window.removeEventListener('servicesphere:unauthorized', handleUnauthorized);
    };
  }, [checkAuth]);

  /**
   * Logs user in via Django REST session endpoint.
   *
   * @param {object} credentials - User credentials (email/username, password).
   * @returns {Promise<object>} Logged in user profile.
   */
  const login = async (credentials) => {
    // Set loading state to true during login network request
    setIsLoading(true);
    try {
      // Dispatch login request to backend auth service
      const loggedInUser = await authService.login(credentials);
      // Update context user state with returned authenticated profile
      setUser(loggedInUser);
      // Return user profile to caller for immediate routing decisions
      return loggedInUser;
    } finally {
      // Ensure loading flag is reset once login transaction concludes
      setIsLoading(false);
    }
  };

  /**
   * Registers a new account via Django REST session endpoint.
   *
   * @param {object} userData - User registration payload.
   * @returns {Promise<object>} Registered user profile.
   */
  const register = async (userData) => {
    // Indicate active network operation to disable submit buttons and show spinners
    setIsLoading(true);
    try {
      // Dispatch registration payload to backend
      const registeredUser = await authService.register(userData);
      // Store new authenticated user profile in context state
      setUser(registeredUser);
      // Return registered user object
      return registeredUser;
    } finally {
      // Turn off loading indicator after registration finishes
      setIsLoading(false);
    }
  };

  /**
   * Logs user out on server and clears local context state.
   */
  const logout = async () => {
    // Set loading state while session termination request is in flight
    setIsLoading(true);
    try {
      // Call backend logout endpoint to destroy sessionid on server
      await authService.logout();
    } finally {
      // Clear authenticated user state in memory
      setUser(null);
      // Reset loading flag
      setIsLoading(false);
    }
  };

  // Memoized value object containing auth state and action handlers exposed to consumers
  const value = {
    // Raw user profile object
    user,
    // Current user's role string or null if unauthenticated
    role: user?.role || null,
    // Boolean helper flag checking if user profile is present
    isAuthenticated: !!user,
    // Boolean indicator for ongoing authentication operations
    isLoading,
    // Legacy flag for mock session detection (always false for real Django backend)
    isMockSession: false,
    // Boolean helper: true if user is ADMIN or superuser
    isAdmin: user?.role === USER_ROLES.ADMIN || !!user?.is_superuser,
    // Boolean helper: true if user is a support engineer
    isAgent: user?.role === USER_ROLES.SUPPORT_AGENT,
    // Boolean helper: true if user is an external client
    isClient: user?.role === USER_ROLES.CLIENT,
    // Boolean helper: true if user is an approver or manager
    isApprover: user?.role === USER_ROLES.APPROVER,
    // Action handler to perform user login
    login,
    // Action handler to perform user registration
    register,
    // Action handler to perform user logout
    logout,
    // Action handler to manually re-verify session
    checkAuth,
  };

  // Provide authentication context value to wrapped child component tree
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to consume the ServiceSphere Authentication context.
 *
 * @returns {object} AuthContext state and helper methods.
 */
export function useAuth() {
  // Read current context value from nearest AuthProvider ancestor
  const context = useContext(AuthContext);
  // Throw error if hook is used outside of an AuthProvider hierarchy
  if (!context) {
    // Descriptive error message to guide developers
    throw new Error('useAuth must be used within an AuthProvider');
  }
  // Return auth context object
  return context;
}

// Export AuthContext as default export
export default AuthContext;
