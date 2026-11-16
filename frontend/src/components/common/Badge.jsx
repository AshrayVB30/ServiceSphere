// Import React core library
import React from 'react';
// Import utility function for conditionally joining class names
import { cn } from '../../utils/cn';

/**
 * Enterprise Badge Component (Apple / Linear Aesthetic)
 * Crisp micro-tagging with subtle backgrounds and matching borders.
 */
// Badge component accepting text/elements, variant tone, size preset, optional status dot, and custom classes
export function Badge({
  children,
  variant = 'neutral',
  size = 'md',
  dot = false,
  className = '',
}) {
  // Variant styles mapping each semantic tier to background, text, and border styling
  const variantStyles = {
    // Neutral gray styling for inactive or default tags
    neutral: 'bg-gray-100 text-gray-700 border-gray-200/80',
    // Blue accent styling for active tickets or primary statuses
    blue: 'bg-blue-50 text-blue-700 border-blue-200/70',
    // Emerald green styling for resolved items, high compliance, or success
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200/70',
    // Amber styling for pending reviews, medium impact, or caution
    warning: 'bg-amber-50 text-amber-800 border-amber-200/70',
    // Rose red styling for urgent priority, SLA breaches, or errors
    danger: 'bg-rose-50 text-rose-700 border-rose-200/70',
    // Purple styling for in-progress work or technical classifications
    purple: 'bg-purple-50 text-purple-700 border-purple-200/70',
    // Indigo styling for specialized tags or client designations
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200/70',
  };

  // Dot color styles matching the semantic variant tone
  const dotColors = {
    // Gray indicator dot
    neutral: 'bg-gray-500',
    // Blue indicator dot
    blue: 'bg-blue-500',
    // Green indicator dot
    success: 'bg-emerald-500',
    // Amber indicator dot
    warning: 'bg-amber-500',
    // Red indicator dot
    danger: 'bg-rose-500',
    // Purple indicator dot
    purple: 'bg-purple-500',
    // Indigo indicator dot
    indigo: 'bg-indigo-500',
  };

  // Dimension presets for micro-badges across different layout densities
  const sizeStyles = {
    // Small micro-tag for dense tables
    sm: 'text-xs px-2 py-0.5 rounded-md font-medium',
    // Standard badge size for general UI usage
    md: 'text-xs px-2.5 py-0.5 rounded-md font-medium',
    // Larger badge size for detail page banners and prominent cards
    lg: 'text-xs px-3 py-1 rounded-lg font-medium',
  };

  // Render badge span element
  return (
    // Outer inline badge wrapper
    <span
      // Combine base inline-flex classes with selected variant, size, and custom classes
      className={cn(
        'inline-flex items-center gap-1.5 border select-none',
        variantStyles[variant] || variantStyles.neutral,
        sizeStyles[size] || sizeStyles.md,
        className
      )}
    >
      {/* Optional leading circular status indicator dot */}
      {dot && (
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full shrink-0',
            dotColors[variant] || dotColors.neutral
          )}
        />
      )}
      {/* Badge label text or child nodes */}
      {children}
    </span>
  );
}

// Export Badge as default export
export default Badge;
