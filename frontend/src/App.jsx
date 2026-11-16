// Import React — required in scope for JSX transformation and component lifecycle support
import React from 'react';
// Import BrowserRouter from react-router-dom — provides HTML5 history-based client-side routing for the app
import { BrowserRouter } from 'react-router-dom';
// Import AuthProvider — wraps the app with authentication context, making auth state available globally
import { AuthProvider } from './contexts/AuthContext';
// Import ToastProvider — wraps the app with toast notification context, enabling global toast messages
import { ToastProvider } from './contexts/ToastContext';
// Import AppRoutes — the central route configuration component that maps URLs to page components
import { AppRoutes } from './routes/AppRoutes';

/**
 * ServiceSphere Root Application Component
 * Sets up BrowserRouter, Global Toast Notifications, and Authentication Provider.
 *
 * Provider nesting order is intentional:
 * - BrowserRouter is outermost so routing context is available to all children
 * - ToastProvider is inside BrowserRouter so toasts can be triggered from route-aware components
 * - AuthProvider is inside ToastProvider so auth actions (e.g. login errors) can fire toasts
 * - AppRoutes is the innermost consumer, using all three contexts to render the correct page
 */
export default function App() {
  return (
    // BrowserRouter — enables client-side navigation without full page reloads using the History API
    <BrowserRouter>
      {/* ToastProvider — makes the toast notification system available to any component in the tree */}
      <ToastProvider>
        {/* AuthProvider — manages and exposes authentication state (user, token, login/logout) app-wide */}
        <AuthProvider>
          {/* AppRoutes — renders the matched route's page component based on the current URL */}
          <AppRoutes />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
