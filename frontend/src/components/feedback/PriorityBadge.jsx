import React from 'react';
import { Badge } from '../common/Badge';
import { TICKET_PRIORITIES } from '../../constants';

/**
 * Specialized Priority Badge (Low, Medium, High, Urgent)
 */
export function PriorityBadge({ priority, className = '' }) {
  const config = {
    [TICKET_PRIORITIES.LOW]: {
      label: 'Low',
      variant: 'neutral',
    },
    [TICKET_PRIORITIES.MEDIUM]: {
      label: 'Medium',
      variant: 'blue',
    },
    [TICKET_PRIORITIES.HIGH]: {
      label: 'High',
      variant: 'warning',
    },
    [TICKET_PRIORITIES.URGENT]: {
      label: 'Urgent',
      variant: 'danger',
    },
  };

  const item = config[priority] || {
    label: priority || 'Medium',
    variant: 'blue',
  };

  return (
    <Badge variant={item.variant} dot className={className}>
      {item.label}
    </Badge>
  );
}

export default PriorityBadge;

