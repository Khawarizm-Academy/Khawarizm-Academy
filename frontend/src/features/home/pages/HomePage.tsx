import React, { useState, useEffect } from 'react';
import { useNavigate } from '../../../app/router';
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
  const navigate = useNavigate();
  const [activeNavTab, setActiveNavTab] = useState<NavTabKey>('home');
  const [initialLoading, setInitialLoading] = useState<boolean>(true);

  useEffect(() => {
    // Brief observatory preloader entrance
    const timer = setTimeout(() => {
      setInitialLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const handleNavSelect = (tab: NavTabKey) => {
    setActiveNavTab(tab);
    if (tab === 'courses') {
      navigate('/catalog?type=courses');
    } else if (tab === 'scholarships') {
      navigate('/catalog?type=scholarships');
    } else if (tab === 'catalog') {
      navigate('/catalog');
    }
  };

  const handleSearchSubmit = (query: string, type: 'course' | 'scholarship' | 'all') => {
    const resolvedType =
      type === 'course' ? 'courses' : type === 'scholarship' ? 'scholarships' : 'all';
    navigate(`/catalog?type=${resolvedType}&q=${encodeURIComponent(query)}`);
  };

  return (
    <div className="page-wrapper">

      {/* Soft Atmospheric Celestial Light Washes */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[4%] right-[5%] w-[650px] h-[650px] rounded-full bg-[#29A9FF]/[0.045] blur-[140px]" />
        <div className="absolute top-[20%] left-[5%] w-[550px] h-[550px] rounded-full bg-[#E5B65C]/[0.035] blur-[130px]" />
        <div className="absolute top-[50%] right-[10%] w-[600px] h-[600px] rounded-full bg-[#167BDB]/[0.035] blur-[150px]" />
        <div className="absolute bottom-[10%] left-[15%] w-[700px] h-[500px] rounded-full bg-[#E5B65C]/[0.03] blur-[160px]" />
      </div>

      {/* Astrolabe Full-Screen Initial Preloader */}
      {initialLoading && (
        <AstrolabeLoader fullScreen message="أكاديمية خوارزم — جاري رصد النجوم والبيانات..." />
      )}

      {/* 1. Header Navigation Shell */}
      <div className="w-full hidden md:block animate-fade-in-down relative z-20">
        <DesktopNavbar activeTab={activeNavTab} onSelectTab={handleNavSelect} />
      </div>
      <div className="w-full block md:hidden animate-fade-in-down relative z-20">
        <MobileHeader onLogoClick={() => setActiveNavTab('home')} />
      </div>

      {/* 2. Main Content Container */}
      <main className="content-container">

        {/* 2.1 Hero Section with Smart Search */}
        <div className="w-full animate-fade-in-up animation-delay-100">
          <div className="hidden md:block w-full">
            <HeroSection variant="desktop" onSearch={handleSearchSubmit} />
          </div>
          <div className="block md:hidden w-full">
            <HeroSection variant="mobile" onSearch={handleSearchSubmit} />
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
              onViewAllCourses={() => navigate('/catalog?type=courses')}
              onViewAllScholarships={() => navigate('/catalog?type=scholarships')}
            />
          </div>
          <div className="block lg:hidden w-full">
            <TwinPillarRails
              variant="mobile"
              courses={mockCourses}
              scholarships={mockScholarships}
              onViewAllCourses={() => navigate('/catalog?type=courses')}
              onViewAllScholarships={() => navigate('/catalog?type=scholarships')}
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
        <MobileBottomBar activeTab={activeNavTab} onSelectTab={handleNavSelect} />
      </div>

    </div>
  );
};
