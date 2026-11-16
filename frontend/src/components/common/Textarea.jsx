// Import React core library
import React from 'react';
// Import class name combination helper
import { cn } from '../../utils/cn';

/**
 * Enterprise Textarea Component
 * Multi-line form input with standardized styling, focus ring, and forwardRef support.
 */
// Textarea component wrapped in React.forwardRef
export const Textarea = React.forwardRef(function Textarea(
  {
    label,
    error,
    helperText,
    required = false,
    disabled = false,
    rows = 4,
    className = '',
    id,
    ...props
  },
  ref
) {
  // Generate consistent element ID from prop or sanitized label string
  const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  // Render textarea container
  return (
    // Full-width form control wrapper
    <div className="w-full">
      {/* Optional top label */}
      {label && (
        <label
          htmlFor={textareaId}
          className="block text-xs font-semibold tracking-wide text-gray-700 uppercase mb-1.5"
        >
          {label}
          {/* Red asterisk indicator for required fields */}
          {required && <span className="text-red-500 ml-1 font-bold">*</span>}
        </label>
      )}

      {/* Native HTML textarea element */}
      <textarea
        ref={ref}
        id={textareaId}
        rows={rows}
        disabled={disabled}
        className={cn(
          'w-full rounded-xl border bg-white p-3.5 text-sm text-gray-900 placeholder:text-gray-400 transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed',
          error
            ? 'border-red-300 focus:border-red-500 focus:ring-red-200 text-red-900'
            : 'border-gray-300 focus:border-blue-600 focus:ring-blue-100',
          className
        )}
        {...props}
      />

      {/* Error message or helper caption */}
      {error ? (
        <p className="mt-1.5 text-xs font-medium text-red-600">{error}</p>
      ) : helperText ? (
        <p className="mt-1.5 text-xs text-gray-500">{helperText}</p>
      ) : null}
    </div>
  );
});

// Export Textarea as default export
export default Textarea;
