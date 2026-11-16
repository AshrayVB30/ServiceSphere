// Import React core library
import React from 'react';
// Import Navigate for route redirection and useLocation to preserve attempted destination URL
import { Navigate, useLocation } from 'react-router-dom';
// Import custom useAuth hook to inspect active session authentication status
import { useAuth } from '../hooks/useAuth';
// Import application route constants for redirection paths
import { ROUTES } from '../constants';
// Import skeleton placeholder component for loading state visualization
import { Skeleton } from '../components/common/Skeleton';

/**
 * Route guard that requires an active authenticated session.
 * Protects internal application routes from unauthorized guest access.
 */
// Component wrapper for protected routes
export function ProtectedRoute({ children }) {
  // Extract authentication status and session hydration loading flag from AuthContext
  const { isAuthenticated, isLoading } = useAuth();
  // Get current browser location object to store in redirect state
  const location = useLocation();

  // Show enterprise loading screen while session verification request is in flight
  if (isLoading) {
    // Centered loading splash screen
    return (
      // Fullscreen wrapper with application background color
      <div className="flex h-screen w-screen items-center justify-center bg-[#F5F6F8]">
        {/* Centered column container */}
        <div className="flex flex-col items-center space-y-4">
          {/* Animated ServiceSphere brand logo badge */}
          <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-xs animate-pulse">
            SS
          </div>
          {/* Placeholder skeleton bar representing loading message */}
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    );
  }

  // If user is unauthenticated, redirect to login page while preserving intended destination in state
  if (!isAuthenticated) {
    // Navigate component redirecting to login with replace history
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  // Render protected child routes when user session is active and valid
  return children;
}

// Export ProtectedRoute as default export
export default ProtectedRoute;
