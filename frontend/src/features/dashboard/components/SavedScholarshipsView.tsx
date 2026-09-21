import React, { useState } from 'react';
import { X, Undo2 } from 'lucide-react';

export interface SavedScholarshipItem {
  id: string;
  title: string;
  provider: string;
  deadlineText: string;
  isUrgent: boolean;
  coverage: string;
  gpaRequirement: string;
}

interface FavoriteCourseItem {
  id: string;
  title: string;
  provider: string;
  durationText: string;
}

const initialScholarships: SavedScholarshipItem[] = [
  {
    id: 'sch-kaust-01',
    title: 'منحة التميز لعلوم الحاسب والابتكار التقني',
    provider: 'جامعة الملك عبدالله للعلوم والتقنية',
    deadlineText: 'باقي 18 ساعة',
    isUrgent: true,
    coverage: 'تغطية كاملة 100% شاملة الرسوم الدراسية والسكن وبدل شهري',
    gpaRequirement: '4.5 فما فوق (مكتمل لديك: 4.9)',
  },
  {
    id: 'sch-tuwaiq-02',
    title: 'برنامج الابتعاث الثقافي والدولي',
    provider: 'وزارة الثقافة',
    deadlineText: 'باقي 5 أيام',
    isUrgent: false,
    coverage: 'ابتعاث دولي متكامل لمرحلتي البكالوريوس والماجستير',
    gpaRequirement: '4.0 فما فوق (مكتمل لديك: 4.9)',
  },
  {
    id: 'sch-sdaia-03',
    title: 'منحة رواد الغد للتكنولوجيا',
    provider: 'مؤسسة طويق',
    deadlineText: 'باقي 12 يوم',
    isUrgent: false,
    coverage: 'معسكرات تدريبية متقدمة وتوظيف مباشر للمتميزين',
    gpaRequirement: '3.75 فما فوق (مكتمل لديك: 4.9)',
  },
  {
    id: 'sch-oxford-04',
    title: 'برنامج زمالة الذكاء الاصطناعي المتقدم',
    provider: 'المركز الوطني للذكاء الاصطناعي',
    deadlineText: 'باقي 24 يوم',
    isUrgent: false,
    coverage: 'أبحاث مشتركة مع مختبرات الذكاء الاصطناعي الدولية',
    gpaRequirement: '4.2 فما فوق (مكتمل لديك: 4.9)',
  },
];

const initialFavoriteCourses: FavoriteCourseItem[] = [
  {
    id: 'course-fav-1',
    title: 'الأمن السيبراني والدفاع الرقمي الاستباقي',
    provider: 'مسار الأمن المتقدم • 10 أسابيع',
    durationText: 'معتمدة دولياً',
  },
  {
    id: 'course-fav-2',
    title: 'الحوسبة الكمية ومستقبل الخوارزميات',
    provider: 'مسار الفيزياء التقنية • 6 أسابيع',
    durationText: 'مستوى متقدم',
  },
];

interface SavedScholarshipsViewProps {
  onSelectScholarship?: (scholarship: SavedScholarshipItem) => void;
  onSelectCourse?: (courseId: string) => void;
}

