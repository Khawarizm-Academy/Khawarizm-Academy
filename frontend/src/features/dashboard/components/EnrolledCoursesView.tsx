import React, { useMemo, useState, useRef, useEffect } from 'react';
import { ChevronDown, Compass, ArrowLeft, BookOpen, CheckCircle2 } from 'lucide-react';
import { useNavigate } from '../../../app/routerContext';
import { CATALOG_COURSES_ROUTE } from '../../../shared/lib/navigation';
import { useCachedData } from '../../../shared/hooks/useCachedData';
import { DataSectionSkeleton } from '../../../shared/components/Loading/DataSectionSkeleton';
import { SlidingSegmentedControl } from '../../../shared/components/Controls/SlidingSegmentedControl';
import { fetchEnrolledCourses } from '../data/dashboardFetchers';
import type { EnrolledCourse } from '../types';
import { EnrolledCourseCard } from './EnrolledCourseCard';
import dashboardViewsJson from '../../../shared/json/dashboardViews.json';

interface EnrolledCoursesViewProps {
  onResumeCourse: (course: EnrolledCourse) => void;
  onViewCertificate: (course: EnrolledCourse) => void;
  onJoinLive?: (course: EnrolledCourse) => void;
  forceEmptyState?: boolean;
}

type FilterStatus = 'all' | 'in-progress' | 'completed';
type SortOption = 'recent' | 'progress-desc' | 'alphabetical';

const FILTERS = dashboardViewsJson.enrolledFilters as { id: FilterStatus; label: string }[];
const SORT_OPTIONS = dashboardViewsJson.enrolledSortOptions as { id: SortOption; label: string }[];

export const EnrolledCoursesView: React.FC<EnrolledCoursesViewProps> = ({
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

  const courses = useMemo(() => (forceEmptyState ? [] : rawCourses), [forceEmptyState, rawCourses]);

  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      const isCompleted = c.isCompleted || c.progress >= 100;
      if (activeFilter === 'in-progress') return !isCompleted;
      if (activeFilter === 'completed') return isCompleted;
      return true;
    });
  }, [courses, activeFilter]);

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

  const totalCount = courses.length;
  const filterCounts: Record<FilterStatus, number> = {
    all: totalCount,
    'in-progress': courses.filter((c) => c.progress < 100 && !c.isCompleted).length,
    completed: courses.filter((c) => c.progress >= 100 || c.isCompleted).length,
  };
  const activeSortLabel = SORT_OPTIONS.find((o) => o.id === activeSort)?.label;

  return (
    <div
      dir="rtl"
      className="w-full flex flex-col justify-start items-start gap-6 select-none animate-fade-in"
    >
      {/* Title block */}
      <div className="dash-view-heading">
        <h1 className="dash-view-h1">دوراتي المسجّلة</h1>
        <p className="dash-view-sub">
          {totalCount === 0
            ? 'لا توجد دورات مسجّلة حاليًا'
            : `${totalCount} دورات · ${filterCounts['in-progress']} قيد التقدم · ${filterCounts.completed} مكتملة`}
        </p>
      </div>

      {/* List controls: sort and filter pills */}
      {totalCount > 0 && (
        <div className="self-stretch flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
          {/* Right in RTL: filters */}
          <div className="overflow-x-auto no-scrollbar py-0.5">
            <SlidingSegmentedControl
              options={FILTERS.map((filter) => ({
                id: filter.id,
                label: `${filter.label} (${filterCounts[filter.id]})`,
              }))}
              value={activeFilter}
              onChange={setActiveFilter}
              tone="blue"
              aria-label="تصفية الدورات"
            />
          </div>

          {/* Left in RTL: sort selector */}
          <div ref={sortRef} className="relative shrink-0">
            <button
              type="button"
              onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
              className="dash-sort-btn"
            >
              <span className="dash-sort-label">{activeSortLabel}</span>
              <ChevronDown
                size={14}
                className={`transition-transform duration-200 ${
                  isSortDropdownOpen ? 'rotate-180 text-blue-400' : 'text-slate-400'
                }`}
              />
            </button>

            {/* Dropdown menu */}
            {isSortDropdownOpen && (
              <div className="dash-sort-menu animate-fade-in-up">
                {SORT_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => {
                      setActiveSort(option.id);
                      setIsSortDropdownOpen(false);
                    }}
                    className={`dash-sort-option ${
                      activeSort === option.id
                        ? 'dash-sort-option-active'
                        : 'dash-sort-option-idle'
                    }`}
                  >
                    <span>{option.label}</span>
                    {activeSort === option.id && (
                      <CheckCircle2 size={13} className="text-gold-400" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Course list / skeletons / empty state */}
      <div className="dash-section">
        {isLoading ? (
          <DataSectionSkeleton variant="list" count={3} />
        ) : totalCount === 0 ? (
          /* Empty state: brand new account / zero enrollments */
          <div className="dash-empty">
            <div className="dash-empty-icon">
              <Compass size={44} className="text-blue-400 animate-pulse" />
            </div>

            <div className="max-w-md flex flex-col items-center gap-2">
              <h3 className="dash-empty-title">لم تسجّل في أي دورة تدريبية بعد</h3>
              <p className="dash-empty-text">
                ابدأ رحلتك التعليمية الآن واستكشف برامجنا المعتمدة في الذكاء الاصطناعي، علم
                البيانات، وتطوير البرمجيات بإشراف نخبة من الأكاديميين.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate(CATALOG_COURSES_ROUTE)}
              className="btn-gold text-sm md:text-base"
            >
              <BookOpen size={18} />
              <span>استكشف دليل الدورات الآن</span>
              <ArrowLeft size={16} />
            </button>
          </div>
        ) : filteredCourses.length === 0 ? (
          /* Empty state: filter returned no results */
          <div className="dash-empty-sm">
            <div className="dash-empty-sm-icon">
              <BookOpen size={24} className="text-slate-400" />
            </div>
            <div className="flex flex-col items-center gap-1">
              <h4 className="dash-empty-sm-title">لا توجد دورات في هذا القسم</h4>
              <p className="dash-empty-sm-text">
                {activeFilter === 'completed'
                  ? 'لم تكمل أي دورة بعد. واصل التعلّم في دوراتك الحالية لتحصل على شهادتك المعتمدة!'
                  : 'لا توجد دورات قيد التقدم حاليًا.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className="btn-outline-blue text-xs mt-1"
            >
              عرض جميع الدورات
            </button>
          </div>
        ) : (
          /* Enrolled courses cards list */
          <div className="dash-section">
            {sortedCourses.map((course, idx) => (
              <EnrolledCourseCard
                key={course.id}
                index={idx}
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
