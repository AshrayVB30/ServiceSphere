// Import React core library
import React from 'react';
// Import class name combination helper
import { cn } from '../../utils/cn';

/**
 * Enterprise Card Container Component (Tier-1 SaaS Aesthetic)
 * Crisp 1px hairline border, restrained elevation, compact 12px radius.
 */
// Card component providing standardized surface framing for workspace modules
export function Card({
  children,
  title,
  subtitle,
  headerAction,
  footer,
  padding = true,
  className = '',
  onClick,
  hoverable = false,
  headingAs: HeadingTag = 'h2',
  ...props
}) {
  // Render container surface
  return (
    // Outer card container div
    <div
      // Click handler for selectable or navigable cards
      onClick={onClick}
      // Combine base surface classes with hover effects and custom overrides
      className={cn(
        'bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-all duration-150',
        hoverable ? 'hover:border-slate-300 hover:shadow-xs cursor-pointer' : '',
        className
      )}
      // Forward any remaining HTML attributes (data-*, aria-*, etc.)
      {...props}
    >
      {/* Render header row if title, subtitle, or headerAction is supplied */}
      {(title || subtitle || headerAction) && (
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
          <div>
            {/* Semantic heading tag configured via headingAs prop (defaults to h2) */}
            {title && (
              <HeadingTag className="text-sm font-semibold text-slate-900 tracking-tight">
                {title}
              </HeadingTag>
            )}
            {/* Optional sub-caption describing the card's data context */}
            {subtitle && (
              <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
            )}
          </div>
          {/* Optional right-aligned header action button or control */}
          {headerAction && (
            <div className="flex items-center space-x-2 shrink-0">{headerAction}</div>
          )}
        </div>
      )}

      {/* Main card body with optional standard padding (defaults to true) */}
      <div className={padding ? 'p-5' : ''}>{children}</div>

      {/* Optional card footer bar for metadata, pagination, or secondary action links */}
      {footer && (
        <div className="px-5 py-3 bg-slate-50/70 rounded-b-xl border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
          {footer}
        </div>
      )}
    </div>
  );
}

// Export Card as default export
export default Card;
