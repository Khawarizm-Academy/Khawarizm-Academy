import React from 'react';
import { CATALOG_COURSES_ROUTE, CATALOG_SCHOLARSHIPS_ROUTE, COURSE_LANDING_ROUTE } from '@/shared/lib/navigation';
import { CompetitionBanner } from '@/shared/components/Banners/CompetitionBanner';
import { EventSection } from '@/shared/components/Events/EventSection';
import { useHome } from '@/features/home/context/homeContext';
import { HeroSection } from '@/features/home/components/hero/HeroSection';
import { QuickAccessRail } from '@/features/home/components/chrome/QuickAccessRail';
import { TwinPillarRails } from '@/features/home/components/layout/TwinPillarRails';
import { SurfaceSlot } from '@/features/home/components/layout/SurfaceSlot';

/** All five home sections, each mounting both surfaces through one SurfaceSlot. */
export const HomeContent: React.FC = () => {
  const {
    coursesData,
    scholarshipsData,
    quickLinks,
    competitionMobile,
    competitionDesktop,
    eventMobile,
    eventDesktopFeatured,
    eventDesktopWorkshop,
    navigateTo,
    submitSearch,
  } = useHome();

  return (
    <main className="content-container">
      {/* 1. Hero Section with Smart Search */}
      <div className="w-full animate-fade-in-up">
        <SurfaceSlot
          breakpoint="md"
          desktop={<HeroSection variant="desktop" onSearch={submitSearch} />}
          mobile={<HeroSection variant="mobile" onSearch={submitSearch} />}
        />
      </div>

      {/* 2. Fast-access shortcuts into the dashboard and catalog pillars */}
      <div className="w-full animate-fade-in-up animation-delay-100">
        <QuickAccessRail links={quickLinks} onNavigate={navigateTo} />
      </div>

      {/* 3. Competition Announcement Banner */}
      <div className="w-full animate-fade-in-up animation-delay-200">
        <SurfaceSlot
          breakpoint="md"
          desktop={
            <CompetitionBanner
              variant="desktop"
              competition={competitionDesktop}
              onRegister={() => alert('تم فتح نافذة التسجيل في تحدي الخوارزميات السنوي!')}
            />
          }
          mobile={
            <CompetitionBanner
              variant="mobile"
              competition={competitionMobile}
              onRegister={() => alert('تم فتح نافذة التسجيل في تحدي الخوارزميات الشتوي!')}
            />
          }
        />
      </div>

      {/* 4. Twin Pillar Rails: Featured Courses & Scholarships (Cached) */}
      <div className="w-full animate-fade-in-up animation-delay-300">
        <SurfaceSlot
          breakpoint="lg"
          desktop={
            <TwinPillarRails
              variant="desktop"
              courses={coursesData}
              scholarships={scholarshipsData}
              onViewAllCourses={() => navigateTo(CATALOG_COURSES_ROUTE)}
              onViewAllScholarships={() => navigateTo(CATALOG_SCHOLARSHIPS_ROUTE)}
              onCourseDetails={(course) => navigateTo(COURSE_LANDING_ROUTE(course.id))}
            />
          }
          mobile={
            <TwinPillarRails
              variant="mobile"
              courses={coursesData}
              scholarships={scholarshipsData}
              onViewAllCourses={() => navigateTo(CATALOG_COURSES_ROUTE)}
              onViewAllScholarships={() => navigateTo(CATALOG_SCHOLARSHIPS_ROUTE)}
              onCourseDetails={(course) => navigateTo(COURSE_LANDING_ROUTE(course.id))}
            />
          }
        />
      </div>

      {/* 5. Events & Seminars Section */}
      <div className="w-full animate-fade-in-up animation-delay-400">
        <SurfaceSlot
          breakpoint="lg"
          desktop={
            <EventSection
              variant="desktop"
              featuredEvent={eventDesktopFeatured}
              workshopEvent={eventDesktopWorkshop}
            />
          }
          mobile={<EventSection variant="mobile" featuredEvent={eventMobile} />}
        />
      </div>
    </main>
  );
};