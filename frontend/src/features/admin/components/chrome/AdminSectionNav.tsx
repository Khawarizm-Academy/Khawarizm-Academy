import React from 'react';
import { BrandLogo } from '@/shared/components/Artwork/BrandVisuals';
import { UserAvatar } from '@/shared/components/Artwork/UserAvatar';
import { RoleBadge } from '@/features/admin/components/cards/Badges';
import { ADMIN_NAV_GROUPS, SECTION_LABELS } from '@/features/admin/types';
import { SECTION_ICONS, initialsOf } from '@/features/admin/data/adminFormatters';
import type { AdminSectionKey } from '@/features/admin/types';
import type { AuthRole } from '@/features/auth/types';

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
      title={SECTION_LABELS[section]}
      aria-current={isActive ? 'page' : undefined}
      onClick={() => onSelect(section)}
      className={`${className} ${isActive ? `${className}-active` : `${className}-idle`}`}
    >
      <Icon size={16} strokeWidth={isActive ? 2.2 : 1.8} />
      <span>{SECTION_LABELS[section]}</span>
    </button>
  );
};

/** The signed-in operator, shown at the bottom of the rail. */
export interface RailOperator {
  fullName: string;
  email: string;
  avatarUrl: string;
  role: AuthRole;
}

const OperatorCard: React.FC<RailOperator> = ({ fullName, email, avatarUrl, role }) => (
  <div className="admin-operator">
    <UserAvatar src={avatarUrl} initials={initialsOf(fullName, email.slice(0, 1))} className="admin-operator-avatar" />
    <span className="admin-operator-names">
      <span className="admin-operator-name">{fullName}</span>
      <RoleBadge role={role} />
    </span>
  </div>
);

/** Desktop rail: brand, grouped sections, and the signed-in operator. */
export const AdminSectionNav: React.FC<SectionNavProps & { operator: RailOperator | null }> = ({
  currentSection,
  onSelect,
  operator,
}) => (
  <aside dir="rtl" className="admin-side" aria-label="أقسام لوحة الإدارة">
    <div className="admin-side-top">
      <span className="admin-side-brand">
        <BrandLogo size={40} showText={false} />
        <span className="admin-side-brand-text">
          <span className="admin-side-brand-name">أكاديمية خوارزم</span>
          <span className="admin-side-console-tag">لوحة الإدارة</span>
        </span>
      </span>

      <div className="admin-side-scroll">
        {ADMIN_NAV_GROUPS.map((group) => (
          <div key={group.id} className="admin-side-group">
            <span className="admin-side-group-label">{group.label}</span>
            <nav className="admin-side-nav">
              {group.sections.map((section) =>
                sectionButton(section, currentSection, onSelect, 'admin-nav-item')
              )}
            </nav>
          </div>
        ))}
      </div>
    </div>

    <div className="admin-side-foot">{operator && <OperatorCard {...operator} />}</div>
  </aside>
);

/** Mobile strip: the same registry, rendered as horizontally scrolling pills. */
export const AdminMobileTabs: React.FC<SectionNavProps> = ({ currentSection, onSelect }) => (
  <nav className="admin-pills" aria-label="أقسام لوحة الإدارة">
    {ADMIN_NAV_GROUPS.flatMap((group) => group.sections).map((section) =>
      sectionButton(section, currentSection, onSelect, 'admin-pill')
    )}
  </nav>
);
