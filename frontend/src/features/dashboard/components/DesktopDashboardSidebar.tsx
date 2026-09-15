import React from 'react';
import { useNavigate } from '../../../app/routerContext';

interface DesktopDashboardSidebarProps {
  currentView: string;
  onSelectView: (view: string) => void;
  unreadNotificationsCount?: number;
}

export const DesktopDashboardSidebar: React.FC<DesktopDashboardSidebarProps> = ({
  currentView,
  onSelectView,
  unreadNotificationsCount = 5,
}) => {
  const navigate = useNavigate();

  const navItems = [
    { id: 'home', label: 'الرئيسية', path: '/', isExternalRoute: true },
    { id: 'courses', label: 'الدورات', path: '/catalog?type=courses', isExternalRoute: true },
    { id: 'scholarships', label: 'المنح', path: '/catalog?type=scholarships', isExternalRoute: true },
    { id: 'saved', label: 'لوحتي المحفوظة', path: '/dashboard?view=saved', isExternalRoute: false },
    { id: 'profile', label: 'حسابي', path: '/profile', isExternalRoute: true },
  ];

  return (
    <aside
      dir="rtl"
      data-layer="Sidebar"
      className="Sidebar w-60 self-stretch shrink-0 px-4 py-6 bg-slate-900 border-l border-blue-900/80 sticky top-0 h-screen hidden lg:flex flex-col justify-between items-start z-30"
    >
      <div data-layer="Sidebar-Top" className="SidebarTop self-stretch flex flex-col justify-start items-start gap-6">
        {/* Brand */}
        <button
          type="button"
          onClick={() => navigate('/')}
          data-layer="Brand"
          className="Brand self-stretch inline-flex justify-start items-center gap-3 group text-right cursor-pointer"
        >
          <div
            data-layer="Logo-Icon"
            className="LogoIcon size-9 bg-orange-300 rounded-[10px] inline-flex flex-col justify-center items-center shadow-[0_0_12px_rgba(229,182,92,0.4)] group-hover:scale-105 transition-transform"
          >
            <span data-layer="خ" className="text-slate-900 text-xl font-black font-['Cairo'] leading-none">
              خ
            </span>
          </div>
          <span
            data-layer="أكاديمية خوارزم"
            className="text-slate-200 text-xl font-bold font-['Cairo'] leading-6 group-hover:text-orange-300 transition-colors"
          >
            أكاديمية خوارزم
          </span>
        </button>

        {/* Nav List */}
        <nav data-layer="Nav-List" className="NavList self-stretch flex flex-col justify-start items-start gap-2">
          {navItems.map((item) => {
            const isActive =
              (item.id === 'saved' && (currentView === 'saved' || currentView === 'main' || currentView === 'live'));

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (item.isExternalRoute) {
                    navigate(item.path);
                  } else {
                    onSelectView(item.id);
                  }
                }}
                className={`NavItem self-stretch px-3 py-2.5 rounded-xl inline-flex justify-between items-center transition-all cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 outline outline-1 outline-offset-[-1px] outline-orange-300 text-orange-300 font-bold shadow-[0_0_10px_rgba(229,182,92,0.15)]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 font-medium'
                }`}
              >
                <span className="text-base font-['Tajawal'] leading-6">{item.label}</span>

                {/* Icons matching Figma design */}
                {item.id === 'home' && (
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="shrink-0">
                    <path
                      d="M9 1L16.66 7.22V16.1C16.66 16.6 16.28 17 16 17H2C1.72 17 1 16.6 1 16.1V7.22L9 1Z"
                      stroke={isActive ? '#E5B65C' : '#8299B5'}
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                )}
                {item.id === 'courses' && (
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="shrink-0">
                    <path
                      d="M5.4 1C6.7 1.3 8 2.4 8 4H10C10 2.4 11.3 1.3 12.6 1H17V14H11.7C9.7 14 9 15.2 9 15.2C9 15.2 8.3 14 6.3 14H1V1H5.4Z"
                      stroke={isActive ? '#E5B65C' : '#8299B5'}
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                )}
                {item.id === 'scholarships' && (
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="shrink-0">
                    <path
                      d="M9 1C13.4 1 17 4.4 17 5.4C17 6.6 13.8 8.9 13.8 8.9L15.2 16.8L9 14.3L2.8 16.8L4.2 8.9C2 7.9 1 6.6 1 5.4C1 4.4 4.6 1 9 1Z"
                      stroke={isActive ? '#E5B65C' : '#8299B5'}
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                )}
                {item.id === 'saved' && (
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="shrink-0">
                    <path
                      d="M6 14V17H1V14H6ZM17 10V17H12V10H17ZM6 1V8H1V1H6ZM17 1V4H12V1H17Z"
                      stroke={isActive ? '#E5B65C' : '#8299B5'}
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                )}
                {item.id === 'profile' && (
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="shrink-0">
                    <path
                      d="M9 1C11.5 1 13.1 2.6 13.1 4C13.1 5.4 11.5 7 9 7C6.5 7 4.9 5.4 4.9 4C4.9 2.6 6.5 1 9 1Z"
                      stroke={isActive ? '#E5B65C' : '#8299B5'}
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Sidebar Bottom: User Badge + Notification Bell */}
      <div data-layer="Sidebar-Bottom" className="SidebarBottom self-stretch flex flex-col justify-start items-start gap-4 pt-4 border-t border-blue-900/40">
        <button
          type="button"
          onClick={() => navigate('/profile')}
          data-layer="User-Badge"
          className="UserBadge self-stretch inline-flex justify-start items-center gap-3 group text-right cursor-pointer"
        >
          <div data-layer="Avatar-Frame" className="AvatarFrame size-10 rounded-full bg-[#061A3A] border border-blue-900 flex items-center justify-center overflow-hidden shrink-0 group-hover:border-sky-400 transition-colors">
            <span className="text-sky-300 font-bold text-sm">أغ</span>
          </div>
          <div data-layer="Greeting" className="Greeting inline-flex flex-col justify-start items-start gap-0.5">
            <span data-layer="أحمد الغامدي" className="text-slate-200 text-sm font-bold font-['Tajawal'] leading-5 group-hover:text-sky-300 transition-colors">
              أحمد الغامدي
            </span>
            <span data-layer="طالب متميز" className="text-slate-400 text-xs font-normal font-['Tajawal'] leading-4">
              طالب متميز
            </span>
          </div>
        </button>

        {/* Notification Bell matching Figma */}
        <button
          type="button"
          onClick={() => onSelectView('notifications')}
          data-layer="Notification-Bell"
          title="مركز الإشعارات"
          className={`NotificationBell size-10 relative bg-slate-900 rounded-full outline outline-1 outline-offset-[-1px] flex justify-center items-center cursor-pointer transition-all hover:scale-105 ${
            currentView === 'notifications'
              ? 'outline-orange-300 shadow-[0_0_12px_rgba(229,182,92,0.3)]'
              : 'outline-blue-900 hover:outline-sky-400'
          }`}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M10 1C11.5 1 13 1.5 14 2.5C15.1 3.5 15.7 4.7 15.7 6C15.7 8.4 16.1 10 16.7 11.3C17.4 12.5 18.2 13.3 19 14H1C1.8 13.3 2.6 12.5 3.3 11.3C3.9 10 4.3 8.4 4.3 6C4.3 4.7 4.9 3.5 6 2.5C7 1.5 8.5 1 10 1Z"
              stroke={currentView === 'notifications' ? '#E5B65C' : '#8299B5'}
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          {unreadNotificationsCount > 0 && (
            <div
              data-layer="Notification-Badge"
              className="NotificationBadge px-[5px] py-0.5 -top-1 left-[24px] absolute bg-red-500 rounded-full inline-flex justify-center items-center shadow-sm"
            >
              <span data-layer="5" className="text-white text-[10px] font-bold font-['Tajawal'] leading-3">
                {unreadNotificationsCount}
              </span>
            </div>
          )}
        </button>
      </div>
    </aside>
  );
};
