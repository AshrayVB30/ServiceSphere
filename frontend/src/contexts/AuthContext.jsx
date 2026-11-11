import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import authService from '../services/authService';
import { USER_ROLES } from '../constants';

/**
 * Authentication Context for ServiceSphere
 * Manages user identity, RBAC authorization flags, and session hydration.
 */
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Verifies active Django session on initial application mount
  const checkAuth = useCallback(async () => {
    setIsLoading(true);
    try {
      const currentUser = await authService.getMe();
      setUser(currentUser);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();

    // Listen for global 401 Unauthorized events emitted by apiClient response interceptor
    function handleUnauthorized() {
      setUser(null);
    }
    window.addEventListener('servicesphere:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('servicesphere:unauthorized', handleUnauthorized);
    };
  }, [checkAuth]);

  /**
   * Logs user in via Django REST session endpoint.
   *
   * @param {object} credentials - User credentials.
   * @returns {Promise<object>} Logged in user profile.
   */
  const login = async (credentials) => {
    setIsLoading(true);
    try {
      const loggedInUser = await authService.login(credentials);
      setUser(loggedInUser);
      return loggedInUser;
    } finally {
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
    setIsLoading(true);
    try {
      const registeredUser = await authService.register(userData);
      setUser(registeredUser);
      return registeredUser;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Logs user out on server and clears local context state.
   */
  const logout = async () => {
    setIsLoading(true);
    try {
      await authService.logout();
    } finally {
      setUser(null);
      setIsLoading(false);
    }
  };

  const value = {
    user,
    role: user?.role || null,
    isAuthenticated: !!user,
    isLoading,
    isMockSession: false,
    isAdmin: user?.role === USER_ROLES.ADMIN || !!user?.is_superuser,
    isAgent: user?.role === USER_ROLES.SUPPORT_AGENT,
    isClient: user?.role === USER_ROLES.CLIENT,
    isApprover: user?.role === USER_ROLES.APPROVER,
    login,
    register,
    logout,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to consume the ServiceSphere Authentication context.
 *
 * @returns {object} AuthContext state and helper methods.
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
