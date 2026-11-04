import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import authService from '../services/authService';
import { USER_ROLES } from '../constants';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMockSession, setIsMockSession] = useState(false);

  // Checks initial session on application mount
  const checkAuth = useCallback(async () => {
    setIsLoading(true);
    try {
      const { user: currentUser, isMock } = await authService.getMe();
      setUser(currentUser);
      setIsMockSession(isMock);
    } catch {
      setUser(null);
      setIsMockSession(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();

    // Listen for global 401 unauthorized events
    function handleUnauthorized() {
      setUser(null);
      setIsMockSession(false);
    }
    window.addEventListener('servicesphere:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('servicesphere:unauthorized', handleUnauthorized);
    };
  }, [checkAuth]);

  const login = async (credentials) => {
    setIsLoading(true);
    try {
      const { user: loggedInUser, isMock } = await authService.login(credentials);
      setUser(loggedInUser);
      setIsMockSession(isMock);
      return loggedInUser;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authService.logout();
    } finally {
      setUser(null);
      setIsMockSession(false);
      setIsLoading(false);
    }
  };

  const value = {
    user,
    role: user?.role || null,
    isAuthenticated: !!user,
    isLoading,
    isMockSession,
    isAdmin: user?.role === USER_ROLES.ADMIN || user?.is_superuser,
    isAgent: user?.role === USER_ROLES.SUPPORT_AGENT,
    isClient: user?.role === USER_ROLES.CLIENT,
    isApprover: user?.role === USER_ROLES.APPROVER,
    login,
    logout,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;

