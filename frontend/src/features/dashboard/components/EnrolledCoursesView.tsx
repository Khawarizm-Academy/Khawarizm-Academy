import React, { useMemo, useState, useRef, useEffect } from 'react';
import { ChevronDown, Compass, ArrowLeft, BookOpen, CheckCircle2 } from 'lucide-react';
import { useNavigate } from '../../../app/routerContext';
import { CATALOG_COURSES_ROUTE } from '../../../shared/lib/navigation';
import { useCachedData } from '../../../shared/hooks/useCachedData';
import { DataSectionSkeleton } from '../../../shared/components/Loading/DataSectionSkeleton';
import { fetchEnrolledCourses } from '../data/dashboardFetchers';
import type { EnrolledCourse } from '../types';
import { DashboardSubNavigation } from './DashboardSubNavigation';
import { EnrolledCourseCard } from './EnrolledCourseCard';

interface EnrolledCoursesViewProps {
  onSelectView: (viewId: string) => void;
  onResumeCourse: (course: EnrolledCourse) => void;
  onViewCertificate: (course: EnrolledCourse) => void;
  onJoinLive?: (course: EnrolledCourse) => void;
  forceEmptyState?: boolean;
}

type FilterStatus = 'all' | 'in-progress' | 'completed';
type SortOption = 'recent' | 'progress-desc' | 'alphabetical';

