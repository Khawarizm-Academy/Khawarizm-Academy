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

import type { NavTabKey } from '../../../shared/lib/localization';

export const HomePage: React.FC = () => {
  const [activeNavTab, setActiveNavTab] = useState<NavTabKey>('home');
  const [initialLoading, setInitialLoading] = useState<boolean>(true);

  useEffect(() => {
    // Elegant brief observatory preloader entrance
    const timer = setTimeout(() => {
      setInitialLoading(false);
    }, 600);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="page-wrapper">

      {/* Soft Atmospheric Celestial Light Washes — Blends all sections seamlessly into one continuous canvas */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Soft Cyan Aura on Right */}
        <div className="absolute top-[4%] right-[5%] w-[650px] h-[650px] rounded-full bg-[#29A9FF]/[0.045] blur-[140px]" />
        {/* Soft Gold Aura on Left */}
        <div className="absolute top-[20%] left-[5%] w-[550px] h-[550px] rounded-full bg-[#E5B65C]/[0.035] blur-[130px]" />
        {/* Mid-Page Cyan Deep Wash */}
        <div className="absolute top-[50%] right-[10%] w-[600px] h-[600px] rounded-full bg-[#167BDB]/[0.035] blur-[150px]" />
        {/* Lower Gold Aura behind Events */}
        <div className="absolute bottom-[10%] left-[15%] w-[700px] h-[500px] rounded-full bg-[#E5B65C]/[0.03] blur-[160px]" />
      </div>

      {/* Astrolabe Full-Screen Initial Preloader */}
      {initialLoading && (
        <AstrolabeLoader fullScreen message="أكاديمية خوارزم — جاري رصد النجوم والبيانات..." />
      )}

      {/* 1. Header Navigation Shell with Fade-Down Landing Motion */}
      <div className="w-full hidden md:block animate-fade-in-down relative z-20">
        <DesktopNavbar activeTab={activeNavTab} onSelectTab={setActiveNavTab} />
      </div>
      <div className="w-full block md:hidden animate-fade-in-down relative z-20">
        <MobileHeader />
      </div>

      {/* 2. Main Content Container with Staggered Astronomical Landing Sequence */}
      <main className="content-container">

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
      <div className="w-full hidden md:block animate-fade-in-up animation-delay-500 relative z-10">
        <Footer />
      </div>

      {/* 4. Mobile Sticky Bottom Navigation Bar */}
      <div className="block md:hidden relative z-30">
        <MobileBottomBar activeTab={activeNavTab} onSelectTab={setActiveNavTab} />
      </div>

    </div>
  );
};
