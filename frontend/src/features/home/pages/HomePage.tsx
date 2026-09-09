import React, { useState } from 'react';
import { DesktopNavbar } from '../../../shared/components/Navbar/DesktopNavbar';
import { MobileHeader } from '../../../shared/components/Navbar/MobileHeader';
import { MobileBottomBar } from '../../../shared/components/BottomNav/MobileBottomBar';
import { Footer } from '../../../shared/components/Footer/Footer';
import { HeroSection } from '../components/HeroSection';
import { CompetitionBanner } from '../../../shared/components/Banners/CompetitionBanner';
import { TwinPillarRails } from '../components/TwinPillarRails';
import { EventSection } from '../../../shared/components/Events/EventSection';
import { ViewportToggle, type ViewportMode } from '../components/ViewportToggle';
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
  const [viewportMode, setViewportMode] = useState<ViewportMode>('responsive');
  const [activeNavTab, setActiveNavTab] = useState<string>('الرئيسية');

  // Helper boolean flags based on viewportMode
  const isForcedDesktop = viewportMode === 'desktop';
  const isForcedMobile = viewportMode === 'mobile';

  return (
    <div className="min-h-screen bg-[#040F24] text-[#DCE5EE] flex flex-col items-center relative overflow-x-hidden selection:bg-[#E5B65C]/30 selection:text-[#E5B65C]">
      
      {/* Viewport Switcher Floating Controls */}
      <ViewportToggle
        currentMode={viewportMode}
        onChangeMode={(mode) => setViewportMode(mode)}
      />

      {/* Frame Container for Forced Mobile Mode */}
      <div
        className={`w-full transition-all duration-300 flex flex-col items-center ${
          isForcedMobile
            ? 'max-w-[430px] my-6 rounded-[32px] overflow-hidden border-2 border-[#1B3F80] shadow-[0_0_50px_rgba(0,0,0,0.8)] bg-[#040F24]'
            : isForcedDesktop
            ? 'min-w-[1280px] max-w-[1440px]'
            : 'w-full'
        }`}
      >
        {/* Navigation Shell */}
        {isForcedMobile ? (
          <MobileHeader />
        ) : isForcedDesktop ? (
          <DesktopNavbar activeTab={activeNavTab} onSelectTab={setActiveNavTab} />
        ) : (
          <>
            <div className="w-full hidden md:block">
              <DesktopNavbar activeTab={activeNavTab} onSelectTab={setActiveNavTab} />
            </div>
            <div className="w-full block md:hidden">
              <MobileHeader />
            </div>
          </>
        )}

        {/* Main Content Area */}
        <main
          className={`w-full flex flex-col items-center ${
            isForcedMobile
              ? 'px-4 pb-28 pt-2 gap-8'
              : isForcedDesktop
              ? 'max-w-[1280px] px-8 pb-20 pt-4 gap-14'
              : 'max-w-[1280px] px-4 sm:px-8 pb-28 md:pb-20 pt-2 md:pt-4 gap-8 md:gap-14'
          }`}
        >
          {/* 1. Hero Section + Smart Search Box */}
          <div className="w-full">
            {isForcedMobile ? (
              <HeroSection variant="mobile" />
            ) : isForcedDesktop ? (
              <HeroSection variant="desktop" />
            ) : (
              <>
                <div className="hidden md:block w-full">
                  <HeroSection variant="desktop" />
                </div>
                <div className="block md:hidden w-full">
                  <HeroSection variant="mobile" />
                </div>
              </>
            )}
          </div>

          {/* 2. Competitions Announcement Banner */}
          <div className="w-full">
            {isForcedMobile ? (
              <CompetitionBanner
                variant="mobile"
                competition={mockCompetitionMobile}
                onRegister={() => alert('تم فتح نافذة التسجيل في تحدي الخوارزميات الشتوي!')}
              />
            ) : isForcedDesktop ? (
              <CompetitionBanner
                variant="desktop"
                competition={mockCompetitionDesktop}
                onRegister={() => alert('تم فتح نافذة التسجيل في تحدي الخوارزميات السنوي!')}
              />
            ) : (
              <>
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
              </>
            )}
          </div>

          {/* 3. Twin Pillar Rails: Featured Courses & Available Scholarships */}
          <div className="w-full">
            {isForcedMobile ? (
              <TwinPillarRails
                variant="mobile"
                courses={mockCourses}
                scholarships={mockScholarships}
              />
            ) : isForcedDesktop ? (
              <TwinPillarRails
                variant="desktop"
                courses={mockCourses}
                scholarships={mockScholarships}
              />
            ) : (
              <>
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
              </>
            )}
          </div>

          {/* 4. Events & Seminars Section */}
          <div className="w-full">
            {isForcedMobile ? (
              <EventSection
                variant="mobile"
                featuredEvent={mockEventMobile}
              />
            ) : isForcedDesktop ? (
              <EventSection
                variant="desktop"
                featuredEvent={mockEventDesktopFeatured}
                workshopEvent={mockEventDesktopWorkshop}
              />
            ) : (
              <>
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
              </>
            )}
          </div>
        </main>

        {/* Footer (Desktop & Responsive) */}
        {!isForcedMobile && (
          <div className="w-full">
            <Footer />
          </div>
        )}

        {/* Mobile Bottom Navigation Bar (Rendered on mobile or forced mobile) */}
        {isForcedMobile ? (
          <MobileBottomBar activeTab={activeNavTab} onSelectTab={setActiveNavTab} />
        ) : !isForcedDesktop ? (
          <div className="block md:hidden">
            <MobileBottomBar activeTab={activeNavTab} onSelectTab={setActiveNavTab} />
          </div>
        ) : null}

      </div>
    </div>
  );
};
