import React from 'react';
import { useNavigate } from '../../../app/routerContext';
import { CATALOG_COURSES_ROUTE, CATALOG_SCHOLARSHIPS_ROUTE } from '../../../shared/lib/navigation';
import { HeroSection } from '../components/HeroSection';
import { CompetitionBanner } from '../../../shared/components/Banners/CompetitionBanner';
import { TwinPillarRails } from '../components/TwinPillarRails';
import { EventSection } from '../../../shared/components/Events/EventSection';
import { useCachedData } from '../../../shared/hooks/useCachedData';
import {
  mockCourses,
  mockScholarships,
  mockCompetitionDesktop,
  mockCompetitionMobile,
  mockEventDesktopFeatured,
  mockEventDesktopWorkshop,
  mockEventMobile,
} from '../../../mocks/homepage';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();

  // Cached data fetchers for twin rails
  const { data: coursesData } = useCachedData(
    ['home-featured-courses'],
    async () => mockCourses,
    { initialData: mockCourses, staleTime: 10 * 60 * 1000 }
  );

  const { data: scholarshipsData } = useCachedData(
    ['home-featured-scholarships'],
    async () => mockScholarships,
    { initialData: mockScholarships, staleTime: 10 * 60 * 1000 }
  );

  const handleSearchSubmit = (query: string, type: 'course' | 'scholarship' | 'all') => {
    const resolvedType =
      type === 'course' ? 'courses' : type === 'scholarship' ? 'scholarships' : 'all';
    navigate(`/catalog?type=${resolvedType}&q=${encodeURIComponent(query)}`);
  };

  return (
    <main className="content-container">
      {/* 1. Hero Section with Smart Search */}
      <div className="w-full animate-fade-in-up">
        <div className="hidden md:block w-full">
          <HeroSection variant="desktop" onSearch={handleSearchSubmit} />
        </div>
        <div className="block md:hidden w-full">
          <HeroSection variant="mobile" onSearch={handleSearchSubmit} />
        </div>
      </div>

      {/* 2. Competition Announcement Banner */}
      <div className="w-full animate-fade-in-up animation-delay-100">
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

      {/* 3. Twin Pillar Rails: Featured Courses & Scholarships (Cached) */}
      <div className="w-full animate-fade-in-up animation-delay-200">
        <div className="hidden lg:block w-full">
          <TwinPillarRails
            variant="desktop"
            courses={coursesData || mockCourses}
            scholarships={scholarshipsData || mockScholarships}
            onViewAllCourses={() => navigate(CATALOG_COURSES_ROUTE)}
            onViewAllScholarships={() => navigate(CATALOG_SCHOLARSHIPS_ROUTE)}
          />
        </div>
        <div className="block lg:hidden w-full">
          <TwinPillarRails
            variant="mobile"
            courses={coursesData || mockCourses}
            scholarships={scholarshipsData || mockScholarships}
            onViewAllCourses={() => navigate(CATALOG_COURSES_ROUTE)}
            onViewAllScholarships={() => navigate(CATALOG_SCHOLARSHIPS_ROUTE)}
          />
        </div>
      </div>

      {/* 4. Events & Seminars Section */}
      <div className="w-full animate-fade-in-up animation-delay-300">
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
  );
};
