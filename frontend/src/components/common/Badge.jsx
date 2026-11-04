import React from 'react';
import { cn } from '../../utils/cn';

/**
 * Enterprise Badge Component (Apple / Linear Aesthetic)
 * Crisp micro-tagging with subtle backgrounds and matching borders.
 */
export function Badge({
  children,
  variant = 'neutral',
  size = 'md',
  dot = false,
  className = '',
}) {
  const variantStyles = {
    neutral: 'bg-gray-100 text-gray-700 border-gray-200/80',
    blue: 'bg-blue-50 text-blue-700 border-blue-200/70',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200/70',
    warning: 'bg-amber-50 text-amber-800 border-amber-200/70',
    danger: 'bg-rose-50 text-rose-700 border-rose-200/70',
    purple: 'bg-purple-50 text-purple-700 border-purple-200/70',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200/70',
  };

  const dotColors = {
    neutral: 'bg-gray-500',
    blue: 'bg-blue-500',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-rose-500',
    purple: 'bg-purple-500',
    indigo: 'bg-indigo-500',
  };

  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5 rounded-md font-medium',
    md: 'text-xs px-2.5 py-0.5 rounded-md font-medium',
    lg: 'text-xs px-3 py-1 rounded-lg font-medium',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 border select-none',
        variantStyles[variant] || variantStyles.neutral,
        sizeStyles[size] || sizeStyles.md,
        className
      )}
    >
      {dot && (
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full shrink-0',
            dotColors[variant] || dotColors.neutral
          )}
        />
      )}
      {children}
    </span>
  );
}

export default Badge;

