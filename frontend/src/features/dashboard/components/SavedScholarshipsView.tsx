import React, { useState } from 'react';
import { X, Undo2 } from 'lucide-react';
import { useCachedData } from '../../../shared/hooks/useCachedData';
import { DataSectionSkeleton } from '../../../shared/components/Loading/DataSectionSkeleton';
import { fetchSavedScholarships, fetchFavoriteCourses } from '../data/dashboardFetchers';
import type { SavedScholarshipItem, FavoriteCourseItem } from '../types';
import dashboardViewsJson from '../../../shared/json/dashboardViews.json';
export type { SavedScholarshipItem };

interface SavedScholarshipsViewProps {
  onSelectScholarship?: (scholarship: SavedScholarshipItem) => void;
  onSelectCourse?: (courseId: string) => void;
}

type SavedTab = 'scholarships' | 'courses';

const SAVED_TABS = dashboardViewsJson.savedTabs as { id: SavedTab; label: string }[];

/** Tag tone by deadline urgency, or duration for favorite courses. */
const DEADLINE_TONE = {
  urgent: 'bg-red-500/10 border-red-500/80 text-red-400',
  normal: 'bg-gold-400/10 border-gold-400/80 text-gold-400',
  duration: 'border-blue-400/80 bg-blue-400/10 text-blue-400',
} as const;

export const SavedScholarshipsView: React.FC<SavedScholarshipsViewProps> = ({
  onSelectScholarship,
  onSelectCourse,
}) => {
  const [activeTab, setActiveTab] = useState<SavedTab>('scholarships');

  const { data: scholarshipsData, isLoading: isLoadingScholarships } = useCachedData<
    SavedScholarshipItem[]
  >(['dashboard', 'saved-scholarships'], fetchSavedScholarships, { initialData: [] });

  const { data: favoriteCoursesData, isLoading: isLoadingCourses } = useCachedData<
    FavoriteCourseItem[]
  >(['dashboard', 'favorite-courses'], fetchFavoriteCourses, { initialData: [] });

  // Local overrides so remove/undo persist for the session
  const [localScholarships, setLocalScholarships] = useState<SavedScholarshipItem[] | null>(null);
  const [localCourses, setLocalCourses] = useState<FavoriteCourseItem[] | null>(null);
  const [deletedItem, setDeletedItem] = useState<{ item: SavedScholarshipItem; index: number } | null>(null);

  const scholarships = localScholarships ?? scholarshipsData;
  const favoriteCourses = localCourses ?? favoriteCoursesData;
  const isLoading = activeTab === 'scholarships' ? isLoadingScholarships : isLoadingCourses;

  const handleDeleteScholarship = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const idx = scholarships.findIndex((s) => s.id === id);
    if (idx !== -1) {
      setDeletedItem({ item: scholarships[idx], index: idx });
      setLocalScholarships(scholarships.filter((s) => s.id !== id));
    }
  };

  const handleUndoDelete = () => {
    if (deletedItem) {
      const next = [...scholarships];
      next.splice(deletedItem.index, 0, deletedItem.item);
      setLocalScholarships(next);
      setDeletedItem(null);
    }
  };

  const handleDeleteFavoriteCourse = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLocalCourses(favoriteCourses.filter((c) => c.id !== id));
  };

  return (
    <div dir="rtl" className="w-full flex flex-col gap-6 select-none">
      {/* Undo toast */}
      {deletedItem && (
        <div className="dash-toast">
          <span className="text-sm font-body">
            تمت إزالة &quot;{deletedItem.item.title}&quot; من محفوظاتك
          </span>
          <button
            type="button"
            onClick={handleUndoDelete}
            className="flex items-center gap-1.5 px-3 py-1 bg-gold-400/20 hover:bg-gold-400/30 text-gold-400 rounded-lg text-xs font-bold transition-all cursor-pointer"
          >
            <Undo2 size={14} />
            <span>تراجع</span>
          </button>
        </div>
      )}

      {/* Header & filter matching Figma desktop & mobile */}
      <div className="dash-view-head">
        <div className="section-accent-title-gold">
          <h2 className="dash-view-title">
            <span className="hidden md:inline">إدارة المحفوظات</span>
            <span className="md:hidden inline">منحي المحفوظة</span>
          </h2>
        </div>

        {/* Toggle filter on left in RTL */}
        <div className="dash-toggle">
          {SAVED_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`dash-toggle-btn ${
                activeTab === tab.id ? 'dash-toggle-active' : 'dash-toggle-idle'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* List of saved scholarships */}
      {activeTab === 'scholarships' && (
        <div className="flex flex-col gap-3">
          {isLoading ? (
            <DataSectionSkeleton variant="list" count={4} />
          ) : scholarships.length === 0 ? (
            <div className="dash-list-empty">لا توجد منح دراسية محفوظة حالياً في لوحتك.</div>
          ) : (
            scholarships.map((item) => (
              <div
                key={item.id}
                onClick={() => onSelectScholarship?.(item)}
                className="dash-row md:gap-4 cursor-pointer group"
              >
                {/* Right side in RTL: title and provider */}
                <div className="dash-row-info">
                  <h3 className="dash-row-title group-hover:text-sky-300 transition-colors">
                    {item.title}
                  </h3>
                  <span className="dash-meta">{item.provider}</span>
                </div>

                {/* Left side in RTL: deadline tag + circular gold delete button */}
                <div className="dash-row-side md:gap-3">
                  <div className={`dash-tag ${item.isUrgent ? DEADLINE_TONE.urgent : DEADLINE_TONE.normal}`}>
                    <span className="dash-tag-label">{item.deadlineText}</span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handleDeleteScholarship(item.id, e)}
                    title="إزالة من المحفوظات"
                    className="dash-remove"
                  >
                    <X size={15} strokeWidth={2.4} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* List of favorite courses */}
      {activeTab === 'courses' && (
        <div className="flex flex-col gap-3">
          {isLoading ? (
            <DataSectionSkeleton variant="list" count={3} />
          ) : favoriteCourses.length === 0 ? (
            <div className="dash-list-empty">لا توجد دورات مفضلة محفوظة حالياً في لوحتك.</div>
          ) : (
            favoriteCourses.map((item) => (
              <div
                key={item.id}
                onClick={() => onSelectCourse?.(item.id)}
                className="dash-row gap-4 cursor-pointer group"
              >
                {/* Right in RTL: info */}
                <div className="dash-row-info">
                  <h3 className="dash-row-title group-hover:text-sky-300 transition-colors">
                    {item.title}
                  </h3>
                  <span className="dash-meta">{item.provider}</span>
                </div>

                {/* Left in RTL: tag + delete */}
                <div className="dash-row-side md:gap-3">
                  <div className={`dash-tag ${DEADLINE_TONE.duration}`}>
                    <span className="dash-tag-label">{item.durationText}</span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handleDeleteFavoriteCourse(item.id, e)}
                    title="إزالة من المفضلة"
                    className="dash-remove"
                  >
                    <X size={15} strokeWidth={2.4} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
