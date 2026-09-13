import React from 'react';
import type { CatalogFiltersState, CatalogTab } from '../types';

interface CatalogMobileFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  type: CatalogTab;
  filters: CatalogFiltersState;
  onChangeFilter: <K extends keyof CatalogFiltersState>(key: K, value: CatalogFiltersState[K]) => void;
  onReset: () => void;
}

export const CatalogMobileFilterDrawer: React.FC<CatalogMobileFilterDrawerProps> = ({
  isOpen,
  onClose,
  type,
  filters,
  onChangeFilter,
  onReset,
}) => {
  if (!isOpen) return null;

  const isCoursesOnly = type === 'courses';
  const isScholarshipsOnly = type === 'scholarships';

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center">
      {/* Dark Overlay Scrim */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-[#040F24]/80 backdrop-blur-sm transition-opacity animate-fade-in-up"
      />

      {/* Sliding Bottom Sheet */}
      <div className="relative z-10 w-full max-w-lg max-h-[85vh] overflow-y-auto bg-[#061A3A] border-t-2 border-[#1B3F80] rounded-t-2xl p-6 flex flex-col gap-6 shadow-2xl animate-fade-in-up">
        {/* Handle Bar */}
        <div className="w-12 h-1.5 bg-[#1B3F80] rounded-full mx-auto -mt-2" />

        {/* Drawer Header */}
        <div className="flex-between pb-3 border-b border-[#1B3F80]/50">
          <div className="flex items-center gap-2 text-white font-bold font-['IBM_Plex_Sans_Arabic'] text-lg">
            <span>تصفية النتائج</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onReset}
              className="text-[#E5B65C] hover:underline text-xs font-medium font-['Tajawal']"
            >
              إعادة ضبط
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn-icon-box w-8 h-8 text-slate-400"
            >
              ✕
            </button>
          </div>
        </div>

        {/* 1. Field */}
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
                  className={`py-1.5 px-3 rounded-lg text-xs font-['Tajawal'] font-medium transition-all ${
                    isActive
                      ? 'bg-[#E5B65C]/20 border border-[#E5B65C] text-[#E5B65C]'
                      : 'bg-[#040F24]/80 border border-[#1B3F80]/70 text-[#8299B5]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Level */}
        <div className="flex flex-col gap-2.5">
          <label className="text-white text-sm font-bold font-['IBM_Plex_Sans_Arabic'] text-right">
            {isCoursesOnly ? 'المستوى التدريبي' : 'المستوى التعليمي'}
          </label>
          <div className="flex flex-wrap gap-2">
            {(isCoursesOnly
              ? [
                  { id: 'all', label: 'الكل' },
                  { id: 'beginner', label: 'مبتدئ' },
                  { id: 'intermediate', label: 'متوسط' },
                  { id: 'advanced', label: 'متقدم' },
                ]
              : [
                  { id: 'all', label: 'الكل' },
                  { id: 'bachelor', label: 'بكالوريوس' },
                  { id: 'master', label: 'ماجستير' },
                  { id: 'phd', label: 'دكتوراه' },
                ]
            ).map((item) => {
              const isActive = filters.level === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onChangeFilter('level', item.id)}
                  className={`py-1.5 px-3 rounded-lg text-xs font-['Tajawal'] font-medium transition-all ${
                    isActive
                      ? 'bg-[#29A9FF]/20 border border-[#29A9FF] text-[#29A9FF]'
                      : 'bg-[#040F24]/80 border border-[#1B3F80]/70 text-[#8299B5]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Cost */}
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
                    className={`py-1.5 px-3 rounded-lg text-xs font-['Tajawal'] font-medium transition-all ${
                      isActive
                        ? 'bg-[#29A9FF]/20 border border-[#29A9FF] text-[#29A9FF]'
                        : 'bg-[#040F24]/80 border border-[#1B3F80]/70 text-[#8299B5]'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. Country */}
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
                    className={`py-1.5 px-3 rounded-lg text-xs font-['Tajawal'] font-medium transition-all ${
                      isActive
                        ? 'bg-[#E5B65C]/20 border border-[#E5B65C] text-[#E5B65C]'
                        : 'bg-[#040F24]/80 border border-[#1B3F80]/70 text-[#8299B5]'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Apply Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full btn-gold py-3 text-sm font-bold"
          >
            تطبيق النتائج
          </button>
        </div>
      </div>
    </div>
  );
};
