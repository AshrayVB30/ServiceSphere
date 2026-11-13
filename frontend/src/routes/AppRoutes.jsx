import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { USER_ROLES, ROUTES } from '../constants';

// Layout & Core Guards
import { AppLayout } from '../components/layout/AppLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { RoleRoute } from './RoleRoute';
import { Skeleton } from '../components/common/Skeleton';

// Auth Pages (Eagerly loaded for fast first-paint)
import { LoginPage } from '../features/auth/LoginPage';
import { RegisterPage } from '../features/auth/RegisterPage';
import { ForgotPasswordPage } from '../features/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '../features/auth/ResetPasswordPage';

// Lazy Loaded Dashboards & Feature Pages (Code-split)
const AdminDashboard = lazy(() => import('../features/dashboard/AdminDashboard'));
const AgentDashboard = lazy(() => import('../features/dashboard/AgentDashboard'));
const ClientDashboard = lazy(() => import('../features/dashboard/ClientDashboard'));
const ApproverDashboard = lazy(() => import('../features/dashboard/ApproverDashboard'));
const TicketListPage = lazy(() => import('../features/tickets/TicketListPage'));
const TicketDetailPage = lazy(() => import('../features/tickets/TicketDetailPage'));
const ApprovalListPage = lazy(() => import('../features/approvals/ApprovalListPage'));
const ClientListPage = lazy(() => import('../features/clients/ClientListPage'));
const UserListPage = lazy(() => import('../features/users/UserListPage'));
const SLADashboardPage = lazy(() => import('../features/sla/SLADashboardPage'));
const KBHomePage = lazy(() => import('../features/knowledge-base/KBHomePage'));
const KBArticleDetailPage = lazy(() => import('../features/knowledge-base/KBArticleDetailPage'));
const AnalyticsDashboardPage = lazy(() => import('../features/analytics/AnalyticsDashboardPage'));
const SettingsPage = lazy(() => import('../features/settings/SettingsPage'));
const NotificationCenterPage = lazy(() => import('../features/notifications/NotificationCenterPage'));

function SuspenseFallback() {
  return (
    <div className="space-y-6 animate-pulse p-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-64 rounded-xl" />
        <Skeleton className="h-8 w-32 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-2xl" />
    </div>
  );
}

/**
 * Dynamic Root Redirector: Sends user to their canonical home view based on their role
 */
function DashboardRedirect() {
  const { role, isAdmin } = useAuth();

  if (isAdmin) {
    return <Navigate to={ROUTES.ADMIN_DASHBOARD} replace />;
  }

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

export function AppRoutes() {
  return (
    <Suspense fallback={<SuspenseFallback />}>
      <Routes>
        {/* Public Authentication Routes */}
        <Route path={ROUTES.LOGIN} element={<LoginPage />} />
        <Route path={ROUTES.REGISTER} element={<RegisterPage />} />
        <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPasswordPage />} />
        <Route path="/reset-password/:uid/:token" element={<ResetPasswordPage />} />

        {/* Authenticated Workspace Shell */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          {/* Dynamic Root Dashboard Dispatcher */}
          <Route index element={<DashboardRedirect />} />

          {/* Role-Specific Dashboards */}
          <Route
            path="dashboard/admin"
            element={
              <RoleRoute allowedRoles={[USER_ROLES.ADMIN]}>
                <AdminDashboard />
              </RoleRoute>
            }
          />
          <Route
            path="dashboard/agent"
            element={
              <RoleRoute allowedRoles={[USER_ROLES.ADMIN, USER_ROLES.SUPPORT_AGENT]}>
                <AgentDashboard />
              </RoleRoute>
            }
          />
          <Route
            path="dashboard/client"
            element={
              <RoleRoute allowedRoles={[USER_ROLES.ADMIN, USER_ROLES.CLIENT]}>
                <ClientDashboard />
              </RoleRoute>
            }
          />
          <Route
            path="dashboard/approver"
            element={
              <RoleRoute allowedRoles={[USER_ROLES.ADMIN, USER_ROLES.APPROVER]}>
                <ApproverDashboard />
              </RoleRoute>
            }
          />

          {/* Feature Modules */}
          <Route path="tickets" element={<TicketListPage />} />
          <Route path="tickets/new" element={<Navigate to="/tickets" replace />} />
          <Route path="tickets/:id" element={<TicketDetailPage />} />

          <Route
            path="approvals"
            element={
              <RoleRoute allowedRoles={[USER_ROLES.ADMIN, USER_ROLES.APPROVER, USER_ROLES.SUPPORT_AGENT]}>
                <ApprovalListPage />
              </RoleRoute>
            }
          />

          <Route
            path="clients"
            element={
              <RoleRoute allowedRoles={[USER_ROLES.ADMIN]}>
                <ClientListPage />
              </RoleRoute>
            }
          />

          <Route
            path="users"
            element={
              <RoleRoute allowedRoles={[USER_ROLES.ADMIN]}>
                <UserListPage />
              </RoleRoute>
            }
          />

          <Route
            path="sla"
            element={
              <RoleRoute allowedRoles={[USER_ROLES.ADMIN, USER_ROLES.SUPPORT_AGENT]}>
                <SLADashboardPage />
              </RoleRoute>
            }
          />

          <Route path="knowledge-base" element={<KBHomePage />} />
          <Route path="knowledge-base/articles/:id" element={<KBArticleDetailPage />} />

          <Route
            path="analytics"
            element={
              <RoleRoute allowedRoles={[USER_ROLES.ADMIN, USER_ROLES.SUPPORT_AGENT]}>
                <AnalyticsDashboardPage />
              </RoleRoute>
            }
          />

          <Route
            path="settings"
            element={
              <RoleRoute allowedRoles={[USER_ROLES.ADMIN]}>
                <SettingsPage />
              </RoleRoute>
            }
          />

          <Route path="notifications" element={<NotificationCenterPage />} />
        </Route>

        {/* Fallback 404 Route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default AppRoutes;
