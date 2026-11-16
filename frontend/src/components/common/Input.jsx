// Import React and useState hook for password toggle visibility state
import React, { useState } from 'react';
// Import Eye and EyeOff icons from Lucide for password mask toggling
import { Eye, EyeOff } from 'lucide-react';
// Import class name combination helper
import { cn } from '../../utils/cn';

/**
 * Enterprise Form Input Component
 * Consistent 42px height, restrained focus borders, optional icons, password visibility toggle.
 */
// Input component using forwardRef to support React Hook Form register bindings
export const Input = React.forwardRef(function Input(
  {
    label,
    error,
    helperText,
    leftIcon: LeftIcon,
    rightIcon: RightIcon,
    type = 'text',
    required = false,
    disabled = false,
    className = '',
    id,
    ...props
  },
  ref
) {
  // Local state toggling plain-text password preview
  const [showPassword, setShowPassword] = useState(false);
  // Compute unique element ID from prop or sanitized label string
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  // Detect if input type is password
  const isPassword = type === 'password';
  // Compute effective input type (switches between 'password' and 'text' when toggled)
  const effectiveType = isPassword ? (showPassword ? 'text' : 'password') : type;

  // Render input container
  return (
    // Full-width wrapper div
    <div className="w-full">
      {/* Optional top label */}
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-semibold tracking-wide text-gray-700 uppercase mb-1.5"
        >
          {label}
          {/* Red asterisk indicator for mandatory fields */}
          {required && <span className="text-red-500 ml-1 font-bold">*</span>}
        </label>
      )}

      {/* Relative container framing input field and embedded icon controls */}
      <div className="relative rounded-xl shadow-2xs">
        {/* Optional left icon graphic */}
        {LeftIcon && (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
            <LeftIcon className="h-4 w-4" />
          </div>
        )}

        {/* Native HTML input field */}
        <input
          ref={ref}
          id={inputId}
          type={effectiveType}
          disabled={disabled}
          className={cn(
            'w-full h-10.5 rounded-xl border bg-white px-3.5 text-sm text-gray-900 placeholder:text-gray-400 transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed',
            error
              ? 'border-red-300 focus:border-red-500 focus:ring-red-200 text-red-900'
              : 'border-gray-300 focus:border-blue-600 focus:ring-blue-100',
            LeftIcon ? 'pl-10' : '',
            isPassword || RightIcon ? 'pr-10' : '',
            className
          )}
          {...props}
        />

        {/* Password visibility toggle button or static right icon */}
        {isPassword ? (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            tabIndex={-1}
            className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-gray-400 hover:text-gray-600 cursor-pointer"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        ) : RightIcon ? (
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-gray-400">
            <RightIcon className="h-4 w-4" />
          </div>
        ) : null}
      </div>

      {/* Error message or helper caption */}
      {error ? (
        <p className="mt-1.5 text-xs font-medium text-red-600">{error}</p>
      ) : helperText ? (
        <p className="mt-1.5 text-xs text-gray-500">{helperText}</p>
      ) : null}
    </div>
  );
});

// Export Input as default export
export default Input;
