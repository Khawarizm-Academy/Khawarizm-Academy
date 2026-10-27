import React from 'react';
import { Bell, Bookmark } from 'lucide-react';
import { useNavigate } from '@/app/routerContext';
import { DASHBOARD_NAV, NAV_TARGETS } from '@/shared/lib/navigation';
import { UserAvatar } from '@/shared/components/Artwork/UserAvatar';
import brandIcon from '@/assets/brand/generated/icon-192.png';
import { useAuth } from '@/features/auth/context/authContext';
import { ROLE_LABELS } from '@/features/auth/types';

interface DesktopDashboardSidebarProps {
  currentView: string;
  onSelectView: (view: string) => void;
  unreadNotificationsCount?: number;
}

export const DesktopDashboardSidebar: React.FC<DesktopDashboardSidebarProps> = ({
  currentView,
  onSelectView,
  unreadNotificationsCount = 0,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <aside dir="rtl" className="dash-sidebar">
      <div className="dash-sidebar-rail">
        <div className="dash-side-top">
          {/* Brand */}
          <button
            type="button"
            onClick={() => navigate(NAV_TARGETS.home)}
            title="أكاديمية خوارزم"
            className="dash-side-row group"
          >
            <img src={brandIcon} alt="شعار أكاديمية خوارزم" className="dash-brand-mark-img" />
            <span className="dash-brand-name">أكاديمية خوارزم</span>
          </button>

          {/* Nav List */}
          <nav className="dash-nav">
            {DASHBOARD_NAV.map((item) => {
              const Icon = item.icon;
              const isActive = item.activeViews.includes(currentView);
              const target = item.isExternalRoute ? item.path : undefined;

              return (
                <button
                  key={item.id}
                  type="button"
                  title={item.label}
                  onClick={() => (target ? navigate(target) : onSelectView(item.id))}
                  className={`dash-nav-item ${isActive ? 'dash-nav-item-active' : 'dash-nav-item-idle'}`}
                >
                  <Icon size={18} strokeWidth={isActive ? 2.2 : 1.8} className="dash-nav-icon" />
                  <span className="dash-nav-label">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Bottom: User Profile + Saved & Notification icons */}
        <div className="dash-side-bottom">
          <button
            type="button"
            onClick={() => onSelectView('profile')}
            title="الملف الشخصي"
            className="dash-side-row group"
          >
            <UserAvatar src={user?.avatarUrl} initials={user?.avatarInitials ?? ''} className="dash-avatar size-10" />
            <div className="dash-user-names">
              <span className="dash-user-name">{user?.fullName}</span>
              <span className="dash-user-role">{user ? ROLE_LABELS[user.role] : ''}</span>
            </div>
          </button>

          {/* Saved (bookmark) + notifications (bell) side by side */}
          <div className="dash-side-actions">
            <button
              type="button"
              onClick={() => onSelectView('saved')}
              title="المحفوظات"
              className={`dash-bell relative ${currentView === 'saved' ? 'dash-bell-active' : 'dash-bell-idle'}`}
            >
              <Bookmark size={18} strokeWidth={2} />
            </button>

            <button
              type="button"
              onClick={() => onSelectView('notifications')}
              title="مركز الإشعارات"
              className={`dash-bell relative ${currentView === 'notifications' ? 'dash-bell-active' : 'dash-bell-idle'}`}
            >
              <Bell size={18} strokeWidth={2} />
              {unreadNotificationsCount > 0 && (
                <div className="dash-bell-badge -top-1 left-[22px]">
                  <span className="dash-bell-count leading-3">{unreadNotificationsCount}</span>
                </div>
              )}
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
