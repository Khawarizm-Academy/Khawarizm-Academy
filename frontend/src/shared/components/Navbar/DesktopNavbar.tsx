import React from 'react';
import { BrandLogo } from '../Artwork/BrandVisuals';

interface DesktopNavbarProps {
  activeTab?: string;
  onSelectTab?: (tab: string) => void;
}

export const DesktopNavbar: React.FC<DesktopNavbarProps> = ({
  activeTab = 'الرئيسية',
  onSelectTab,
}) => {
  const navLinks = [
    { id: 'home', label: 'الرئيسية' },
    { id: 'courses', label: 'الدورات' },
    { id: 'scholarships', label: 'المنح والفرص' },
    { id: 'events', label: 'الفعاليات' },
    { id: 'competitions', label: 'المسابقات' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full h-16 bg-[#040F24]/90 backdrop-blur-md border-b border-[#1B3F80] shadow-[0_0_15px_rgba(41,169,255,0.10)] transition-all">
      <div className="max-w-[1280px] h-full mx-auto px-6 sm:px-10 flex items-center justify-between">
        
        {/* Right (Start in RTL): Brand Logo */}
        <div className="flex items-center">
          <BrandLogo size={42} textClass="text-xl font-bold text-[#E5B65C]" />
        </div>

        {/* Center: Navigation Links */}
        <nav className="flex items-center gap-8 text-sm font-['Tajawal'] font-medium">
          {navLinks.map((link) => {
            const isActive = activeTab === link.label;
            return (
              <button
                key={link.id}
                onClick={() => onSelectTab?.(link.label)}
                className={`relative py-5 px-1 transition-colors cursor-pointer ${
                  isActive
                    ? 'text-[#E5B65C] font-bold drop-shadow-[0_0_8px_rgba(229,182,92,0.4)]'
                    : 'text-[#8299B5] hover:text-[#DCE5EE]'
                }`}
              >
                <span>{link.label}</span>
                {isActive && (
                  <div
                    className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#E5B65C] rounded-full"
                    style={{
                      boxShadow: '0 0 10px #E5B65C, 0 0 20px rgba(229, 182, 92, 0.6)',
                    }}
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Left (End in RTL): Actions & Profile */}
        <div className="flex items-center gap-3.5">
          {/* Search Button */}
          <button
            aria-label="بحث في المنصة"
            className="w-9 h-9 rounded-2xl bg-[#092557]/80 hover:bg-[#123168] border border-[#1B3F80] hover:border-[#29A9FF]/50 text-[#DCE5EE] hover:text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-sm"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <ellipse cx="12" cy="5" rx="9" ry="3" />
              <path d="M3 5v14a9 3 0 0 0 18 0V5" />
              <path d="M3 12a9 3 0 0 0 18 0" />
            </svg>
          </button>

          {/* Notifications Bell with Unread Badge */}
          <button
            aria-label="الإشعارات"
            className="w-9 h-9 rounded-2xl bg-[#092557]/80 hover:bg-[#123168] border border-[#1B3F80] hover:border-[#29A9FF]/50 text-[#DCE5EE] hover:text-white flex items-center justify-center relative transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-sm"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#D9534F] ring-2 ring-[#040F24]" />
          </button>

          {/* User Profile Avatar */}
          <button
            aria-label="الملف الشخصي"
            className="w-10 h-10 rounded-full bg-[#061A3A] border border-[#1B3F80] hover:border-[#29A9FF]/60 hover:shadow-[0_0_12px_rgba(41,169,255,0.3)] flex items-center justify-center text-[#8299B5] hover:text-[#DCE5EE] transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </button>
        </div>

      </div>
    </header>
  );
};
