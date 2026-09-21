import React from 'react';
import { useNavigate } from '../../../app/routerContext';

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
      navigate('/catalog?type=courses');
    }
  };

  const handleScholarshipsClick = () => {
    if (onExploreScholarships) {
      onExploreScholarships();
    } else {
      navigate('/catalog?type=scholarships');
    }
  };

  return (
    <div
      dir="rtl"
      data-layer="Empty-State-Card"
      className="EmptyStateCard w-full max-w-[900px] mx-auto p-6 md:p-16 bg-slate-900 rounded-2xl md:rounded-3xl shadow-[0px_16px_32px_0px_rgba(41,169,255,0.06)] outline outline-1 md:outline-[1.50px] outline-offset-[-1.50px] outline-blue-900 flex flex-col justify-center items-center gap-6 md:gap-10 text-center relative overflow-hidden"
    >
      {/* 1. Illustration Container */}
      {/* 1A. Mobile Illustration: Compass / Circle-X Box matching Empty State - Dashboard - Mobile.html */}
      <div
        data-layer="Compass Illustration Box"
        className="CompassIllustrationBox size-24 bg-blue-950 rounded-full shadow-[0px_4px_16px_0px_rgba(41,169,255,0.10)] outline outline-2 outline-offset-[-2px] outline-sky-400 flex md:hidden flex-col justify-center items-center"
      >
        <div data-svg-wrapper data-layer="circle-x" className="CircleX relative">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M30.0005 17.9997L17.9995 30.0006M17.9995 17.9997L30.0005 30.0006M44.0016 24.0001C44.0016 35.0467 35.0466 44.0017 24 44.0017C12.9534 44.0017 3.99841 35.0467 3.99841 24.0001C3.99841 12.9536 12.9534 3.99854 24 3.99854C35.0466 3.99854 44.0016 12.9536 44.0016 24.0001Z"
              stroke="#E5B65C"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>

      {/* 1B. Desktop Illustration: Geometric Astrolabe Frame matching Empty State - Dashboard - Desktop.html */}
      <div
        data-layer="Visual Illustration Frame"
        className="VisualIllustrationFrame size-40 bg-blue-950 rounded-full shadow-[0px_8px_24px_0px_rgba(41,169,255,0.11)] outline outline-2 outline-offset-[-2px] outline-sky-400 hidden md:flex flex-col justify-center items-center"
      >
        <div data-layer="Geometric-Astrolabe" className="GeometricAstrolabe size-24 relative">
          {/* Gold outer ellipse */}
          <div
            data-layer="Ellipse"
            className="Ellipse size-20 left-[10px] top-[10px] absolute bg-white/0 rounded-full border border-orange-300 animate-spin"
            style={{ animationDuration: '30s' }}
          />

          {/* Cyan circular orbit */}
          <div data-svg-wrapper data-layer="Ellipse" className="Ellipse left-[25px] top-[25px] absolute">
            <svg width="50" height="50" viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="25" cy="25" r="24" fill="white" fillOpacity="0.01" stroke="#29A9FF" strokeWidth="2" />
            </svg>
          </div>

          {/* Gold atom orbital vector */}
          <div data-layer="atom" className="Atom size-16 left-[15px] top-[15px] absolute overflow-hidden">
            <div data-svg-wrapper data-layer="Vector" className="Vector left-[8.76px] top-[8.76px] absolute">
              <svg
                width="55"
                height="55"
                viewBox="0 0 55 55"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="animate-spin"
                style={{ animationDuration: '24s', animationDirection: 'reverse' }}
              >
                <path
                  d="M30.1529 27.2349C30.1529 28.8457 28.8471 30.1515 27.2363 30.1515C25.6256 30.1515 24.3198 28.8457 24.3198 27.2349C24.3198 25.6241 25.6256 24.3183 27.2363 24.3183C28.8471 24.3183 30.1529 25.6241 30.1529 27.2349ZM51.1519 51.1519C57.1017 45.2312 51.2102 29.6859 38.0273 16.4447C24.7861 3.26178 9.24075 -2.6297 3.32011 3.32011C-2.6297 9.24075 3.26178 24.7861 16.4447 38.0273C29.6859 51.2102 45.2312 57.1017 51.1519 51.1519ZM38.0273 38.0273C51.2102 24.7861 57.1017 9.24075 51.1519 3.32011C45.2312 -2.6297 29.6859 3.26178 16.4447 16.4447C3.26178 29.6859 -2.6297 45.2312 3.32011 51.1519C9.24075 57.1017 24.7861 51.2102 38.0273 38.0273Z"
                  stroke="#E5B65C"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>

          {/* Central crosshair reticle */}
          <div data-svg-wrapper data-layer="crosshair" className="Crosshair left-[30px] top-[30px] absolute">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M36.668 20C36.668 29.2055 29.2055 36.668 20 36.668M36.668 20C36.668 10.7945 29.2055 3.33203 20 3.33203M36.668 20H30.0008M20 36.668C10.7945 36.668 3.33197 29.2055 3.33197 20M20 36.668V30.0008M20 3.33203C10.7945 3.33203 3.33197 10.7945 3.33197 20M20 3.33203V9.99923M3.33197 20H9.99917"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* 2. Text Content Details */}
      {/* 2A. Mobile Text */}
      <div data-layer="Empty Text details" className="EmptyTextDetails self-stretch flex md:hidden flex-col justify-start items-center gap-2">
        <h2
          data-layer="ابدأ رحلتك الأولى"
          className="text-center text-slate-200 text-xl font-bold font-['Cairo']"
        >
          ابدأ رحلتك الأولى
        </h2>
        <p
          data-layer="لوحتك التعليمية لا زالت فارغة..."
          className="self-stretch text-center text-slate-400 text-sm font-normal font-['Tajawal'] leading-5"
        >
          لوحتك التعليمية لا زالت فارغة. استكشف المنصات والمنح الممولة، أو ابدأ دورة تدريبية تساهم في بناء مهاراتك التقنية لمستقبل واعد.
        </p>
      </div>

      {/* 2B. Desktop Text */}
      <div data-layer="Empty Text details" className="EmptyTextDetails self-stretch hidden md:flex flex-col justify-start items-center gap-4">
        <h2
          data-layer="مرحبًا بك يا سارة، ابدئي رحلتك الأولى اليوم!"
          className="self-stretch text-center text-slate-200 text-3xl font-bold font-['Cairo']"
        >
          مرحبًا بك يا {userName}، ابدئي رحلتك الأولى اليوم!
        </h2>
        <p
          data-layer="لوحتكِ التعليمية لا تزال فارغة..."
          className="w-full max-w-[640px] text-center text-slate-400 text-base font-normal font-['Tajawal'] leading-7"
        >
          لوحتكِ التعليمية لا تزال فارغة وبانتظار خطواتك الأولى للتحدي. استكشفي المنصات التعليمية والمنح الدراسية المموّلة، أو ابدئي مسارًا تدريبيًا يساهم في بناء مهاراتكِ التقنية والمهنية لمستقبل واعد.
        </p>
      </div>

      {/* 3. Action Buttons */}
      {/* 3A. Mobile Action Buttons Stack (vertical full-width outline pills) */}
      <div
        data-layer="Action buttons stack"
        className="ActionButtonsStack self-stretch flex md:hidden flex-col justify-start items-start gap-3 w-full"
      >
        <button
          type="button"
          onClick={handleCoursesClick}
          data-layer="Explore Courses Action"
          className="ExploreCoursesAction self-stretch py-3 bg-transparent rounded-full outline outline-[1.50px] outline-offset-[-1.50px] outline-sky-400 text-sky-400 text-sm font-bold font-['Cairo'] flex justify-center items-center cursor-pointer active:bg-sky-400/10 transition-colors"
        >
          <span data-layer="استكشف الدورات المميزة">استكشف الدورات المميزة</span>
        </button>

        <button
          type="button"
          onClick={handleScholarshipsClick}
          data-layer="Explore Scholarships Action"
          className="ExploreScholarshipsAction self-stretch py-3 bg-transparent rounded-full outline outline-[1.50px] outline-offset-[-1.50px] outline-orange-300 text-orange-300 text-sm font-bold font-['Cairo'] flex justify-center items-center cursor-pointer active:bg-orange-300/10 transition-colors"
        >
          <span data-layer="استكشف المنح والفرص">استكشف المنح والفرص</span>
        </button>
      </div>

      {/* 3B. Desktop Action Buttons Row (horizontal side-by-side pills: filled cyan on right in RTL, gold outline on left in RTL) */}
      <div
        data-layer="Action Buttons Row"
        className="ActionButtonsRow self-stretch hidden md:inline-flex justify-center items-center gap-5"
      >
        {/* Right in RTL: Primary Action (Courses) */}
        <button
          type="button"
          onClick={handleCoursesClick}
          data-layer="Explore Courses"
          className="ExploreCourses w-72 px-8 py-4 bg-sky-400 hover:bg-sky-300 text-slate-900 rounded-full font-bold font-['Tajawal'] text-base transition-colors flex justify-center items-center cursor-pointer shadow-[0_4px_16px_rgba(41,169,255,0.25)] hover:shadow-[0_4px_24px_rgba(41,169,255,0.4)]"
        >
          <span data-layer="استكشفي الدورات المميزة">استكشفي الدورات المميزة</span>
        </button>

        {/* Left in RTL: Secondary Action (Scholarships) */}
        <button
          type="button"
          onClick={handleScholarshipsClick}
          data-layer="Explore Scholarships"
          className="ExploreScholarships w-72 px-8 py-4 bg-transparent rounded-full outline outline-2 outline-offset-[-2px] outline-orange-300 hover:bg-orange-300/10 text-orange-300 font-bold font-['Tajawal'] text-base transition-colors flex justify-center items-center cursor-pointer"
        >
          <span data-layer="استكشفي المنح والفرص">استكشفي المنح والفرص</span>
        </button>
      </div>
    </div>
  );
};
