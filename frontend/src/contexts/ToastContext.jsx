// Import React and hooks for context, state, and memoized callbacks
import React, { createContext, useContext, useState, useCallback } from 'react';
// Import Lucide icons representing success, error, warning, informational states, and close button
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
// Import class name merge utility for dynamic toast styling
import { cn } from '../utils/cn';

// Create ToastContext initialized with null before provider is mounted
const ToastContext = createContext(null);

// Global Toast Provider Component that manages floating user notification toasts
export function ToastProvider({ children }) {
  // State storing active toast notification queue
  const [toasts, setToasts] = useState([]);

  // Removes a specific toast notification by its unique identifier
  const removeToast = useCallback((id) => {
    // Filter out the toast with matching id from the active list
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Adds a new toast notification with title, message, type, and auto-dismiss duration
  const addToast = useCallback(
    ({ title, message, type = 'info', duration = 4000 }) => {
      // Generate a unique identifier using timestamp and pseudo-random alphanumeric string
      const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
      // Construct toast data structure
      const newToast = { id, title, message, type };

      // Append new toast to active notifications array
      setToasts((prev) => [...prev, newToast]);

      // If duration is greater than 0, schedule automatic dismissal timer
      if (duration > 0) {
        // Set timeout to automatically trigger toast removal
        setTimeout(() => {
          // Remove toast by id when timer expires
          removeToast(id);
        }, duration);
      }
      // Return generated toast ID
      return id;
    },
    // Dependency array for useCallback
    [removeToast]
  );

  // Helper object exposing shorthand methods for each semantic notification tier
  const toast = {
    // Dispatches a success toast (green accent, checkmark icon)
    success: (title, message, duration) =>
      addToast({ title, message, type: 'success', duration }),
    // Dispatches an error toast (red accent, alert icon)
    error: (title, message, duration) =>
      addToast({ title, message, type: 'error', duration }),
    // Dispatches a warning toast (amber accent, triangle icon)
    warning: (title, message, duration) =>
      addToast({ title, message, type: 'warning', duration }),
    // Dispatches an informational toast (blue accent, info icon)
    info: (title, message, duration) =>
      addToast({ title, message, type: 'info', duration }),
  };

  // Icon mapping dictionary keyed by toast notification severity level
  const icons = {
    // Emerald checkmark icon for successful mutations
    success: <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />,
    // Rose exclamation icon for network or validation failures
    error: <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />,
    // Amber warning triangle for operational alerts and impending deadlines
    warning: <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />,
    // Blue info circle for general system notices
    info: <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />,
  };

  // Border styling dictionary mapping notification types to subtle tinted hairline borders
  const borders = {
    // Green border for success toasts
    success: 'border-emerald-200/90',
    // Red border for error toasts
    error: 'border-rose-200/90',
    // Amber border for warning toasts
    warning: 'border-amber-200/90',
    // Blue border for info toasts
    info: 'border-blue-200/90',
  };

  // Render provider and floating notifications container
  return (
    // Wrap children in ToastContext providing the toast dispatch methods
    <ToastContext.Provider value={toast}>
      {/* Application page content */}
      {children}

      {/* Floating Toast Container pinned to bottom-right with pointer-events-none so it doesn't block clicks beneath */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col space-y-2.5 max-w-sm w-full pointer-events-none">
        {/* Render each active toast item */}
        {toasts.map((t) => (
          // Individual toast notification card
          <div
            // Unique key for React list reconciliation
            key={t.id}
            // Class names styling the toast card with re-enabled pointer events for dismiss buttons
            className={cn(
              'pointer-events-auto flex items-start space-x-3 rounded-xl bg-white p-3.5 shadow-lg border text-sm transition-all duration-200 animate-in slide-in-from-bottom-3',
              borders[t.type] || borders.info
            )}
          >
            {/* Semantic icon for the toast type */}
            {icons[t.type]}
            {/* Text content container */}
            <div className="flex-1">
              {/* Optional bold title heading */}
              {t.title && (
                <h4 className="font-semibold text-gray-900 text-xs tracking-tight">
                  {t.title}
                </h4>
              )}
              {/* Optional descriptive detail message */}
              {t.message && (
                <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
                  {t.message}
                </p>
              )}
            </div>
            {/* Manual dismiss button */}
            <button
              // HTML button element type
              type="button"
              // Click handler to remove toast immediately
              onClick={() => removeToast(t.id)}
              // Button styling for close icon
              className="text-gray-400 hover:text-gray-600 p-0.5 rounded cursor-pointer"
            >
              {/* Dismiss cross icon */}
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// Custom hook enabling any descendant component to trigger toast notifications
export function useToast() {
  // Read context value
  const context = useContext(ToastContext);
  // Throw descriptive error if hook is invoked outside ToastProvider
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  // Return toast dispatch object
  return context;
}

// Export ToastContext as default export
export default ToastContext;
