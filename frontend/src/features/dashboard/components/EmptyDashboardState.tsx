import React from 'react';
import { useNavigate } from '../../../app/routerContext';

interface EmptyDashboardStateProps {
  userName?: string;
}

export const EmptyDashboardState: React.FC<EmptyDashboardStateProps> = ({
  userName = 'سارة',
}) => {
  const navigate = useNavigate();

  return (
    <div
      dir="rtl"
      data-layer="Empty-State-Card"
      className="EmptyStateCard w-full max-w-[900px] mx-auto p-8 md:p-16 bg-slate-900 rounded-3xl shadow-[0px_16px_32px_0px_rgba(41,169,255,0.06)] outline outline-[1.5px] outline-offset-[-1.5px] outline-blue-900/80 flex flex-col justify-center items-center gap-8 md:gap-10 text-center relative overflow-hidden"
    >
      {/* Visual Illustration Frame matching lines 38-68 of Empty State - Dashboard - Desktop.html */}
      <div
        data-layer="Visual Illustration Frame"
        className="VisualIllustrationFrame size-32 md:size-40 bg-blue-950 rounded-full shadow-[0px_8px_24px_0px_rgba(41,169,255,0.11)] outline outline-2 outline-offset-[-2px] outline-sky-400 flex flex-col justify-center items-center relative"
      >
        <div data-layer="Geometric-Astrolabe" className="GeometricAstrolabe size-20 md:size-24 relative flex items-center justify-center">
          {/* Outer gold ellipse */}
          <div className="size-16 md:size-20 absolute rounded-full border border-orange-300 animate-spin" style={{ animationDuration: '30s' }} />

          {/* Cyan circular orbit */}
          <div className="size-12 md:size-14 absolute rounded-full border-2 border-sky-400/80" />

          {/* Inner atom orbital path */}
          <svg
            width="46"
            height="46"
            viewBox="0 0 55 55"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="absolute animate-spin"
            style={{ animationDuration: '20s', animationDirection: 'reverse' }}
          >
            <path
              d="M30.15 27.23C30.15 28.85 28.85 30.15 27.24 30.15C25.63 30.15 24.32 28.85 24.32 27.23C24.32 25.62 25.63 24.32 27.24 24.32C28.85 24.32 30.15 25.62 30.15 27.23ZM51.15 51.15C57.1 45.23 51.21 29.69 38.03 16.44C24.79 3.26 9.24 -2.63 3.32 3.32C-2.63 9.24 3.26 24.79 16.44 38.03C29.69 51.21 45.23 57.1 51.15 51.15ZM38.03 38.03C51.21 24.79 57.1 9.24 51.15 3.32C45.23 -2.63 29.69 3.26 16.44 16.44C3.26 29.69 -2.63 45.23 3.32 51.15C9.24 57.1 24.79 51.21 38.03 38.03Z"
              stroke="#E5B65C"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>

          {/* Central crosshair reticle */}
          <svg width="32" height="32" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute z-10">
            <path
              d="M36.67 20C36.67 29.21 29.21 36.67 20 36.67M36.67 20C36.67 10.79 29.21 3.33 20 3.33M36.67 20H30M20 36.67C10.79 36.67 3.33 29.21 3.33 20M20 36.67V30M20 3.33C10.79 3.33 3.33 10.79 3.33 20M20 3.33V10M3.33 20H10"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>

      {/* Empty Text Details */}
      <div data-layer="Empty Text details" className="EmptyTextDetails self-stretch flex flex-col justify-start items-center gap-3 md:gap-4">
        <h2
          data-layer="مرحبًا بك يا سارة، ابدئي رحلتك الأولى اليوم!"
          className="self-stretch text-slate-200 text-2xl md:text-3xl font-bold font-['Cairo']"
        >
          <span className="hidden md:inline">مرحبًا بك يا {userName}، ابدئي رحلتك الأولى اليوم!</span>
          <span className="md:hidden">ابدأ رحلتك الأولى</span>
        </h2>
        <p
          data-layer="لوحتكِ التعليمية لا تزال فارغة..."
          className="w-full max-w-[640px] text-slate-400 text-sm md:text-base font-normal font-['Tajawal'] leading-6 md:leading-7"
        >
          لوحتكِ التعليمية لا تزال فارغة وبانتظار خطواتك الأولى للتحدي. استكشفي المنصات التعليمية والمنح الدراسية المموّلة، أو ابدئي مسارًا تدريبيًا يساهم في بناء مهاراتكِ التقنية والمهنية لمستقبل واعد.
        </p>
      </div>

      {/* Action Buttons Row */}
      <div
        data-layer="Action Buttons Row"
        className="ActionButtonsRow self-stretch flex flex-col sm:flex-row justify-center items-center gap-4 md:gap-5"
      >
        <button
          type="button"
          onClick={() => navigate('/catalog?type=courses')}
          data-layer="Explore Courses"
          className="w-full sm:w-72 px-8 py-3.5 md:py-4 bg-sky-400 hover:bg-sky-300 text-slate-900 font-bold font-['Tajawal'] text-base rounded-full flex justify-center items-center cursor-pointer shadow-[0_4px_16px_rgba(41,169,255,0.3)] hover:shadow-[0_4px_24px_rgba(41,169,255,0.5)] transition-all"
        >
          <span className="hidden md:inline">استكشفي الدورات المميزة</span>
          <span className="md:hidden">استكشف الدورات المميزة</span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/catalog?type=scholarships')}
          data-layer="Explore Scholarships"
          className="w-full sm:w-72 px-8 py-3.5 md:py-4 bg-transparent outline outline-2 outline-offset-[-2px] outline-orange-300 hover:bg-orange-300/10 text-orange-300 font-bold font-['Tajawal'] text-base rounded-full flex justify-center items-center cursor-pointer transition-all"
        >
          <span className="hidden md:inline">استكشفي المنح والفرص</span>
          <span className="md:hidden">استكشف المنح والفرص</span>
        </button>
      </div>
    </div>
  );
};
