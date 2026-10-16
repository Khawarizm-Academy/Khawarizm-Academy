import React from 'react';
import { RoleBadge } from '@/features/admin/components/cards/Badges';
import { formatDateTime, formatLastSeen, initialsOf } from '@/features/admin/data/adminFormatters';
import type { AuthUser } from '@/features/auth/types';

interface UserProfileCardProps {
  profile: AuthUser;
}

/** Headline identity plus the raw account fields an admin checks before acting. */
export const UserProfileCard: React.FC<UserProfileCardProps> = ({ profile }) => {
  const fields: Array<{ label: string; value: string }> = [
    { label: 'البريد الإلكتروني', value: profile.email },
    { label: 'رقم الهاتف', value: profile.phone || '—' },
    { label: 'حالة العضوية', value: profile.membershipStatus || '—' },
    { label: 'معرّف الحساب', value: profile.id },
    { label: 'تاريخ الانضمام', value: formatDateTime(profile.createdAt) },
    { label: 'آخر ظهور', value: formatLastSeen(profile.lastSeenAt) },
  ];

  return (
    <section className="admin-detail-section">
      <div className="admin-detail-identity">
        <span className="admin-detail-avatar">{initialsOf(profile.fullName, profile.avatarInitials)}</span>
        <span className="admin-detail-names">
          <span className="admin-detail-name">{profile.fullName}</span>
          <RoleBadge role={profile.role} />
        </span>
      </div>

      <div className="admin-detail-grid">
        {fields.map((field) => (
          <div key={field.label} className="admin-detail-field">
            <span className="admin-detail-field-label">{field.label}</span>
            <span className="admin-detail-field-value">{field.value}</span>
          </div>
        ))}
      </div>
    </section>
  );
};
