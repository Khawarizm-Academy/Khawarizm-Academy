import React, { useState } from 'react';

interface MobileHeaderProps {
  onMenuToggle?: () => void;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({ onMenuToggle }) => {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleToggle = () => {
    setDrawerOpen(!drawerOpen);
    onMenuToggle?.();
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full h-16 bg-[#040F24]/90 backdrop-blur-md border-b border-[#1B3F80] px-5 flex items-center justify-between shadow-[0_2px_15px_rgba(0,0,0,0.4)]">
        {/* Brand Name on the Left/Start per design screenshot */}
        <div className="flex items-center gap-2">
          <span className="text-base sm:text-lg font-bold text-[#E5B65C] font-['IBM_Plex_Sans_Arabic'] tracking-tight">
            أكاديمية خوارزم
          </span>
        </div>

        {/* Hamburger Menu Button on the Right */}
        <button
          onClick={handleToggle}
          aria-label="القائمة الرئيسية"
          className="p-2 rounded-lg text-[#C5C6CD] hover:text-white hover:bg-[#092557] transition-colors cursor-pointer"
        >
          <svg width="22" height="16" viewBox="0 0 18 12" fill="none">
            <path d="M0 12V10H18V12H0ZM0 7V5H18V7H0ZM0 2V0H18V2H0Z" fill="currentColor" />
          </svg>
        </button>
      </header>

      {/* Slide-out Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 bg-[#040F24]/80 backdrop-blur-sm flex flex-col justify-start">
          <div className="w-full bg-[#061A3A] border-b border-[#1B3F80] p-6 shadow-2xl animate-in slide-in-from-top duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-[#1B3F80]">
              <span className="text-lg font-bold text-[#E5B65C]">أكاديمية خوارزم</span>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1.5 text-[#8299B5] hover:text-white rounded-lg"
              >
                ✕
              </button>
            </div>
            <nav className="py-4 space-y-3 text-right font-['Tajawal'] text-base">
              <a href="#hero" onClick={() => setDrawerOpen(false)} className="block py-2 text-[#E5B65C] font-bold">الرئيسية</a>
              <a href="#courses" onClick={() => setDrawerOpen(false)} className="block py-2 text-[#DCE5EE] hover:text-[#29A9FF]">الدورات التدريبية</a>
              <a href="#scholarships" onClick={() => setDrawerOpen(false)} className="block py-2 text-[#DCE5EE] hover:text-[#E5B65C]">المنح والفرص</a>
              <a href="#events" onClick={() => setDrawerOpen(false)} className="block py-2 text-[#DCE5EE] hover:text-[#29A9FF]">الفعاليات والندوات</a>
              <a href="#competitions" onClick={() => setDrawerOpen(false)} className="block py-2 text-[#DCE5EE] hover:text-[#E5B65C]">المسابقات والتحديات</a>
            </nav>
          </div>
        </div>
      )}
    </>
  );
};
