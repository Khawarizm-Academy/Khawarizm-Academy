import React from 'react';
import type { CatalogFiltersState, CatalogTab } from '../types';

interface CatalogFilterSidebarProps {
  type: CatalogTab;
  filters: CatalogFiltersState;
  onChangeFilter: <K extends keyof CatalogFiltersState>(key: K, value: CatalogFiltersState[K]) => void;
  onReset: () => void;
}

export const CatalogFilterSidebar: React.FC<CatalogFilterSidebarProps> = ({
  type,
  filters,
  onChangeFilter,
  onReset,
}) => {
  const isCoursesOnly = type === 'courses';
  const isScholarshipsOnly = type === 'scholarships';

  return (
    <aside className="w-72 p-5 sm:p-6 bg-[#061A3A]/90 backdrop-blur-md rounded-xl border border-[#1B3F80] flex flex-col gap-5 select-none shadow-xl sticky top-24">
      {/* Sidebar Header */}
      <div className="flex-between pb-3 border-b border-[#1B3F80]/50">
        <div className="flex items-center gap-2 text-white font-bold font-['IBM_Plex_Sans_Arabic'] text-base">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E5B65C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          <span>تصفية النتائج</span>
        </div>

        <button
          type="button"
          onClick={onReset}
          className="text-[#E5B65C] hover:text-[#F3CE7A] text-xs font-medium font-['Tajawal'] cursor-pointer transition-colors"
        >
          إعادة ضبط
        </button>
      </div>

      {/* 1. المجال (Field/Category) - Available across All Modes */}
      <div className="flex flex-col gap-2.5">
        <label className="text-white text-sm font-bold font-['IBM_Plex_Sans_Arabic'] text-right">
          المجال
        </label>
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'all', label: 'الكل' },
            { id: 'ai', label: 'ذكاء اصطناعي' },
            { id: 'programming', label: 'برمجة' },
            { id: 'cybersecurity', label: 'أمن سيبراني' },
            { id: 'space', label: 'فضاء' },
          ].map((item) => {
            const isActive = filters.field === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onChangeFilter('field', item.id)}
                className={`py-1.5 px-3 rounded-lg text-xs font-['Tajawal'] font-medium transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-[#E5B65C]/15 border border-[#E5B65C] text-[#E5B65C] shadow-[0_0_10px_rgba(229,182,92,0.25)]'
                    : 'bg-[#040F24]/80 border border-[#1B3F80]/70 text-[#8299B5] hover:text-white hover:border-[#29A9FF]/50'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. المستوى التعليمي (Level) - Contextual */}
      <div className="flex flex-col gap-2.5">
        <label className="text-white text-sm font-bold font-['IBM_Plex_Sans_Arabic'] text-right">
          {isCoursesOnly ? 'المستوى التدريبي' : 'المستوى التعليمي'}
        </label>
        <div className="flex flex-wrap gap-2">
          {isCoursesOnly ? (
            // Pure Courses Levels
            [
              { id: 'all', label: 'الكل' },
              { id: 'beginner', label: 'مبتدئ' },
              { id: 'intermediate', label: 'متوسط' },
              { id: 'advanced', label: 'متقدم' },
            ].map((item) => {
              const isActive = filters.level === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onChangeFilter('level', item.id)}
                  className={`py-1.5 px-3 rounded-lg text-xs font-['Tajawal'] font-medium transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-[#29A9FF]/15 border border-[#29A9FF] text-[#29A9FF] shadow-[0_0_10px_rgba(41,169,255,0.25)]'
                      : 'bg-[#040F24]/80 border border-[#1B3F80]/70 text-[#8299B5] hover:text-white hover:border-[#29A9FF]/50'
                  }`}
                >
                  {item.label}
                </button>
              );
            })
          ) : (
            // Scholarships / All Levels
            [
              { id: 'all', label: 'الكل' },
              { id: 'bachelor', label: 'بكالوريوس' },
              { id: 'master', label: 'ماجستير' },
              { id: 'phd', label: 'دكتوراه' },
              ...(!isScholarshipsOnly ? [{ id: 'bootcamp', label: 'دورات تدريبية' }] : []),
            ].map((item) => {
              const isActive = filters.level === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onChangeFilter('level', item.id)}
                  className={`py-1.5 px-3 rounded-lg text-xs font-['Tajawal'] font-medium transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-[#E5B65C]/15 border border-[#E5B65C] text-[#E5B65C] shadow-[0_0_10px_rgba(229,182,92,0.25)]'
                      : 'bg-[#040F24]/80 border border-[#1B3F80]/70 text-[#8299B5] hover:text-white hover:border-[#29A9FF]/50'
                  }`}
                >
                  {item.label}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* 3. اللغة (Language) - for Courses & All */}
      {!isScholarshipsOnly && (
        <div className="flex flex-col gap-2.5">
          <label className="text-white text-sm font-bold font-['IBM_Plex_Sans_Arabic'] text-right">
            اللغة
          </label>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'all', label: 'الكل' },
              { id: 'arabic', label: 'العربية' },
              { id: 'english', label: 'الإنجليزية' },
              { id: 'french', label: 'الفرنسية' },
            ].map((item) => {
              const isActive = filters.language === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onChangeFilter('language', item.id)}
                  className={`py-1.5 px-3 rounded-lg text-xs font-['Tajawal'] font-medium transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-[#29A9FF]/15 border border-[#29A9FF] text-[#29A9FF]'
                      : 'bg-[#040F24]/80 border border-[#1B3F80]/70 text-[#8299B5] hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. التكلفة (Cost) - for Courses & All */}
      {!isScholarshipsOnly && (
        <div className="flex flex-col gap-2.5">
          <label className="text-white text-sm font-bold font-['IBM_Plex_Sans_Arabic'] text-right">
            التكلفة
          </label>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'all', label: 'الكل' },
              { id: 'free', label: 'مجانية' },
              { id: 'paid', label: 'مدفوعة' },
            ].map((item) => {
              const isActive = filters.cost === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onChangeFilter('cost', item.id)}
                  className={`py-1.5 px-3 rounded-lg text-xs font-['Tajawal'] font-medium transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-[#29A9FF]/15 border border-[#29A9FF] text-[#29A9FF]'
                      : 'bg-[#040F24]/80 border border-[#1B3F80]/70 text-[#8299B5] hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. البلد المتاح (Country) - for Scholarships & All */}
      {!isCoursesOnly && (
        <div className="flex flex-col gap-2.5">
          <label className="text-white text-sm font-bold font-['IBM_Plex_Sans_Arabic'] text-right">
            البلد المتاح
          </label>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'all', label: 'الكل' },
              { id: 'saudi', label: 'السعودية' },
              { id: 'usa', label: 'أمريكا' },
              { id: 'turkey', label: 'تركيا' },
              { id: 'uk', label: 'بريطانيا' },
            ].map((item) => {
              const isActive = filters.country === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onChangeFilter('country', item.id)}
                  className={`py-1.5 px-3 rounded-lg text-xs font-['Tajawal'] font-medium transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-[#E5B65C]/15 border border-[#E5B65C] text-[#E5B65C]'
                      : 'bg-[#040F24]/80 border border-[#1B3F80]/70 text-[#8299B5] hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. حالة التقديم (Status) - for Scholarships & All */}
      {!isCoursesOnly && (
        <div className="flex flex-col gap-2.5">
          <label className="text-white text-sm font-bold font-['IBM_Plex_Sans_Arabic'] text-right">
            حالة التقديم
          </label>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'all', label: 'الكل' },
              { id: 'open', label: 'مفتوح الآن' },
              { id: 'closing_soon', label: 'ينتهي قريباً' },
              { id: 'closed', label: 'مغلق' },
            ].map((item) => {
              const isActive = filters.status === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onChangeFilter('status', item.id)}
                  className={`py-1.5 px-3 rounded-lg text-xs font-['Tajawal'] font-medium transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-[#E5B65C]/15 border border-[#E5B65C] text-[#E5B65C]'
                      : 'bg-[#040F24]/80 border border-[#1B3F80]/70 text-[#8299B5] hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </aside>
  );
};
