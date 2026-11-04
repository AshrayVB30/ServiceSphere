import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * Enterprise Checkbox Component
 */
export const Checkbox = React.forwardRef(function Checkbox(
  {
    label,
    description,
    checked = false,
    onChange,
    disabled = false,
    className = '',
    id,
    ...props
  },
  ref
) {
  const checkboxId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className={cn('flex items-start space-x-3 select-none', className)}>
      <div className="relative flex items-center h-5 mt-0.5">
        <input
          ref={ref}
          id={checkboxId}
          type="checkbox"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className="peer sr-only"
          {...props}
        />
        <div
          onClick={() => !disabled && onChange && onChange({ target: { checked: !checked } })}
          className={cn(
            'h-4.5 w-4.5 rounded-md border transition-all duration-150 flex items-center justify-center cursor-pointer',
            checked
              ? 'bg-blue-600 border-blue-600 text-white shadow-2xs'
              : 'bg-white border-gray-300 hover:border-gray-400',
            disabled ? 'opacity-50 cursor-not-allowed bg-gray-100' : ''
          )}
        >
          {checked && <Check className="h-3.5 w-3.5 stroke-[3]" />}
        </div>
      </div>

      {(label || description) && (
        <div className="text-sm">
          {label && (
            <label
              htmlFor={checkboxId}
              className={cn(
                'font-medium text-gray-800 cursor-pointer',
                disabled ? 'opacity-50 cursor-not-allowed' : ''
              )}
            >
              {label}
            </label>
          )}
          {description && (
            <p className="text-xs text-gray-500 mt-0.5">{description}</p>
          )}
        </div>
      )}
    </div>
  );
});

export default Checkbox;

