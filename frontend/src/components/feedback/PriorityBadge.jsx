// Import React core library
import React from 'react';
// Import base Badge component
import { Badge } from '../common/Badge';
// Import ticket priority constants
import { TICKET_PRIORITIES } from '../../constants';

/**
 * Specialized Priority Badge (Low, Medium, High, Urgent)
 * Renders consistent color-coded priority micro-indicators across tickets and queues.
 */
export function PriorityBadge({ priority, className = '' }) {
  // Configuration dictionary mapping each priority tier to display label and visual variant tone
  const config = {
    // Low priority: neutral gray styling
    [TICKET_PRIORITIES.LOW]: {
      label: 'Low',
      variant: 'neutral',
    },
    // Medium priority: standard blue styling
    [TICKET_PRIORITIES.MEDIUM]: {
      label: 'Medium',
      variant: 'blue',
    },
    // High priority: amber warning styling
    [TICKET_PRIORITIES.HIGH]: {
      label: 'High',
      variant: 'warning',
    },
    // Urgent priority: rose danger styling
    [TICKET_PRIORITIES.URGENT]: {
      label: 'Urgent',
      variant: 'danger',
    },
  };

  // Resolve config item for provided priority or fallback to Medium default
  const item = config[priority] || {
    label: priority || 'Medium',
    variant: 'blue',
  };

  // Render Badge component with dot indicator
  return (
    <Badge variant={item.variant} dot className={className}>
      {item.label}
    </Badge>
  );
}

// Export PriorityBadge as default export
export default PriorityBadge;