export const SavedScholarshipsView: React.FC<SavedScholarshipsViewProps> = ({
  onSelectScholarship,
  onSelectCourse,
}) => {
  const [activeTab, setActiveTab] = useState<'scholarships' | 'courses'>('scholarships');
  const [scholarships, setScholarships] = useState<SavedScholarshipItem[]>(initialScholarships);
  const [favoriteCourses, setFavoriteCourses] = useState<FavoriteCourseItem[]>(initialFavoriteCourses);
  const [deletedItem, setDeletedItem] = useState<{ item: SavedScholarshipItem; index: number } | null>(null);

  const handleDeleteScholarship = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const idx = scholarships.findIndex((s) => s.id === id);
    if (idx !== -1) {
      const removed = scholarships[idx];
      setDeletedItem({ item: removed, index: idx });
      setScholarships((prev) => prev.filter((s) => s.id !== id));
    }
  };

  const handleUndoDelete = () => {
    if (deletedItem) {
      setScholarships((prev) => {
        const next = [...prev];
        next.splice(deletedItem.index, 0, deletedItem.item);
        return next;
      });
      setDeletedItem(null);
    }
  };

  const handleDeleteFavoriteCourse = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavoriteCourses((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <div dir="rtl" className="w-full flex flex-col gap-6 select-none">
      {/* Undo Toast */}
      {deletedItem && (
        <div className="w-full bg-slate-900/95 border border-[#E5B65C]/60 text-slate-200 px-4 py-3 rounded-xl flex justify-between items-center shadow-lg animate-fade-in">
          <span className="text-sm font-['Tajawal']">
            تمت إزالة &quot;{deletedItem.item.title}&quot; من محفوظاتك
          </span>
          <button
            type="button"
            onClick={handleUndoDelete}
            className="flex items-center gap-1.5 px-3 py-1 bg-[#E5B65C]/20 hover:bg-[#E5B65C]/30 text-[#E5B65C] rounded-lg text-xs font-bold transition-all cursor-pointer"
          >
            <Undo2 size={14} />
            <span>تراجع</span>
          </button>
        </div>
      )}

      {/* Header & Filter matching Figma Desktop & Mobile */}
      <div
        data-layer="Header-Filter"
        className="HeaderFilter self-stretch flex justify-between items-center flex-wrap gap-4"
      >
        {/* Title on Right in RTL */}
        <h2
          data-layer="إدارة المحفوظات"
          className="text-slate-200 text-lg md:text-xl font-bold font-['Cairo'] leading-6"
        >
          <span className="hidden md:inline">إدارة المحفوظات</span>
          <span className="md:hidden inline">منحي المحفوظة</span>
        </h2>

        {/* Toggle-Filter on Left in RTL */}
        <div
          data-layer="Toggle-Filter"
          className="ToggleFilter p-1 bg-slate-900 rounded-full outline outline-1 outline-offset-[-1px] outline-blue-900 flex items-center"
        >
          <button
            type="button"
            onClick={() => setActiveTab('scholarships')}
            className={`px-5 md:px-6 py-2 rounded-full text-xs md:text-sm transition-all cursor-pointer ${
              activeTab === 'scholarships'
                ? 'bg-orange-300/10 text-orange-300 font-bold'
                : 'text-slate-400 hover:text-slate-200 font-medium'
            }`}
          >
            المنح المحفوظة
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('courses')}
            className={`px-5 md:px-6 py-2 rounded-full text-xs md:text-sm transition-all cursor-pointer ${
              activeTab === 'courses'
                ? 'bg-orange-300/10 text-orange-300 font-bold'
                : 'text-slate-400 hover:text-slate-200 font-medium'
            }`}
          >
            الدورات المفضلة
          </button>
        </div>
      </div>

      {/* List of Saved Scholarships */}
      {activeTab === 'scholarships' && (
        <div data-layer="Scholarships-List" className="flex flex-col gap-3">
          {scholarships.length === 0 ? (
            <div className="p-10 text-center bg-slate-900/50 rounded-2xl border border-blue-900/50 text-slate-400 text-sm">
              لا توجد منح دراسية محفوظة حالياً في لوحتك.
            </div>
          ) : (
            scholarships.map((item) => (
              <div
                key={item.id}
                data-layer="Scholarship-Row"
                onClick={() => onSelectScholarship?.(item)}
                className="ScholarshipRow self-stretch p-3.5 md:p-4 bg-blue-950 rounded-2xl shadow-[0px_8px_24px_0px_rgba(41,169,255,0.07)] outline outline-1 outline-offset-[-1px] outline-blue-900 flex justify-between items-center gap-3 md:gap-4 hover:border-sky-400/40 transition-all cursor-pointer group"
              >
                {/* Right side in RTL: Title and Provider */}
                <div data-layer="Text-Metadata" className="flex-1 flex flex-col justify-start items-start gap-1 text-right min-w-0">
                  <h3
                    data-layer={item.title}
                    className="text-slate-200 text-sm md:text-base font-bold font-['Tajawal'] leading-6 truncate w-full group-hover:text-sky-300 transition-colors"
                  >
                    {item.title}
                  </h3>
                  <span
                    data-layer={item.provider}
                    className="text-slate-400 text-xs font-normal font-['Tajawal'] leading-4"
                  >
                    {item.provider}
                  </span>
                </div>

                {/* Left side in RTL: Deadline Badge + Circular Gold Delete Button */}
                <div data-layer="Left-Controls" className="flex items-center gap-2.5 md:gap-3 shrink-0">
                  {/* Deadline-Tag */}
                  <div
                    data-layer="Deadline-Tag"
                    className={`px-3 py-1.5 rounded-lg border flex items-center justify-center ${
                      item.isUrgent
                        ? 'bg-red-500/10 border-red-500/80 text-red-400'
                        : 'bg-[#E5B65C]/10 border-[#E5B65C]/80 text-[#E5B65C]'
                    }`}
                  >
                    <span className="text-xs font-bold font-['Tajawal'] leading-4 whitespace-nowrap">
                      {item.deadlineText}
                    </span>
                  </div>

                  {/* Circular Golden Delete Button matching media_1789837891295.png */}
                  <button
                    type="button"
                    onClick={(e) => handleDeleteScholarship(item.id, e)}
                    data-layer="Delete-Btn"
                    title="إزالة من المحفوظات"
                    className="size-8 rounded-full bg-slate-900 hover:bg-slate-800 border border-[#E5B65C]/70 hover:border-[#E5B65C] flex items-center justify-center text-[#E5B65C] cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-sm"
                  >
                    <X size={15} strokeWidth={2.4} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* List of Favorite Courses */}
      {activeTab === 'courses' && (
        <div data-layer="Courses-List" className="flex flex-col gap-3">
          {favoriteCourses.length === 0 ? (
            <div className="p-10 text-center bg-slate-900/50 rounded-2xl border border-blue-900/50 text-slate-400 text-sm">
              لا توجد دورات مفضلة محفوظة حالياً في لوحتك.
            </div>
          ) : (
            favoriteCourses.map((item) => (
              <div
                key={item.id}
                data-layer="Course-Row"
                onClick={() => onSelectCourse?.(item.id)}
                className="self-stretch p-3.5 md:p-4 bg-blue-950 rounded-2xl shadow-[0px_8px_24px_0px_rgba(41,169,255,0.07)] outline outline-1 outline-offset-[-1px] outline-blue-900 flex justify-between items-center gap-4 hover:border-sky-400/40 transition-all cursor-pointer group"
              >
                {/* Right: Info */}
                <div className="flex-1 flex flex-col justify-start items-start gap-1 text-right min-w-0">
                  <h3 className="text-slate-200 text-sm md:text-base font-bold font-['Tajawal'] leading-6 truncate w-full group-hover:text-sky-300 transition-colors">
                    {item.title}
                  </h3>
                  <span className="text-slate-400 text-xs font-normal font-['Tajawal'] leading-4">
                    {item.provider}
                  </span>
                </div>

                {/* Left: Tag + Delete */}
                <div className="flex items-center gap-2.5 md:gap-3 shrink-0">
                  <div className="px-3 py-1.5 rounded-lg border border-sky-400/80 bg-sky-400/10 text-sky-400 flex items-center justify-center">
                    <span className="text-xs font-bold font-['Tajawal'] leading-4 whitespace-nowrap">
                      {item.durationText}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handleDeleteFavoriteCourse(item.id, e)}
                    title="إزالة من المفضلة"
                    className="size-8 rounded-full bg-slate-900 hover:bg-slate-800 border border-[#E5B65C]/70 hover:border-[#E5B65C] flex items-center justify-center text-[#E5B65C] cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-sm"
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
