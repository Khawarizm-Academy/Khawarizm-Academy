import React from 'react';
import { BrandLogo } from '../Artwork/BrandVisuals';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-[#040F24] border-t border-[#1B3F80]/80 pt-16 pb-12 text-[#8299B5] font-['Tajawal'] text-right">
      <div className="max-w-[1280px] mx-auto px-6 sm:px-10">
        
        {/* Main 3-Column Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-[#1B3F80]/60">
          
          {/* Brand Info (Right in RTL, 6 cols) */}
          <div className="md:col-span-6 space-y-4">
            <BrandLogo size={42} textClass="text-2xl font-bold text-[#E5B65C]" />
            <p className="text-sm text-[#8299B5] max-w-md leading-relaxed">
              البوابة العربية الأولى لتمكين قادة المستقبل بالمهارات والفرص التعليمية والمنح الدولية الممولة.
            </p>
          </div>

          {/* Platform Links (3 cols) */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="text-sm font-bold text-[#DCE5EE] font-['IBM_Plex_Sans_Arabic'] mb-4">
              المنصة
            </h4>
            <ul className="space-y-2.5 text-xs text-[#8299B5]">
              <li><a href="#about" className="hover:text-[#E5B65C] transition-colors">عن الأكاديمية</a></li>
              <li><a href="#courses" className="hover:text-[#29A9FF] transition-colors">الدورات المتاحة</a></li>
              <li><a href="#scholarships" className="hover:text-[#E5B65C] transition-colors">منح متميزة</a></li>
            </ul>
          </div>

          {/* Support Links (3 cols) */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="text-sm font-bold text-[#DCE5EE] font-['IBM_Plex_Sans_Arabic'] mb-4">
              الدعم
            </h4>
            <ul className="space-y-2.5 text-xs text-[#8299B5]">
              <li><a href="#help" className="hover:text-[#DCE5EE] transition-colors">مركز المساعدة</a></li>
              <li><a href="#terms" className="hover:text-[#DCE5EE] transition-colors">الشروط والأحكام</a></li>
              <li><a href="#privacy" className="hover:text-[#DCE5EE] transition-colors">سياسة الخصوصية</a></li>
            </ul>
          </div>

        </div>

        {/* Bottom Copyright Strip */}
        <div className="pt-8 flex-between flex-col sm:flex-row text-xs text-[#5C7291] gap-4">
          <p>© 2025 أكاديمية خوارزم. جميع الحقوق محفوظة</p>
          <p className="text-[#8299B5]">صُنع بكل حب لدعم المعرفة والتمكين التقني</p>
        </div>

      </div>
    </footer>
  );
};
