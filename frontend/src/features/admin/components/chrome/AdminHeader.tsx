import React from 'react';
import { ArrowLeft, LogOut, RefreshCw, ShieldCheck } from 'lucide-react';
import { useLocation } from '@/app/routerContext';
import { useAuth } from '@/features/auth/context/authContext';
import { useAdmin } from '@/features/admin/context/adminContext';
import { initialsOf } from '@/features/admin/data/adminFormatters';
import { RoleBadge } from '@/features/admin/components/cards/Badges';

/** Console top bar: page identity on one side, the signed-in admin on the other. */
export const AdminHeader: React.FC = () => {
  const { user, signOut } = useAuth();
  const { isRefreshing, refresh } = useAdmin();
  const { navigate } = useLocation();

  if (!user) return null;

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <header className="admin-topbar">
      <div className="admin-topbar-lead">
        <span className="admin-topbar-mark">
          <ShieldCheck size={18} />
        </span>
        <div className="admin-topbar-heading">
          <h1 className="admin-topbar-title">لوحة الإدارة</h1>
          <p className="admin-topbar-sub">المستخدمون والأجهزة وتحليلات الدخول</p>
        </div>
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
          title="تحديث البيانات"
          disabled={isRefreshing}
          onClick={refresh}
        >
          <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : undefined} />
        </button>

        <button type="button" className="admin-ghost-btn" onClick={() => navigate('/')}>
          <ArrowLeft size={15} />
          <span className="admin-btn-label">إلى الموقع</span>
        </button>

        <button type="button" className="admin-danger-btn" onClick={handleSignOut}>
          <LogOut size={15} />
          <span className="admin-btn-label">خروج</span>
        </button>
      </div>
    </header>
  );
};
