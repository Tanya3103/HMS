import React from 'react';
import './StatusBadge.css';

const STATUS_CONFIG = {
  SCHEDULED: { label: 'Scheduled', variant: 'scheduled' },
  CHECKED_IN: { label: 'Checked In', variant: 'checkedin' },
  IN_CONSULTATION: { label: 'In Consultation', variant: 'inconsult' },
  COMPLETED: { label: 'Completed', variant: 'completed' },
  CANCELLED: { label: 'Cancelled', variant: 'danger' },
  NO_SHOW: { label: 'No Show', variant: 'warning' },
  ACTIVE: { label: 'Active', variant: 'checkedin' },
  DISABLED: { label: 'Disabled', variant: 'danger' }
};

export function StatusBadge({ status, customLabel, className = '' }) {
  const config = STATUS_CONFIG[status] || {
    label: customLabel || status,
    variant: 'completed'
  };

  return (
    <span className={`status-badge badge-${config.variant} ${className}`}>
      <span className="badge-dot" aria-hidden="true" />
      <span className="badge-text">{customLabel || config.label}</span>
    </span>
  );
}
