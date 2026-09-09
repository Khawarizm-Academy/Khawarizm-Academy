import React, { useState, useEffect } from 'react';
import { DesktopNavbar } from '../../../shared/components/Navbar/DesktopNavbar';
import { MobileHeader } from '../../../shared/components/Navbar/MobileHeader';
import { MobileBottomBar } from '../../../shared/components/BottomNav/MobileBottomBar';
import { Footer } from '../../../shared/components/Footer/Footer';
import { HeroSection } from '../components/HeroSection';
import { CompetitionBanner } from '../../../shared/components/Banners/CompetitionBanner';
import { TwinPillarRails } from '../components/TwinPillarRails';
import { EventSection } from '../../../shared/components/Events/EventSection';
import { AstrolabeLoader } from '../../../shared/components/Loading/AstrolabeLoader';
import {
  mockCourses,
  mockScholarships,
  mockCompetitionDesktop,
  mockCompetitionMobile,
  mockEventDesktopFeatured,
  mockEventDesktopWorkshop,
  mockEventMobile,
} from '../../../shared/data/mockHomepageData';

export const HomePage: React.FC = () => {
  const [activeNavTab, setActiveNavTab] = useState<string>('الرئيسية');
  const [initialLoading, setInitialLoading] = useState<boolean>(true);

  useEffect(() => {
    // Elegant brief observatory preloader entrance
    const timer = setTimeout(() => {
      setInitialLoading(false);
    }, 600);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[#040F24] text-[#DCE5EE] flex flex-col items-center relative overflow-x-hidden selection:bg-[#E5B65C]/30 selection:text-[#E5B65C]">
      
      {/* Astrolabe Full-Screen Initial Preloader */}
      {initialLoading && (
        <AstrolabeLoader fullScreen message="أكاديمية خوارزم — جاري رصد النجوم والبيانات..." />
      )}

      {/* 1. Header Navigation Shell with Fade-Down Landing Motion */}
      <div className="w-full hidden md:block animate-fade-in-down">
        <DesktopNavbar activeTab={activeNavTab} onSelectTab={setActiveNavTab} />
      </div>
      <div className="w-full block md:hidden animate-fade-in-down">
        <MobileHeader />
      </div>

      {/* 2. Main Content Container with Staggered Astronomical Landing Sequence */}
      <main className="w-full max-w-[1280px] mx-auto px-4 sm:px-8 pb-28 md:pb-20 pt-2 md:pt-4 flex flex-col gap-8 md:gap-14">
        
        {/* 2.1 Hero Section with Smart Search */}
        <div className="w-full animate-fade-in-up animation-delay-100">
          <div className="hidden md:block w-full">
            <HeroSection variant="desktop" />
          </div>
          <div className="block md:hidden w-full">
            <HeroSection variant="mobile" />
          </div>
        </div>

        {/* 2.2 Competition Announcement Banner */}
        <div className="w-full animate-fade-in-up animation-delay-200">
          <div className="hidden md:block w-full">
            <CompetitionBanner
              variant="desktop"
              competition={mockCompetitionDesktop}
              onRegister={() => alert('تم فتح نافذة التسجيل في تحدي الخوارزميات السنوي!')}
            />
          </div>
          <div className="block md:hidden w-full">
            <CompetitionBanner
              variant="mobile"
              competition={mockCompetitionMobile}
              onRegister={() => alert('تم فتح نافذة التسجيل في تحدي الخوارزميات الشتوي!')}
            />
          </div>
        </div>

        {/* 2.3 Twin Pillar Rails: Featured Courses & Scholarships */}
        <div className="w-full animate-fade-in-up animation-delay-300">
          <div className="hidden lg:block w-full">
            <TwinPillarRails
              variant="desktop"
              courses={mockCourses}
              scholarships={mockScholarships}
            />
          </div>
          <div className="block lg:hidden w-full">
            <TwinPillarRails
              variant="mobile"
              courses={mockCourses}
              scholarships={mockScholarships}
            />
          </div>
        </div>

        {/* 2.4 Events & Seminars Section */}
        <div className="w-full animate-fade-in-up animation-delay-400">
          <div className="hidden lg:block w-full">
            <EventSection
              variant="desktop"
              featuredEvent={mockEventDesktopFeatured}
              workshopEvent={mockEventDesktopWorkshop}
            />
          </div>
          <div className="block lg:hidden w-full">
            <EventSection
              variant="mobile"
              featuredEvent={mockEventMobile}
            />
          </div>
        </div>
      </main>

      {/* 3. Footer (Desktop & Tablet) */}
      <div className="w-full hidden md:block animate-fade-in-up animation-delay-500">
        <Footer />
      </div>

      {/* 4. Mobile Sticky Bottom Navigation Bar */}
      <div className="block md:hidden">
        <MobileBottomBar activeTab={activeNavTab} onSelectTab={setActiveNavTab} />
      </div>

    </div>
  );
};
