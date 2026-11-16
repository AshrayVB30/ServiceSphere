// Import React core library, Suspense for code-splitting fallbacks, and lazy for dynamic module imports
import React, { Suspense, lazy } from 'react';
// Import routing primitives from React Router DOM v7
import { Routes, Route, Navigate } from 'react-router-dom';
// Import useAuth hook to inspect current session identity and role
import { useAuth } from '../hooks/useAuth';
// Import role and route constants to keep navigation paths centralized
import { USER_ROLES, ROUTES } from '../constants';

// Layout & Core Route Guards
// Import primary application shell layout containing responsive sidebar and header
import { AppLayout } from '../components/layout/AppLayout';
// Import authentication guard ensuring only logged-in users enter workspace routes
import { ProtectedRoute } from './ProtectedRoute';
// Import role-based access control guard restricting routes to specific user tiers
import { RoleRoute } from './RoleRoute';
// Import skeleton placeholder component for smooth loading states
import { Skeleton } from '../components/common/Skeleton';

// Public Authentication Pages (Eagerly loaded for instant first-paint performance)
// Import sign-in login page
import { LoginPage } from '../features/auth/LoginPage';
// Import account registration page
import { RegisterPage } from '../features/auth/RegisterPage';
// Import forgot password recovery page
import { ForgotPasswordPage } from '../features/auth/ForgotPasswordPage';
// Import reset password token confirmation page
import { ResetPasswordPage } from '../features/auth/ResetPasswordPage';

// Lazy Loaded Dashboards & Feature Pages (Code-split into separate JS chunks for rapid initial load)
// Lazy loaded executive admin dashboard
const AdminDashboard = lazy(() => import('../features/dashboard/AdminDashboard'));
// Lazy loaded support engineer workload dashboard
const AgentDashboard = lazy(() => import('../features/dashboard/AgentDashboard'));
// Lazy loaded client customer support portal
const ClientDashboard = lazy(() => import('../features/dashboard/ClientDashboard'));
// Lazy loaded manager approval dashboard
const ApproverDashboard = lazy(() => import('../features/dashboard/ApproverDashboard'));
// Lazy loaded helpdesk tickets list and queue
const TicketListPage = lazy(() => import('../features/tickets/TicketListPage'));
// Lazy loaded ticket detail and communication workspace
const TicketDetailPage = lazy(() => import('../features/tickets/TicketDetailPage'));
// Lazy loaded operational approvals list view
const ApprovalListPage = lazy(() => import('../features/approvals/ApprovalListPage'));
// Lazy loaded client organizations directory
const ClientListPage = lazy(() => import('../features/clients/ClientListPage'));
// Lazy loaded user directory and staff management
const UserListPage = lazy(() => import('../features/users/UserListPage'));
// Lazy loaded SLA policy monitoring and compliance dashboard
const SLADashboardPage = lazy(() => import('../features/sla/SLADashboardPage'));
// Lazy loaded knowledge base and technical runbooks directory
const KBHomePage = lazy(() => import('../features/knowledge-base/KBHomePage'));
// Lazy loaded knowledge base article detail reader
const KBArticleDetailPage = lazy(() => import('../features/knowledge-base/KBArticleDetailPage'));
// Lazy loaded executive analytics and KPI reports
const AnalyticsDashboardPage = lazy(() => import('../features/analytics/AnalyticsDashboardPage'));
// Lazy loaded system preferences and account settings
const SettingsPage = lazy(() => import('../features/settings/SettingsPage'));
// Lazy loaded in-app notification center and preferences
const NotificationCenterPage = lazy(() => import('../features/notifications/NotificationCenterPage'));

