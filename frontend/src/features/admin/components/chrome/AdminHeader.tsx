import React from 'react';
import { ArrowLeft, LogOut, RefreshCw } from 'lucide-react';
import { useLocation } from '@/app/routerContext';
import { useAuth } from '@/features/auth/context/authContext';
import { useAdmin } from '@/features/admin/context/adminContext';
import { RoleBadge } from '@/features/admin/components/cards/Badges';
import { SECTION_LABELS } from '@/features/admin/types';
import { SECTION_ICONS, initialsOf } from '@/features/admin/data/adminFormatters';

/** Console top bar: the open section on one side, the operator and actions on the other. */
export const AdminHeader: React.FC = () => {
  const { user, signOut } = useAuth();
  const { isRefreshing, refresh, currentSection } = useAdmin();
  const { navigate } = useLocation();

  if (!user) return null;

  const SectionIcon = SECTION_ICONS[currentSection];

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <header className="admin-topbar">
      <div className="admin-topbar-identity">
        <span className="admin-topbar-plate">
          <SectionIcon size={15} className="admin-topbar-plate-icon" />
          <span className="admin-topbar-plate-label">{SECTION_LABELS[currentSection]}</span>
        </span>
      </div>

      <div className="admin-topbar-actions">
        <div className="admin-identity">
          <span className="admin-identity-avatar">{initialsOf(user.fullName, user.avatarInitials)}</span>
          <span className="admin-identity-text">
            <span className="admin-identity-name">{user.fullName}</span>
            <RoleBadge role={user.role} />
          </span>
        </div>

        <button
          type="button"
          className="admin-icon-btn"
          aria-label="تحديث البيانات"
          title="تحديث جميع الأقسام"
          disabled={isRefreshing}
          onClick={refresh}
        >
          <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : undefined} />
        </button>

        <button type="button" className="admin-ghost-btn" onClick={() => navigate('/')}>
          <ArrowLeft size={15} />
          <span className="admin-btn-label">العودة إلى الموقع</span>
        </button>

        <button type="button" className="admin-danger-btn" onClick={handleSignOut}>
          <LogOut size={15} />
          <span className="admin-btn-label">تسجيل الخروج</span>
        </button>
      </div>

      <span className="admin-topbar-hairline" />
    </header>
  );
};
