import React from 'react';
import { Compass } from 'lucide-react';
import { useNavigate } from '../../../app/routerContext';
import { CATALOG_COURSES_ROUTE, CATALOG_SCHOLARSHIPS_ROUTE } from '../../../shared/lib/navigation';

interface EmptyDashboardStateProps {
  userName?: string;
  onExploreCourses?: () => void;
  onExploreScholarships?: () => void;
}

export const EmptyDashboardState: React.FC<EmptyDashboardStateProps> = ({
  userName = 'سارة',
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
    <div
      dir="rtl"
      className="w-full max-w-[900px] mx-auto p-6 md:p-16 bg-slate-900 rounded-2xl md:rounded-3xl shadow-[0px_16px_32px_0px_rgba(41,169,255,0.06)] outline outline-1 md:outline-[1.50px] outline-offset-[-1.50px] outline-blue-900 flex flex-col justify-center items-center gap-6 md:gap-10 text-center relative overflow-hidden"
    >
      {/* Celestial Compass Illustration */}
      <div className="size-24 md:size-40 bg-blue-950 rounded-full shadow-[0px_4px_16px_0px_rgba(41,169,255,0.10)] outline outline-2 outline-offset-[-2px] outline-sky-400 flex items-center justify-center relative">
        <div className="absolute inset-3 rounded-full border border-orange-300/60 animate-spin" style={{ animationDuration: '30s' }} />
        <div className="absolute inset-6 rounded-full border border-sky-400/60 animate-spin" style={{ animationDuration: '24s', animationDirection: 'reverse' }} />
        <Compass size={40} className="text-sky-400 md:size-16" />
      </div>

      {/* Text Content */}
      <div className="flex flex-col items-center gap-2 md:gap-4">
        <h2 className="text-center text-slate-200 text-xl md:text-3xl font-bold font-['IBM_Plex_Sans_Arabic']">
          مرحبًا بك يا {userName}، ابدئي رحلتك الأولى اليوم!
        </h2>
        <p className="text-center text-slate-400 text-sm md:text-base font-normal font-['Tajawal'] leading-5 md:leading-7 max-w-[640px]">
          لوحتكِ التعليمية لا تزال فارغة وبانتظار خطواتك الأولى للتحدي. استكشفي المنصات التعليمية
          والمنح الدراسية المموّلة، أو ابدئي مسارًا تدريبيًا يساهم في بناء مهاراتكِ التقنية
          والمهنية لمستقبل واعد.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="self-stretch md:self-auto flex flex-col md:flex-row justify-center items-center gap-3 md:gap-5">
        <button
          type="button"
          onClick={handleCoursesClick}
          className="w-full md:w-72 px-8 py-3 md:py-4 bg-sky-400 hover:bg-sky-300 text-slate-900 rounded-full font-bold font-['Tajawal'] text-sm md:text-base transition-all flex justify-center items-center cursor-pointer shadow-[0_4px_16px_rgba(41,169,255,0.25)] hover:shadow-[0_4px_24px_rgba(41,169,255,0.4)]"
        >
          استكشفي الدورات المميزة
        </button>

        <button
          type="button"
          onClick={handleScholarshipsClick}
          className="w-full md:w-72 px-8 py-3 md:py-4 bg-transparent rounded-full outline outline-2 outline-offset-[-2px] outline-orange-300 hover:bg-orange-300/10 text-orange-300 font-bold font-['Tajawal'] text-sm md:text-base transition-all flex justify-center items-center cursor-pointer"
        >
          استكشفي المنح والفرص
        </button>
      </div>
    </div>
  );
};