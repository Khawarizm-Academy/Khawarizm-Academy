import React from 'react';
import { Compass } from 'lucide-react';
import { useNavigate } from '@/app/routerContext';
import { CATALOG_COURSES_ROUTE, CATALOG_SCHOLARSHIPS_ROUTE } from '@/shared/lib/navigation';

interface EmptyDashboardStateProps {
  /** The real signed-in learner's first name, so the welcome never invents one. */
  userName: string;
  onExploreCourses?: () => void;
  onExploreScholarships?: () => void;
}

export const EmptyDashboardState: React.FC<EmptyDashboardStateProps> = ({
  userName,
  onExploreCourses,
  onExploreScholarships,
}) => {
  const navigate = useNavigate();

  const handleCoursesClick = () => {
    if (onExploreCourses) {
      onExploreCourses();
    } else {
      navigate(CATALOG_COURSES_ROUTE);
    }
  };

  const handleScholarshipsClick = () => {
    if (onExploreScholarships) {
      onExploreScholarships();
    } else {
      navigate(CATALOG_SCHOLARSHIPS_ROUTE);
    }
  };

  return (
    <div dir="rtl" className="dash-empty-hero">
      {/* Celestial compass illustration */}
      <div className="dash-empty-compass">
        <div
          className="absolute inset-3 rounded-full border border-gold-400/60 animate-spin"
          style={{ animationDuration: '30s' }}
        />
        <div
          className="absolute inset-6 rounded-full border border-blue-400/60 animate-spin"
          style={{ animationDuration: '24s', animationDirection: 'reverse' }}
        />
        <Compass size={40} className="text-blue-400 md:size-16" />
      </div>

      {/* Text content */}
      <div className="flex flex-col items-center gap-2 md:gap-4">
        <h2 className="dash-empty-hero-title">مرحبًا بك يا {userName}، ابدئي رحلتك الأولى اليوم!</h2>
        <p className="dash-empty-hero-text">
          لوحتكِ التعليمية لا تزال فارغة وبانتظار خطواتك الأولى للتحدي. استكشفي المنصات التعليمية
          والمنح الدراسية المموّلة، أو ابدئي مسارًا تدريبيًا يساهم في بناء مهاراتكِ التقنية
          والمهنية لمستقبل واعد.
        </p>
      </div>

      {/* Action buttons */}
      <div className="self-stretch md:self-auto flex flex-col md:flex-row justify-center items-center gap-3 md:gap-5">
        <button
          type="button"
          onClick={handleCoursesClick}
          className="dash-empty-btn dash-empty-btn-primary"
        >
          استكشفي الدورات المميزة
        </button>

        <button
          type="button"
          onClick={handleScholarshipsClick}
          className="dash-empty-btn dash-empty-btn-ghost"
        >
          استكشفي المنح والفرص
        </button>
      </div>
    </div>
  );
};
