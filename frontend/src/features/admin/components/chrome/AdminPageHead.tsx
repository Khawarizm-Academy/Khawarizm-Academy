import React from 'react';
import { useAdmin } from '@/features/admin/context/adminContext';
import { SECTION_DETAILS } from '@/features/admin/types';
import { SECTION_ICONS } from '@/features/admin/data/adminFormatters';

/**
 * The one header every section window opens with: gold plate, title, mandate line.
 * The registry answers it, so no view hand-draws its own page header.
 */
export const AdminPageHead: React.FC = () => {
  const { currentSection } = useAdmin();

  const detail = SECTION_DETAILS[currentSection];
  const Icon = SECTION_ICONS[currentSection];

  return (
    <div className="admin-page-head">
      <div className="admin-page-head-lead">
        <span className="admin-page-head-plate">
          <Icon size={22} strokeWidth={1.9} />
        </span>
        <div className="admin-page-head-text">
          <h1 className="view-h1">{detail.title}</h1>
          <p className="admin-page-head-sub">{detail.sub}</p>
        </div>
      </div>
    </div>
  );
};