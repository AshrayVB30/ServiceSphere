// Import React core library
import React from 'react';
// Import Inbox icon from Lucide as default empty state graphic
import { Inbox } from 'lucide-react';
// Import Button component for optional primary call-to-action
import { Button } from './Button';
// Import class name combination helper
import { cn } from '../../utils/cn';

/**
 * Enterprise Empty State Component
 * Clean Apple/Linear styling: minimal icon, clear title, helpful text, optional CTA.
 */
// EmptyState component displayed when tables, queues, or searches return zero records
export function EmptyState({
  icon: Icon = Inbox,
  title = 'No items found',
  description = 'There is currently no data to display for this view.',
  actionLabel,
  onAction,
  className = '',
}) {
  // Render empty state container
  return (
    // Centered flexbox container with dashed border and translucent background
    <div
      className={cn(
        'flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-gray-200 bg-white/60',
        className
      )}
    >
      {/* Centered square badge containing graphic icon */}
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-500 mb-4 shadow-2xs">
        {/* Render icon with crisp hairline stroke */}
        <Icon className="h-6 w-6 stroke-[1.75]" />
      </div>

      {/* Primary empty state title heading */}
      <h3 className="text-base font-semibold text-gray-900 tracking-tight">
        {title}
      </h3>

      {/* Explanatory description guiding user on why no records were found */}
      <p className="mt-1 max-w-sm text-xs text-gray-500 leading-relaxed">
        {description}
      </p>

      {/* Optional action button (e.g. "Create New Ticket", "Reset Filters") */}
      {actionLabel && onAction && (
        <div className="mt-5">
          <Button variant="primary" size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
}

// Export EmptyState as default export
export default EmptyState;
