// Import React core library
import React from 'react';
// Import base Badge component
import { Badge } from '../common/Badge';
// Import ticket status constants
import { TICKET_STATUSES } from '../../constants';

/**
 * Specialized Status Badge for Tickets and Approvals
 * Renders standardized lifecycle state tags across the application.
 */
export function StatusBadge({ status, className = '' }) {
  // Configuration dictionary mapping each lifecycle status to display label and visual color tone
  const config = {
    // Ticket Open: blue variant
    [TICKET_STATUSES.OPEN]: {
      label: 'Open',
      variant: 'blue',
    },
    // Ticket In Progress: purple variant
    [TICKET_STATUSES.IN_PROGRESS]: {
      label: 'In Progress',
      variant: 'purple',
    },
    // Ticket Awaiting Customer: amber warning variant
    [TICKET_STATUSES.AWAITING_CUSTOMER]: {
      label: 'Awaiting Customer',
      variant: 'warning',
    },
    // Ticket Resolved: emerald success variant
    [TICKET_STATUSES.RESOLVED]: {
      label: 'Resolved',
      variant: 'success',
    },
    // Ticket Closed: neutral gray variant
    [TICKET_STATUSES.CLOSED]: {
      label: 'Closed',
      variant: 'neutral',
    },
    // Approvals fallback: Pending review
    PENDING: { label: 'Pending', variant: 'warning' },
    // Approvals fallback: Approved
    APPROVED: { label: 'Approved', variant: 'success' },
    // Approvals fallback: Rejected
    REJECTED: { label: 'Rejected', variant: 'danger' },
    // Approvals fallback: Information Requested
    INFO_REQUESTED: { label: 'Info Requested', variant: 'purple' },
  };

  // Resolve config item or generate fallback display label
  const item = config[status] || {
    label: status ? status.replace('_', ' ') : 'Unknown',
    variant: 'neutral',
  };

  // Render Badge component with dot indicator
  return (
    <Badge variant={item.variant} dot className={className}>
      {item.label}
    </Badge>
  );
}

// Export StatusBadge as default export
export default StatusBadge;
