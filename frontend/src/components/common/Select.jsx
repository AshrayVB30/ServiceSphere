// Import React core library
import React from 'react';
// Import ChevronDown icon from Lucide for select arrow indicator
import { ChevronDown } from 'lucide-react';
// Import class name combination helper
import { cn } from '../../utils/cn';

/**
 * Enterprise Select Dropdown Component
 * Standardized 42px height, custom chevron indicator, support for React Hook Form forwardRef.
 */
// Select component wrapped in React.forwardRef
export const Select = React.forwardRef(function Select(
  {
    label,
    error,
    helperText,
    options = [],
    placeholder = 'Select an option',
    required = false,
    disabled = false,
    className = '',
    id,
    ...props
  },
  ref
) {
  // Generate consistent element ID from prop or sanitized label string
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  // Render select wrapper
  return (
    // Full-width form control wrapper
    <div className="w-full">
      {/* Optional top label */}
      {label && (
        <label
          htmlFor={selectId}
          className="block text-xs font-semibold tracking-wide text-gray-700 uppercase mb-1.5"
        >
          {label}
          {/* Red asterisk indicator for required fields */}
          {required && <span className="text-red-500 ml-1 font-bold">*</span>}
        </label>
      )}

      {/* Relative container framing select element and custom chevron */}
      <div className="relative rounded-xl shadow-2xs">
        {/* Native HTML select element */}
        <select
          ref={ref}
          id={selectId}
          disabled={disabled}
          className={cn(
            'w-full h-10.5 appearance-none rounded-xl border bg-white pl-3.5 pr-10 text-sm text-gray-900 transition-colors cursor-pointer',
            'focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed',
            error
              ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
              : 'border-gray-300 focus:border-blue-600 focus:ring-blue-100',
            className
          )}
          {...props}
        >
          {/* Optional disabled placeholder item */}
          {placeholder && (
            <option value="" disabled className="text-gray-400">
              {placeholder}
            </option>
          )}
          {/* Render option list items */}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Custom ChevronDown icon indicator positioned on the right */}
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-gray-400">
          <ChevronDown className="h-4 w-4" />
        </div>
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

// Export Select as default export
export default Select;
