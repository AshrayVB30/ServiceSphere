import React from 'react';
import { Badge } from '../common/Badge';
import { TICKET_STATUSES } from '../../constants';

/**
 * Specialized Status Badge for Tickets and Approvals
 */
export function StatusBadge({ status, className = '' }) {
  const config = {
    [TICKET_STATUSES.OPEN]: {
      label: 'Open',
      variant: 'blue',
    },
    [TICKET_STATUSES.IN_PROGRESS]: {
      label: 'In Progress',
      variant: 'purple',
    },
    [TICKET_STATUSES.AWAITING_CUSTOMER]: {
      label: 'Awaiting Customer',
      variant: 'warning',
    },
    [TICKET_STATUSES.RESOLVED]: {
      label: 'Resolved',
      variant: 'success',
    },
    [TICKET_STATUSES.CLOSED]: {
      label: 'Closed',
      variant: 'neutral',
    },
    // Approvals fallback
    PENDING: { label: 'Pending', variant: 'warning' },
    APPROVED: { label: 'Approved', variant: 'success' },
    REJECTED: { label: 'Rejected', variant: 'danger' },
    INFO_REQUESTED: { label: 'Info Requested', variant: 'purple' },
  };

  const item = config[status] || {
    label: status ? status.replace('_', ' ') : 'Unknown',
    variant: 'neutral',
  };

  return (
    <Badge variant={item.variant} dot className={className}>
      {item.label}
    </Badge>
  );
}

export default StatusBadge;

