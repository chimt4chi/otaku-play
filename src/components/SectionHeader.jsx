import React from 'react';
import { ChevronRight } from 'lucide-react';

/** Shared section heading row with optional subtitle, action slot, and view-all trigger. */
export default function SectionHeader({
  title,
  icon: Icon = null,
  subtitle = null,
  onSeeAll = null,
  as = 'h2',
  action = null,
}) {
  const Heading = as;

  return (
    <div className="section-header">
      <div className="section-heading-block">
        <div className="section-title-group">
          <div className="section-indicator" aria-hidden="true" />
          <Heading className="section-title">{title}</Heading>
        </div>
        {subtitle && (
          <p className="section-subtitle">
            {Icon && <Icon size={13} aria-hidden="true" />}
            <span>{subtitle}</span>
          </p>
        )}
      </div>

      {(action || onSeeAll) && (
        <div className="section-header-right">
          {action}
          {onSeeAll && (
            <button type="button" className="section-link" onClick={onSeeAll}>
              <span>View all</span>
              <ChevronRight size={15} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
