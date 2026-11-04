import React from 'react';
import { cn } from '../../utils/cn';

/**
 * Enterprise Card Container Component (Tier-1 SaaS Aesthetic)
 * Crisp 1px hairline border, restrained elevation, compact 12px radius.
 */
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
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-all duration-150',
        hoverable ? 'hover:border-slate-300 hover:shadow-xs cursor-pointer' : '',
        className
      )}
      {...props}
    >
      {(title || subtitle || headerAction) && (
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
          <div>
            {title && (
              <HeadingTag className="text-sm font-semibold text-slate-900 tracking-tight">
                {title}
              </HeadingTag>
            )}
            {subtitle && (
              <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
            )}
          </div>
          {headerAction && (
            <div className="flex items-center space-x-2 shrink-0">{headerAction}</div>
          )}
        </div>
      )}

      <div className={padding ? 'p-5' : ''}>{children}</div>

      {footer && (
        <div className="px-5 py-3 bg-slate-50/70 rounded-b-xl border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
          {footer}
        </div>
      )}
    </div>
  );
}

export default Card;

