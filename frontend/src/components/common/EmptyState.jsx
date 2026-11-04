import React from 'react';
import { Inbox } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../../utils/cn';

/**
 * Enterprise Empty State Component
 * Clean Apple/Linear styling: minimal icon, clear title, helpful text, optional CTA.
 */
export function EmptyState({
  icon: Icon = Inbox,
  title = 'No items found',
  description = 'There is currently no data to display for this view.',
  actionLabel,
  onAction,
  className = '',
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-gray-200 bg-white/60',
        className
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-500 mb-4 shadow-2xs">
        <Icon className="h-6 w-6 stroke-[1.75]" />
      </div>

      <h3 className="text-base font-semibold text-gray-900 tracking-tight">
        {title}
      </h3>

      <p className="mt-1 max-w-sm text-xs text-gray-500 leading-relaxed">
        {description}
      </p>

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

export default EmptyState;

