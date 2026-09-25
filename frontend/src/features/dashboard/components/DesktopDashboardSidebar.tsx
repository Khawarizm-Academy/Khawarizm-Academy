import React from 'react';
import { Bell } from 'lucide-react';
import { useNavigate } from '../../../app/routerContext';
import { DASHBOARD_NAV } from '../../../shared/lib/navigation';

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

  return (
    <aside
      dir="rtl"
      className="w-60 self-stretch shrink-0 px-4 py-6 bg-slate-900 border-l border-blue-900/80 sticky top-0 h-screen hidden lg:flex flex-col justify-between items-start z-30 select-none"
    >
      <div className="self-stretch flex flex-col justify-start items-start gap-6">
        {/* Brand */}
        <button
          type="button"
          onClick={() => navigate('/')}
          className="self-stretch inline-flex justify-start items-center gap-3 group text-right cursor-pointer"
        >
          <div className="size-9 bg-[#E5B65C] rounded-[10px] inline-flex flex-col justify-center items-center shadow-[0_0_12px_rgba(229,182,92,0.4)] group-hover:scale-105 transition-transform shrink-0">
            <span className="text-slate-900 text-xl font-black font-['IBM_Plex_Sans_Arabic'] leading-none">
              خ
            </span>
          </div>
          <span className="text-slate-200 text-xl font-bold font-['IBM_Plex_Sans_Arabic'] leading-6 group-hover:text-[#E5B65C] transition-colors">
            أكاديمية خوارزم
          </span>
        </button>

        {/* Nav List */}
        <nav className="self-stretch flex flex-col justify-start items-start gap-2">
          {DASHBOARD_NAV.map((item) => {
            const Icon = item.icon;
            const isActive =
              (item.id === 'main' && (currentView === 'main' || currentView === 'live' || currentView === 'overview' || currentView === 'empty')) ||
              (item.id === 'saved' && currentView === 'saved') ||
              (item.id === 'profile' && currentView === 'profile');

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (item.isExternalRoute) {
                    navigate(item.path as string);
                  } else {
                    onSelectView(item.id);
                  }
                }}
                className={`self-stretch px-3 py-2.5 rounded-xl inline-flex justify-start items-center gap-3 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 outline outline-1 outline-offset-[-1px] outline-[#E5B65C] text-[#E5B65C] font-bold shadow-[0_0_10px_rgba(229,182,92,0.15)]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 font-medium'
                }`}
              >
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
      <div className="self-stretch flex flex-col justify-start items-start gap-4 pt-4 border-t border-blue-900/40">
        <button
          type="button"
          onClick={() => onSelectView('profile')}
          className="self-stretch inline-flex justify-start items-center gap-3 group text-right cursor-pointer"
        >
          <div className="size-10 rounded-full bg-[#061A3A] border border-blue-900 flex items-center justify-center overflow-hidden shrink-0 group-hover:border-sky-400 transition-colors">
            <span className="text-sky-300 font-bold text-sm font-['IBM_Plex_Sans_Arabic']">أغ</span>
          </div>
          <div className="inline-flex flex-col justify-start items-start gap-0.5">
            <span className="text-slate-200 text-sm font-bold font-['Tajawal'] leading-5 group-hover:text-sky-300 transition-colors">
              أحمد الغامدي
            </span>
            <span className="text-slate-400 text-xs font-normal font-['Tajawal'] leading-4">
              طالب متميز
            </span>
          </div>
        </button>

        {/* Notification Bell */}
        <button
          type="button"
          onClick={() => onSelectView('notifications')}
          title="مركز الإشعارات"
          className={`size-10 relative bg-slate-900 rounded-full outline outline-1 outline-offset-[-1px] flex justify-center items-center cursor-pointer transition-all hover:scale-105 ${
            currentView === 'notifications'
              ? 'outline-[#E5B65C] text-[#E5B65C] shadow-[0_0_12px_rgba(229,182,92,0.3)]'
              : 'outline-blue-900 text-[#8299B5] hover:outline-sky-400 hover:text-sky-300'
          }`}
        >
          <Bell size={18} strokeWidth={2} />
          {unreadNotificationsCount > 0 && (
            <div className="px-1.5 py-0.5 -top-1 left-[22px] absolute bg-red-500 rounded-full inline-flex justify-center items-center shadow-sm">
              <span className="text-white text-[10px] font-bold font-['Tajawal'] leading-3">
                {unreadNotificationsCount}
              </span>
            </div>
          )}
        </button>
      </div>
    </aside>
  );
};