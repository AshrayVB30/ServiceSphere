// Import React core library
import React from 'react';
// Import Check icon from Lucide for checkbox checkmark depiction
import { Check } from 'lucide-react';
// Import class name combination helper
import { cn } from '../../utils/cn';

/**
 * Enterprise Checkbox Component
 * Supports both controlled (`checked` explicitly provided) and uncontrolled (React Hook Form `register`) usage.
 */
// Checkbox component using forwardRef to allow seamless integration with React Hook Form
export const Checkbox = React.forwardRef(function Checkbox(
  {
    label,
    description,
    checked,
    defaultChecked,
    onChange,
    disabled = false,
    className = '',
    id,
    error,
    ...props
  },
  ref
) {
  // Generate consistent HTML element id from prop or sanitized label string
  const checkboxId = id || (label ? label.toLowerCase().replace(/[^a-z0-9]/g, '-') : undefined);

  // If `checked` is explicitly defined, pass it as controlled; otherwise let DOM control it
  const inputProps = {};
  if (checked !== undefined) {
    inputProps.checked = checked;
  }
  if (defaultChecked !== undefined) {
    inputProps.defaultChecked = defaultChecked;
  }

  // Render checkbox element
  return (
    // Outer container with select-none to prevent accidental text selection on click
    <div className={cn('select-none', className)}>
      {/* Flex container aligning checkbox indicator and text descriptions */}
      <div className="flex items-start space-x-3">
        {/* Relative container holding hidden native input and styled custom visual box */}
        <div className="relative flex items-center h-5 mt-0.5">
          {/* Native HTML checkbox input hidden visually but accessible to screen readers and keyboard focus */}
          <input
            ref={ref}
            id={checkboxId}
            type="checkbox"
            disabled={disabled}
            onChange={onChange}
            className="peer sr-only"
            {...inputProps}
            {...props}
          />
          {/* Styled visual checkbox box tied to input via htmlFor */}
          <label
            htmlFor={checkboxId}
            className={cn(
              'h-4.5 w-4.5 rounded-md border transition-all duration-150 flex items-center justify-center cursor-pointer',
              'border-gray-300 bg-white hover:border-gray-400',
              'peer-checked:bg-blue-600 peer-checked:border-blue-600 peer-checked:text-white peer-checked:shadow-2xs',
              'peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500 peer-focus-visible:ring-offset-1',
              disabled ? 'opacity-50 cursor-not-allowed bg-gray-100' : ''
            )}
          >
            {/* White check icon visible only when native peer input is checked */}
            <Check className="h-3.5 w-3.5 stroke-[3] hidden peer-checked:block text-white" />
          </label>
        </div>

        {/* Text column for optional primary label and descriptive subtitle */}
        {(label || description) && (
          <div className="text-sm">
            {/* Primary checkbox label */}
            {label && (
              <label
                htmlFor={checkboxId}
                className={cn(
                  'font-medium text-gray-800 cursor-pointer text-xs leading-normal',
                  disabled ? 'opacity-50 cursor-not-allowed' : ''
                )}
              >
                {label}
              </label>
            )}
            {/* Optional explanatory caption */}
            {description && (
              <p className="text-xs text-gray-500 mt-0.5">{description}</p>
            )}
          </div>
        )}
      </div>

      {/* Validation error message aligned with text column */}
      {error && (
        <p className="mt-1 text-xs font-medium text-red-600 pl-7">{error}</p>
      )}
    </div>
  );
});

// Export Checkbox as default export
export default Checkbox;
