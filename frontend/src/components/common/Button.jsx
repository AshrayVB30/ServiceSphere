import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * Enterprise Button Component (Apple / Linear Aesthetic)
 * Minimalist, restrained shadows, tactile active press state.
 */
export const Button = React.forwardRef(function Button(
  {
    children,
    type = 'button',
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    leftIcon: LeftIcon,
    rightIcon: RightIcon,
    className = '',
    onClick,
    ...props
  },
  ref
) {
  const baseStyles =
    'relative inline-flex items-center justify-center font-medium transition-all duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed select-none active:scale-[0.985] cursor-pointer';

  const variantStyles = {
    primary:
      'bg-blue-600 hover:bg-blue-700 text-white shadow-xs focus-visible:ring-blue-600 disabled:bg-blue-400 disabled:opacity-60 border border-blue-600',
    secondary:
      'bg-white hover:bg-gray-50 text-gray-800 border border-gray-300 shadow-2xs focus-visible:ring-gray-400 disabled:bg-gray-100 disabled:text-gray-400',
    outline:
      'bg-transparent hover:bg-gray-100/70 text-gray-700 border border-gray-200 focus-visible:ring-gray-400 disabled:text-gray-400 disabled:border-gray-200',
    ghost:
      'bg-transparent hover:bg-gray-100 text-gray-600 hover:text-gray-900 focus-visible:ring-gray-300 disabled:text-gray-300',
    danger:
      'bg-red-600 hover:bg-red-700 text-white shadow-xs focus-visible:ring-red-600 disabled:bg-red-300 border border-red-600',
    dangerOutline:
      'bg-white hover:bg-red-50 text-red-600 border border-red-200 hover:border-red-300 focus-visible:ring-red-500 disabled:opacity-50',
    subtle:
      'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-100 focus-visible:ring-blue-400 disabled:opacity-50',
  };

  const sizeStyles = {
    sm: 'h-8 px-3 text-xs rounded-lg gap-1.5',
    md: 'h-10 px-4 text-sm rounded-xl gap-2',
    lg: 'h-11 px-5 text-base rounded-xl gap-2.5',
    iconSm: 'h-8 w-8 rounded-lg p-0',
    iconMd: 'h-10 w-10 rounded-xl p-0',
  };

  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      onClick={onClick}
      className={cn(
        baseStyles,
        variantStyles[variant] || variantStyles.primary,
        sizeStyles[size] || sizeStyles.md,
        className
      )}
      {...props}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin text-current shrink-0" />
      ) : LeftIcon ? (
        <LeftIcon className="h-4 w-4 shrink-0" />
      ) : null}

      <span className={loading ? 'opacity-80' : ''}>{children}</span>

      {!loading && RightIcon && (
        <RightIcon className="h-4 w-4 shrink-0" />
      )}
    </button>
  );
});

export default Button;

