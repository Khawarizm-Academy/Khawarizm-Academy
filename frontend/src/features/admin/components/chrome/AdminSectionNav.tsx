import React from 'react';
import { ADMIN_SECTION_KEYS, SECTION_LABELS } from '@/features/admin/types';
import { SECTION_ICONS } from '@/features/admin/data/adminFormatters';
import type { AdminSectionKey } from '@/features/admin/types';

interface SectionNavProps {
  currentSection: AdminSectionKey;
  onSelect: (section: AdminSectionKey) => void;
}

/** One item shape the rail and the pill strip both render. */
const sectionButton = (
  section: AdminSectionKey,
  currentSection: AdminSectionKey,
  onSelect: (section: AdminSectionKey) => void,
  className: string
) => {
  const Icon = SECTION_ICONS[section];
  const isActive = section === currentSection;
  return (
    <button
      key={section}
      type="button"
      aria-current={isActive ? 'page' : undefined}
      onClick={() => onSelect(section)}
      className={`${className} ${isActive ? `${className}-active` : `${className}-idle`}`}
    >
      <Icon size={16} strokeWidth={isActive ? 2.2 : 1.8} />
      <span>{SECTION_LABELS[section]}</span>
    </button>
  );
};

/** Desktop rail: sticky beside the content column. */
export const AdminSectionNav: React.FC<SectionNavProps> = ({ currentSection, onSelect }) => (
  <aside className="admin-side" aria-label="أقسام لوحة الإدارة">
    <div className="admin-side-brand">
      <span className="admin-brand-mark">خ</span>
      <span className="admin-side-brand-text">
        <span className="admin-side-brand-name">أكاديمية خوارزم</span>
        <span className="admin-side-brand-tag">لوحة الإدارة</span>
      </span>
    </div>
    <nav className="admin-side-nav">
      {ADMIN_SECTION_KEYS.map((section) => sectionButton(section, currentSection, onSelect, 'admin-nav-item'))}
    </nav>
  </aside>
);

/** Mobile strip: the same registry, rendered as horizontally scrolling pills. */
export const AdminMobileTabs: React.FC<SectionNavProps> = ({ currentSection, onSelect }) => (
  <nav className="admin-pills lg:hidden" aria-label="أقسام لوحة الإدارة">
    {ADMIN_SECTION_KEYS.map((section) => sectionButton(section, currentSection, onSelect, 'admin-pill'))}
  </nav>
);