// Suspense fallback skeleton shown during async module download
function SuspenseFallback() {
  // Skeleton container matching dashboard grid layout
  return (
    // Outer animated pulse container
    <div className="space-y-6 animate-pulse p-4">
      {/* Top action header placeholders */}
      <div className="flex items-center justify-between">
        {/* Title placeholder */}
        <Skeleton className="h-8 w-64 rounded-xl" />
        {/* Action button placeholder */}
        <Skeleton className="h-8 w-32 rounded-xl" />
      </div>
      {/* Four stat card placeholders */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4.5">
        {/* Generate array of 4 skeleton cards */}
        {Array.from({ length: 4 }).map((_, i) => (
          // Stat card skeleton
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      {/* Large table or chart skeleton placeholder */}
      <Skeleton className="h-72 rounded-2xl" />
    </div>
  );
}

/**
 * Dynamic Root Redirector: Sends user to their canonical home view based on their role
 */
function DashboardRedirect() {
  // Extract role and isAdmin flag from auth context
  const { role, isAdmin } = useAuth();

  // Superuser or Administrator redirected to admin operations dashboard
  if (isAdmin) {
    // Navigate with history replacement
    return <Navigate to={ROUTES.ADMIN_DASHBOARD} replace />;
  }

  // Evaluate user role to redirect to appropriate dashboard
  switch (role) {
    // Support agents go to agent workload dashboard
    case USER_ROLES.SUPPORT_AGENT:
      return <Navigate to={ROUTES.AGENT_DASHBOARD} replace />;
    // Client users go to customer portal dashboard
    case USER_ROLES.CLIENT:
      return <Navigate to={ROUTES.CLIENT_DASHBOARD} replace />;
    // Approvers go to manager approvals dashboard
    case USER_ROLES.APPROVER:
      return <Navigate to={ROUTES.APPROVER_DASHBOARD} replace />;
    // Unauthenticated or unknown role redirected to login
    default:
      return <Navigate to={ROUTES.LOGIN} replace />;
  }
}

// Master Application Routing Tree
export function AppRoutes() {
  // Render routing tree wrapped in Suspense for lazy loaded modules
  return (
    // Suspense boundary with custom skeleton fallback
    <Suspense fallback={<SuspenseFallback />}>
      {/* Route matcher container */}
      <Routes>
        {/* Public Authentication Routes */}
        {/* Login route */}
        <Route path={ROUTES.LOGIN} element={<LoginPage />} />
        {/* Registration route */}
        <Route path={ROUTES.REGISTER} element={<RegisterPage />} />
        {/* Forgot password email request route */}
        <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPasswordPage />} />
        {/* Reset password token confirmation route */}
        <Route path="/reset-password/:uid/:token" element={<ResetPasswordPage />} />

        {/* Authenticated Workspace Shell */}
        <Route
          // Root base path
          path="/"
          // Wrapped in ProtectedRoute guard and AppLayout shell
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          {/* Dynamic Root Dashboard Dispatcher */}
          <Route index element={<DashboardRedirect />} />

          {/* Role-Specific Dashboards */}
          {/* Admin dashboard restricted to ADMIN role */}
          <Route
            path="dashboard/admin"
            element={
              <RoleRoute allowedRoles={[USER_ROLES.ADMIN]}>
                <AdminDashboard />
              </RoleRoute>
            }
          />
          {/* Agent dashboard accessible to ADMIN and SUPPORT_AGENT */}
          <Route
            path="dashboard/agent"
            element={
              <RoleRoute allowedRoles={[USER_ROLES.ADMIN, USER_ROLES.SUPPORT_AGENT]}>
                <AgentDashboard />
              </RoleRoute>
            }
          />
          {/* Client dashboard accessible to ADMIN and CLIENT */}
          <Route
            path="dashboard/client"
            element={
              <RoleRoute allowedRoles={[USER_ROLES.ADMIN, USER_ROLES.CLIENT]}>
                <ClientDashboard />
              </RoleRoute>
            }
          />
          {/* Approver dashboard accessible to ADMIN and APPROVER */}
          <Route
            path="dashboard/approver"
            element={
              <RoleRoute allowedRoles={[USER_ROLES.ADMIN, USER_ROLES.APPROVER]}>
                <ApproverDashboard />
              </RoleRoute>
            }
          />

          {/* Feature Modules */}
          {/* Ticket queue accessible to all authenticated users */}
          <Route path="tickets" element={<TicketListPage />} />
          {/* Explicit redirect for /tickets/new to avoid route collisions */}
          <Route path="tickets/new" element={<Navigate to="/tickets" replace />} />
          {/* Ticket detail workspace by ID */}
          <Route path="tickets/:id" element={<TicketDetailPage />} />

          {/* Approvals workspace restricted to ADMIN, APPROVER, and SUPPORT_AGENT */}
          <Route
            path="approvals"
            element={
              <RoleRoute allowedRoles={[USER_ROLES.ADMIN, USER_ROLES.APPROVER, USER_ROLES.SUPPORT_AGENT]}>
                <ApprovalListPage />
              </RoleRoute>
            }
          />

          {/* Client organizations management restricted to ADMIN */}
          <Route
            path="clients"
            element={
              <RoleRoute allowedRoles={[USER_ROLES.ADMIN]}>
                <ClientListPage />
              </RoleRoute>
            }
          />

          {/* User directory and staff management restricted to ADMIN */}
          <Route
            path="users"
            element={
              <RoleRoute allowedRoles={[USER_ROLES.ADMIN]}>
                <UserListPage />
              </RoleRoute>
            }
          />

          {/* SLA tracking and escalations accessible to ADMIN and SUPPORT_AGENT */}
          <Route
            path="sla"
            element={
              <RoleRoute allowedRoles={[USER_ROLES.ADMIN, USER_ROLES.SUPPORT_AGENT]}>
                <SLADashboardPage />
              </RoleRoute>
            }
          />

          {/* Knowledge base homepage accessible to all authenticated users */}
          <Route path="knowledge-base" element={<KBHomePage />} />
          {/* Knowledge base article detail reader */}
          <Route path="knowledge-base/articles/:id" element={<KBArticleDetailPage />} />

          {/* Analytics, KRAs, and KPIs restricted to ADMIN and SUPPORT_AGENT */}
          <Route
            path="analytics"
            element={
              <RoleRoute allowedRoles={[USER_ROLES.ADMIN, USER_ROLES.SUPPORT_AGENT]}>
                <AnalyticsDashboardPage />
              </RoleRoute>
            }
          />

          {/* System settings restricted to ADMIN */}
          <Route
            path="settings"
            element={
              <RoleRoute allowedRoles={[USER_ROLES.ADMIN]}>
                <SettingsPage />
              </RoleRoute>
            }
          />

          {/* Notification center accessible to all authenticated users */}
          <Route path="notifications" element={<NotificationCenterPage />} />
        </Route>

        {/* Fallback 404 Route redirecting to root */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

// Export AppRoutes as default export
export default AppRoutes;
