import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { USER_ROLES, ROUTES } from '../constants';

/**
 * Route guard that validates user role against allowed roles list.
 * Redirects unauthorized users to their designated role dashboard.
 */
export function RoleRoute({ allowedRoles = [], children }) {
  const { role, isAdmin } = useAuth();

  // Administrators have universal access
  if (isAdmin) {
    return children;
  }

  if (!allowedRoles.includes(role)) {
    // Redirect to user's canonical home view based on their role
    switch (role) {
      case USER_ROLES.SUPPORT_AGENT:
        return <Navigate to={ROUTES.AGENT_DASHBOARD} replace />;
      case USER_ROLES.CLIENT:
        return <Navigate to={ROUTES.CLIENT_DASHBOARD} replace />;
      case USER_ROLES.APPROVER:
        return <Navigate to={ROUTES.APPROVER_DASHBOARD} replace />;
      default:
        return <Navigate to={ROUTES.LOGIN} replace />;
    }
  }

  return children;
}

export default RoleRoute;

