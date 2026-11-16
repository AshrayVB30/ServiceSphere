// Import React core library
import React from 'react';
// Import Navigate component to redirect unauthorized users to their permitted workspace
import { Navigate } from 'react-router-dom';
// Import useAuth hook to inspect current user role and administrative privilege
import { useAuth } from '../hooks/useAuth';
// Import user role constants and route definitions
import { USER_ROLES, ROUTES } from '../constants';

/**
 * Route guard that validates user role against allowed roles list.
 * Redirects unauthorized users to their designated role dashboard.
 * Enforces Role-Based Access Control (RBAC) across protected feature routes.
 */
// RoleRoute component accepting an array of permitted roles and children components to render
export function RoleRoute({ allowedRoles = [], children }) {
  // Extract role and isAdmin boolean flag from authentication context
  const { role, isAdmin } = useAuth();

  // Administrators and superusers possess universal platform access across all modules
  if (isAdmin) {
    // Render child route directly without further role evaluation
    return children;
  }

  // Check if current user's role is included in the permitted roles whitelist
  if (!allowedRoles.includes(role)) {
    // Redirect unauthorized user to their canonical role-specific home workspace
    switch (role) {
      // Support engineers redirect to agent triage dashboard
      case USER_ROLES.SUPPORT_AGENT:
        return <Navigate to={ROUTES.AGENT_DASHBOARD} replace />;
      // Client customers redirect to customer service portal
      case USER_ROLES.CLIENT:
        return <Navigate to={ROUTES.CLIENT_DASHBOARD} replace />;
      // Approver managers redirect to pending authorizations queue
      case USER_ROLES.APPROVER:
        return <Navigate to={ROUTES.APPROVER_DASHBOARD} replace />;
      // Fallback for unassigned or unrecognized roles: redirect to login
      default:
        return <Navigate to={ROUTES.LOGIN} replace />;
    }
  }

  // Render children when role matches permission whitelist
  return children;
}

// Export RoleRoute as default export
export default RoleRoute;
