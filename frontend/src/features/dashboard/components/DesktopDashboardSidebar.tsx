import React from 'react';
import {
  Home,
  BookOpen,
  GraduationCap,
  LayoutGrid,
  User,
  Bell,
} from 'lucide-react';
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
    {
      id: 'main',
      label: 'الرئيسية',
      icon: Home,
      path: '/dashboard',
      isExternalRoute: false,
    },
    {
      id: 'courses',
      label: 'الدورات',
      icon: BookOpen,
      path: '/catalog?type=courses',
      isExternalRoute: true,
    },
    {
      id: 'scholarships',
      label: 'المنح',
      icon: GraduationCap,
      path: '/catalog?type=scholarships',
      isExternalRoute: true,
    },
    {
      id: 'saved',
      label: 'لوحتي المحفوظة',
      icon: LayoutGrid,
      path: '/dashboard?view=saved',
      isExternalRoute: false,
    },
    {
      id: 'profile',
      label: 'حسابي',
      icon: User,
      path: '/profile',
      isExternalRoute: true,
    },
  ];

  return (
    <aside
      dir="rtl"
      data-layer="Sidebar"
      className="Sidebar w-60 self-stretch shrink-0 px-4 py-6 bg-slate-900 border-l border-blue-900/80 sticky top-0 h-screen hidden lg:flex flex-col justify-between items-start z-30 select-none"
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
            className="LogoIcon size-9 bg-[#E5B65C] rounded-[10px] inline-flex flex-col justify-center items-center shadow-[0_0_12px_rgba(229,182,92,0.4)] group-hover:scale-105 transition-transform shrink-0"
          >
            <span data-layer="خ" className="text-slate-900 text-xl font-black font-['Cairo'] leading-none">
              خ
            </span>
          </div>
          <span
            data-layer="أكاديمية خوارزم"
            className="text-slate-200 text-xl font-bold font-['Cairo'] leading-6 group-hover:text-[#E5B65C] transition-colors"
          >
            أكاديمية خوارزم
          </span>
        </button>

        {/* Nav List */}
        <nav data-layer="Nav-List" className="NavList self-stretch flex flex-col justify-start items-start gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              (item.id === 'main' && (currentView === 'main' || currentView === 'live' || currentView === 'overview' || currentView === 'empty')) ||
              (item.id === 'saved' && currentView === 'saved');

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
                className={`NavItem self-stretch px-3 py-2.5 rounded-xl inline-flex justify-start items-center gap-3 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 outline outline-1 outline-offset-[-1px] outline-[#E5B65C] text-[#E5B65C] font-bold shadow-[0_0_10px_rgba(229,182,92,0.15)]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 font-medium'
                }`}
              >
                {/* Icon right next to text */}
                <Icon
                  size={18}
                  strokeWidth={isActive ? 2.2 : 1.8}
                  className={`shrink-0 transition-colors ${
                    isActive ? 'text-[#E5B65C]' : 'text-[#8299B5] group-hover:text-slate-200'
                  }`}
                />
                <span className="text-base font-['Tajawal'] leading-6">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Sidebar Bottom: User Profile + Notification Bell */}
      <div data-layer="Sidebar-Bottom" className="SidebarBottom self-stretch flex flex-col justify-start items-start gap-4 pt-4 border-t border-blue-900/40">
        <button
          type="button"
          onClick={() => navigate('/profile')}
          data-layer="User-Badge"
          className="UserBadge self-stretch inline-flex justify-start items-center gap-3 group text-right cursor-pointer"
        >
          <div data-layer="Avatar-Frame" className="AvatarFrame size-10 rounded-full bg-[#061A3A] border border-blue-900 flex items-center justify-center overflow-hidden shrink-0 group-hover:border-sky-400 transition-colors">
            {/* User photo avatar or fallback styled initials */}
            <span className="text-sky-300 font-bold text-sm font-['Cairo']">أغ</span>
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

        {/* Notification Bell matching Figma & Screenshot */}
        <button
          type="button"
          onClick={() => onSelectView('notifications')}
          data-layer="Notification-Bell"
          title="مركز الإشعارات"
          className={`NotificationBell size-10 relative bg-slate-900 rounded-full outline outline-1 outline-offset-[-1px] flex justify-center items-center cursor-pointer transition-all hover:scale-105 ${
            currentView === 'notifications'
              ? 'outline-[#E5B65C] text-[#E5B65C] shadow-[0_0_12px_rgba(229,182,92,0.3)]'
              : 'outline-blue-900 text-[#8299B5] hover:outline-sky-400 hover:text-sky-300'
          }`}
        >
          <Bell size={18} strokeWidth={2} />
          {unreadNotificationsCount > 0 && (
            <div
              data-layer="Notification-Badge"
              className="NotificationBadge px-1.5 py-0.5 -top-1 left-[22px] absolute bg-red-500 rounded-full inline-flex justify-center items-center shadow-sm"
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
