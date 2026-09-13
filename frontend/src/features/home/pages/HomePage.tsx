import React, { useState, useEffect } from 'react';
import { useNavigate } from '../../../app/routerContext';
import { HeroSection } from '../components/HeroSection';
import { CompetitionBanner } from '../../../shared/components/Banners/CompetitionBanner';
import { TwinPillarRails } from '../components/TwinPillarRails';
import { EventSection } from '../../../shared/components/Events/EventSection';
import { PageSkeleton } from '../../../shared/components/Loading/PageSkeleton';
import { useCachedData } from '../../../shared/hooks/useCachedData';
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
  const navigate = useNavigate();
  const [initialLoading, setInitialLoading] = useState<boolean>(true);

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

  useEffect(() => {
    // Brief observatory preloader entrance for first cold load
    const timer = setTimeout(() => {
      setInitialLoading(false);
    }, 280);

    return () => clearTimeout(timer);
  }, []);

  const handleSearchSubmit = (query: string, type: 'course' | 'scholarship' | 'all') => {
    const resolvedType =
      type === 'course' ? 'courses' : type === 'scholarship' ? 'scholarships' : 'all';
    navigate(`/catalog?type=${resolvedType}&q=${encodeURIComponent(query)}`);
  };

  // If cold initial load, show Tier 1 Full-Page Skeleton
  if (initialLoading) {
    return <PageSkeleton variant="home" />;
  }

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
            onViewAllCourses={() => navigate('/catalog?type=courses')}
            onViewAllScholarships={() => navigate('/catalog?type=scholarships')}
          />
        </div>
        <div className="block lg:hidden w-full">
          <TwinPillarRails
            variant="mobile"
            courses={coursesData || mockCourses}
            scholarships={scholarshipsData || mockScholarships}
            onViewAllCourses={() => navigate('/catalog?type=courses')}
            onViewAllScholarships={() => navigate('/catalog?type=scholarships')}
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