export const EnrolledCoursesView: React.FC<EnrolledCoursesViewProps> = ({
  onSelectView,
  onResumeCourse,
  onViewCertificate,
  onJoinLive,
  forceEmptyState = false,
}) => {
  const navigate = useNavigate();

  // State for filter and sort
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('all');
  const [activeSort, setActiveSort] = useState<SortOption>('recent');
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setIsSortDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch courses via cache manager SWR
  const { data: rawCourses, isLoading } = useCachedData<EnrolledCourse[]>(
    ['dashboard', 'courses-list'],
    fetchEnrolledCourses,
    { initialData: [] }
  );

  const courses = useMemo(() => {
    return forceEmptyState ? [] : rawCourses;
  }, [forceEmptyState, rawCourses]);

  // Filter courses
  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      const isCompleted = c.isCompleted || c.progress >= 100;
      if (activeFilter === 'in-progress') return !isCompleted;
      if (activeFilter === 'completed') return isCompleted;
      return true;
    });
  }, [courses, activeFilter]);

  // Sort courses
  const sortedCourses = useMemo(() => {
    const result = [...filteredCourses];
    if (activeSort === 'progress-desc') {
      result.sort((a, b) => b.progress - a.progress);
    } else if (activeSort === 'alphabetical') {
      result.sort((a, b) => a.title.localeCompare(b.title, 'ar'));
    }
    // 'recent' preserves original array order
    return result;
  }, [filteredCourses, activeSort]);

  // Counters
  const totalCount = courses.length;
  const inProgressCount = courses.filter((c) => (c.progress < 100 && !c.isCompleted)).length;
  const completedCount = courses.filter((c) => (c.progress >= 100 || c.isCompleted)).length;

  const sortLabels: Record<SortOption, string> = {
    recent: 'الأحدث نشاطًا',
    'progress-desc': 'الأعلى إنجازًا',
    alphabetical: 'أبجديًا',
  };

  return (
    <div dir="rtl" className="w-full flex flex-col justify-start items-start gap-6 select-none animate-fade-in">
      {/* 1. Dashboard Sub-Navigation Capsule */}
      <DashboardSubNavigation
        activeView="enrolled"
        onSelectView={onSelectView}
      />

      {/* 2. Title Block */}
      <div className="self-stretch flex flex-col justify-start items-start text-right gap-1.5">
        <h1 className="text-white text-2xl md:text-3xl font-bold font-['IBM_Plex_Sans_Arabic'] leading-8">
          دوراتي المسجّلة
        </h1>
        <p className="text-slate-400 text-sm font-normal font-['Tajawal'] leading-5">
          {totalCount === 0
            ? 'لا توجد دورات مسجّلة حاليًا'
            : `${totalCount} دورات · ${inProgressCount} قيد التقدم · ${completedCount} مكتملة`}
        </p>
      </div>

      {/* 3. List Controls: Sort and Filter Pills */}
      {totalCount > 0 && (
        <div className="self-stretch flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
          {/* Right in RTL: Filters */}
          <div className="inline-flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className={`px-4 py-2 rounded-full text-xs font-['Tajawal'] transition-all cursor-pointer whitespace-nowrap ${
                activeFilter === 'all'
                  ? 'bg-blue-950 outline outline-1 outline-offset-[-1px] outline-sky-400 text-white font-bold shadow-[0_0_10px_rgba(41,169,255,0.25)]'
                  : 'bg-slate-900 outline outline-1 outline-offset-[-1px] outline-blue-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              الكل ({totalCount})
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('in-progress')}
              className={`px-4 py-2 rounded-full text-xs font-['Tajawal'] transition-all cursor-pointer whitespace-nowrap ${
                activeFilter === 'in-progress'
                  ? 'bg-blue-950 outline outline-1 outline-offset-[-1px] outline-sky-400 text-white font-bold shadow-[0_0_10px_rgba(41,169,255,0.25)]'
                  : 'bg-slate-900 outline outline-1 outline-offset-[-1px] outline-blue-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              قيد التقدم ({inProgressCount})
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('completed')}
              className={`px-4 py-2 rounded-full text-xs font-['Tajawal'] transition-all cursor-pointer whitespace-nowrap ${
                activeFilter === 'completed'
                  ? 'bg-blue-950 outline outline-1 outline-offset-[-1px] outline-sky-400 text-white font-bold shadow-[0_0_10px_rgba(41,169,255,0.25)]'
                  : 'bg-slate-900 outline outline-1 outline-offset-[-1px] outline-blue-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              مكتملة ({completedCount})
            </button>
          </div>

          {/* Left in RTL: Sort Selector */}
          <div ref={sortRef} className="relative shrink-0">
            <button
              type="button"
              onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
              className="w-full sm:w-52 px-3.5 py-2.5 bg-slate-900 rounded-xl outline outline-1 outline-offset-[-1px] outline-blue-900 flex justify-between items-center gap-3 cursor-pointer hover:outline-sky-400/60 transition-all text-right"
            >
              <span className="text-slate-200 text-xs font-normal font-['Tajawal']">
                {sortLabels[activeSort]}
              </span>
              <ChevronDown
                size={14}
                className={`text-[#8299B5] transition-transform duration-200 ${
                  isSortDropdownOpen ? 'rotate-180 text-sky-400' : ''
                }`}
              />
            </button>

            {/* Dropdown Menu */}
            {isSortDropdownOpen && (
              <div className="absolute left-0 sm:right-auto sm:left-0 top-full mt-1.5 w-full sm:w-52 bg-slate-900 border border-blue-900/90 rounded-xl shadow-2xl py-1.5 z-30 animate-fade-in-up">
                {(['recent', 'progress-desc', 'alphabetical'] as SortOption[]).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      setActiveSort(option);
                      setIsSortDropdownOpen(false);
                    }}
                    className={`w-full px-3.5 py-2 text-right text-xs font-['Tajawal'] flex items-center justify-between transition-colors ${
                      activeSort === option
                        ? 'bg-blue-950/80 text-sky-300 font-bold'
                        : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                    }`}
                  >
                    <span>{sortLabels[option]}</span>
                    {activeSort === option && <CheckCircle2 size={13} className="text-sky-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. Course List / Skeletons / Empty State */}
      <div className="self-stretch flex flex-col justify-start items-start gap-4 w-full">
        {isLoading ? (
          <DataSectionSkeleton variant="list" count={3} />
        ) : totalCount === 0 ? (
          /* Empty State: Brand New Account / Zero Enrollments */
          <div className="w-full py-8 md:py-16 px-6 bg-slate-900/90 rounded-3xl border border-blue-900/80 flex flex-col items-center justify-center text-center gap-6 shadow-[0px_16px_32px_rgba(41,169,255,0.06)]">
            <div className="size-24 md:size-32 bg-blue-950 rounded-full border-2 border-sky-400 flex items-center justify-center relative shadow-[0_0_24px_rgba(41,169,255,0.2)]">
              <Compass size={44} className="text-sky-400 animate-pulse" />
            </div>

            <div className="max-w-md flex flex-col items-center gap-2">
              <h3 className="text-xl md:text-2xl font-bold text-white font-['IBM_Plex_Sans_Arabic']">
                لم تسجّل في أي دورة تدريبية بعد
              </h3>
              <p className="text-slate-400 text-sm font-normal font-['Tajawal'] leading-6">
                ابدأ رحلتك التعليمية الآن واستكشف برامجنا المعتمدة في الذكاء الاصطناعي، علم البيانات، وتطوير البرمجيات بإشراف نخبة من الأكاديميين.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate(CATALOG_COURSES_ROUTE)}
              className="btn-gold py-3 px-8 text-sm md:text-base flex items-center gap-2.5 font-bold cursor-pointer transition-transform active:scale-95 shadow-[0_4px_20px_rgba(229,182,92,0.3)]"
            >
              <BookOpen size={18} />
              <span>استكشف دليل الدورات الآن</span>
              <ArrowLeft size={16} />
            </button>
          </div>
        ) : filteredCourses.length === 0 ? (
          /* Empty State: Filter Returned No Results */
          <div className="w-full py-12 px-6 bg-slate-900/60 rounded-2xl border border-blue-900/60 flex flex-col items-center justify-center text-center gap-4">
            <div className="size-16 rounded-full bg-blue-950 border border-blue-900 flex items-center justify-center">
              <BookOpen size={24} className="text-slate-400" />
            </div>
            <div className="flex flex-col items-center gap-1">
              <h4 className="text-lg font-bold text-slate-200 font-['IBM_Plex_Sans_Arabic']">
                لا توجد دورات في هذا القسم
              </h4>
              <p className="text-slate-400 text-xs md:text-sm font-['Tajawal']">
                {activeFilter === 'completed'
                  ? 'لم تكمل أي دورة بعد. واصل التعلّم في دوراتك الحالية لتحصل على شهادتك المعتمدة!'
                  : 'لا توجد دورات قيد التقدم حاليًا.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className="btn-outline-blue py-2 px-5 text-xs font-bold cursor-pointer mt-1"
            >
              عرض جميع الدورات
            </button>
          </div>
        ) : (
          /* Enrolled Courses Cards List */
          <div className="self-stretch flex flex-col justify-start items-start gap-4 w-full">
            {sortedCourses.map((course) => (
              <EnrolledCourseCard
                key={course.id}
                course={course}
                onResume={onResumeCourse}
                onViewCertificate={onViewCertificate}
                onJoinLive={onJoinLive}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
